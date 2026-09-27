#!/usr/bin/env python3
import json
import csv
import os
import math
import random
import re
import urllib.request
import urllib.parse
from collections import defaultdict

CACHE_DIR = ".cache_dataset"
os.makedirs(CACHE_DIR, exist_ok=True)

FARUK_CSV_URL = "https://huggingface.co/datasets/faruk/bengali-names-vs-gender/raw/main/bengali-names.csv"

def query_wikidata(gender_id, lang, limit=3500):
    cache_file = os.path.join(CACHE_DIR, f"wikidata_{gender_id}_{lang}.json")
    if os.path.exists(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    query = f"""
    SELECT ?name WHERE {{
      ?item wdt:P31 wd:Q5;
            wdt:P27 wd:Q902;
            wdt:P21 wd:{gender_id}.
      ?item rdfs:label ?name.
      FILTER(LANG(?name) = '{lang}')
    }}
    LIMIT {limit}
    """
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': query, 'format': 'json'})
    req = urllib.request.Request(url, headers={'User-Agent': 'BonshoModelTrainer/1.0 (contact@bonsho.org)'})
    print(f"Fetching Wikidata {gender_id} ({lang})...")
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
        names = [b['name']['value'] for b in data['results']['bindings']]
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(names, f, ensure_ascii=False)
        return names

def load_faruk():
    dest = os.path.join(CACHE_DIR, "bengali-names.csv")
    if not os.path.exists(dest):
        print("Downloading Faruk Bengali names dataset...")
        req = urllib.request.Request(FARUK_CSV_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp, open(dest, 'wb') as out:
            out.write(resp.read())

    samples = []
    with open(dest, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if len(row) >= 2:
                n = row[0].strip()
                g = row[1].strip()
                if n and g in ('0', '1'):
                    samples.append((n, 'male' if g == '0' else 'female'))
    return samples

def clean_name(raw):
    # Remove parenthetical qualifications, e.g. "শামীম আরা (ক্রিকেটার)" -> "শামীম আরা"
    s = re.sub(r'\(.*?\)', '', raw)
    s = re.sub(r'\[.*?\]', '', s)
    s = s.strip()
    return s

def extract_features(name):
    feats = set()
    cleaned = clean_name(name)
    tokens = [t.strip().lower() for t in cleaned.split() if t.strip()]

    # Is it English or Bengali?
    for t in tokens:
        feats.add(f"W:{t}")

        # Suffixes
        for length in (1, 2, 3, 4):
            if len(t) >= length:
                feats.add(f"S{length}:{t[-length:]}")

        # Prefixes
        for length in (2, 3, 4):
            if len(t) >= length:
                feats.add(f"P{length}:{t[:length]}")

    return list(feats)

def main():
    print("--- 1. Pulling Open Datasets ---")
    faruk_data = load_faruk()
    print(f"Loaded {len(faruk_data)} from Faruk dataset.")

    bn_female = query_wikidata('Q6581072', 'bn', 3500)
    bn_male = query_wikidata('Q6581097', 'bn', 3500)
    en_female = query_wikidata('Q6581072', 'en', 3500)
    en_male = query_wikidata('Q6581097', 'en', 3500)

    print(f"Wikidata BN: {len(bn_female)} Female, {len(bn_male)} Male")
    print(f"Wikidata EN: {len(en_female)} Female, {len(en_male)} Male")

    # Combine datasets
    all_samples = []
    for n, g in faruk_data:
        all_samples.append((clean_name(n), g))
    for n in bn_female:
        all_samples.append((clean_name(n), 'female'))
    for n in bn_male:
        all_samples.append((clean_name(n), 'male'))
    for n in en_female:
        all_samples.append((clean_name(n), 'female'))
    for n in en_male:
        all_samples.append((clean_name(n), 'male'))

    # Deduplicate
    gender_map = defaultdict(lambda: defaultdict(int))
    for n, g in all_samples:
        if len(n) >= 2:
            gender_map[n.lower()][g] += 1

    clean_dataset = []
    for n_lower, counts in gender_map.items():
        # majority vote if conflicted
        assigned = 'female' if counts['female'] > counts['male'] else 'male'
        clean_dataset.append((n_lower, assigned))

    male_total = sum(1 for _, g in clean_dataset if g == 'male')
    female_total = sum(1 for _, g in clean_dataset if g == 'female')
    print(f"\n--- 2. Dataset Statistics ---")
    print(f"Total Unique Names: {len(clean_dataset)} (Male: {male_total}, Female: {female_total})")

    # Train / Test split
    random.seed(42)
    random.shuffle(clean_dataset)
    split_idx = int(len(clean_dataset) * 0.85)
    train_set = clean_dataset[:split_idx]
    test_set = clean_dataset[split_idx:]

    print(f"Train samples: {len(train_set)}, Test samples: {len(test_set)}")

    # Feature statistics on train set
    feat_female = defaultdict(int)
    feat_male = defaultdict(int)
    feat_total = defaultdict(int)

    train_f = sum(1 for _, g in train_set if g == 'female')
    train_m = sum(1 for _, g in train_set if g == 'male')

    for n, g in train_set:
        for f in extract_features(n):
            feat_total[f] += 1
            if g == 'female':
                feat_female[f] += 1
            else:
                feat_male[f] += 1

    alpha = 1.0
    prior_log_odds = math.log((train_f + 1) / (train_m + 1))
    weights = {}

    for f, total in feat_total.items():
        if total < 3:
            continue
        p_f = (feat_female[f] + alpha) / (train_f + 2 * alpha)
        p_m = (feat_male[f] + alpha) / (train_m + 2 * alpha)
        lo = math.log(p_f / p_m)
        if abs(lo) >= 0.4:
            weights[f] = round(lo, 2)

    # Evaluate on test set
    correct = 0
    for n, true_g in test_set:
        feats = extract_features(n)
        score = prior_log_odds + sum(weights.get(f, 0.0) for f in feats)
        pred_g = 'female' if score > 0 else 'male'
        if pred_g == true_g:
            correct += 1

    acc = (correct / len(test_set)) * 100
    print(f"\n--- 3. Validation Results ---")
    print(f"Test Accuracy on Holdout Set: {acc:.2f}% ({correct}/{len(test_set)})")

    # Retrain on full dataset
    full_f = sum(1 for _, g in clean_dataset if g == 'female')
    full_m = sum(1 for _, g in clean_dataset if g == 'male')
    full_feat_f = defaultdict(int)
    full_feat_m = defaultdict(int)
    full_feat_total = defaultdict(int)

    for n, g in clean_dataset:
        for f in extract_features(n):
            full_feat_total[f] += 1
            if g == 'female':
                full_feat_f[f] += 1
            else:
                full_feat_m[f] += 1

    final_prior = round(math.log((full_f + 1) / (full_m + 1)), 2)
    final_weights = {}

    for f, total in full_feat_total.items():
        if total < 3:
            continue
        p_f = (full_feat_f[f] + alpha) / (full_f + 2 * alpha)
        p_m = (full_feat_m[f] + alpha) / (full_m + 2 * alpha)
        lo = math.log(p_f / p_m)
        if abs(lo) >= 0.45:
            final_weights[f] = round(lo, 2)

    # Sort by importance and select top 2200 features to stay under 35KB
    sorted_features = sorted(final_weights.items(), key=lambda item: abs(item[1]) * math.log(full_feat_total[item[0]]), reverse=True)
    selected_weights = dict(sorted_features[:2150])

    # Save to src/lib/genderModelData.json
    out_file = "src/lib/genderModelData.json"
    model_payload = {
        "prior": final_prior,
        "weights": selected_weights
    }
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(model_payload, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = os.path.getsize(out_file) / 1024
    print(f"\n--- 4. Model Export ---")
    print(f"Saved pre-trained model to {out_file}: {size_kb:.2f} KB ({len(selected_weights)} weights)")

    # Sanity checks on Bangladeshi test suite
    test_suite = [
        ("আক্কাস আলী", "male"),
        ("সালেহা বেগম", "female"),
        ("মতিউর রহমান", "male"),
        ("রোকসana আক্তার", "female"),
        ("রোকসানা আক্তার", "female"),
        ("মোছাঃ ফাতেমা খাতুন", "female"),
        ("সাদিয়া সুলতানা", "female"),
        ("সাদিয়া সুলতানা", "female"),
        ("আরিফ হাসান", "male"),
        ("মেবেল মারাক", "female"),
        ("অপূর্ব কুমার রায়", "male"),
        ("প্রিয়াঙ্কা রানী", "female"),
        ("Md. Tanvir Hasan", "male"),
        ("Sadia Sultana", "female"),
        ("Fatema Begum", "female"),
        ("Akkas Ali", "male"),
        ("Roksana Akter", "female"),
        ("Angela Gomes", "female"),
        ("Mahdi Hasnat Siyam", "male"),
        ("মাহদি হাসনাত সিয়াম", "male"),
        ("Hasnat Abdullah", "male"),
        ("Siam Ahmed", "male"),
    ]

    print("\n--- 5. Benchmark Predictions on Common Names ---")
    passed = 0
    for name, expected in test_suite:
        feats = extract_features(name)
        score = final_prior + sum(selected_weights.get(f, 0.0) for f in feats)
        pred = "female" if score > 0 else "male"
        is_ok = "✓ PASS" if pred == expected else "✗ FAIL"
        if pred == expected:
            passed += 1
        print(f"  [{is_ok}] {name:25} -> {pred:6} (Expected: {expected}, score: {score:+.2f})")

    print(f"\nBenchmark Score: {passed}/{len(test_suite)} ({passed/len(test_suite)*100:.1f}%)")

if __name__ == '__main__':
    main()
