import type { Gender } from '../types/family';
import modelData from './genderModelData.json' with { type: 'json' };

interface ModelPayload {
  prior: number;
  weights: Record<string, number>;
}

const { prior, weights } = modelData as ModelPayload;

// Strict unambiguous gender prefixes / honorifics
const FEMALE_PREFIXES = new Set([
  'মোছাঃ', 'মোছা', 'মোসাঃ', 'মোসা', 'মোসাম্মৎ', 'মোসাম্মত', 'সৈয়দা', 'সৈয়দা',
  'মিস', 'মিসেস', 'বেগম',
  'most', 'most.', 'mst', 'mst.', 'musammat', 'mrs', 'mrs.', 'ms', 'ms.'
]);

const MALE_PREFIXES = new Set([
  'মোঃ', 'মো', 'মোহাঃ', 'মোহা', 'মোহাম্মদ', 'মুহাম্মদ', 'সৈয়দ', 'সৈয়দ',
  'মাওলানা', 'মুফতি', 'হাফেজ', 'কাজী', 'বাবু',
  'md', 'md.', 'mohammad', 'muhammad', 'mr', 'mr.', 'sheikh', 'syed', 'kazi'
]);

// Strict unambiguous female suffixes/titles (never used by men)
const FEMALE_SUFFIXES = new Set([
  'বেগম', 'খাতুন', 'আক্তার', 'আখতার', 'সুলতানা', 'বানু', 'নেসা', 'বিবি',
  'জাহান', 'নাহার', 'পারভীন', 'পারভিন', 'রাণী', 'রানী', 'দেবী', 'বালা', 'প্রিয়া', 'প্রিয়া', 'খানম',
  'begum', 'khatun', 'akter', 'aktar', 'akhtar', 'sultana', 'banu', 'nesa',
  'bibi', 'jahan', 'nahar', 'parveen', 'parvin', 'rani', 'devi', 'bala', 'priya', 'khanam'
]);

// Strict unambiguous male suffixes/titles (never used by women)
// Surnames like 'হাসান', 'হোসেন', 'আলী', 'রহমান', 'খান', 'চৌধুরী', 'রায়' are family names used by both genders,
// so they are evaluated statistically by the ML model weights rather than forced here.
const MALE_SUFFIXES = new Set([
  'উদ্দিন', 'উদদীন', 'মিয়া', 'মিঞা', 'কুমার', 'চন্দ্র', 'বাবু',
  'uddin', 'mia', 'miah', 'kumar', 'chandra', 'babu'
]);

/**
 * Extracts n-grams and tokens matching the model's feature space (W, S, P)
 */
function extractFeatures(name: string): string[] {
  const feats = new Set<string>();
  const clean = name.replace(/[()[\]{}.,\/#!$%\^&\*;:{}=\-_`~]/g, ' ').trim().toLowerCase();
  const tokens = clean.split(/\s+/).filter(Boolean);

  for (const t of tokens) {
    feats.add(`W:${t}`);

    // Suffixes
    for (const length of [1, 2, 3, 4]) {
      if (t.length >= length) {
        feats.add(`S${length}:${t.slice(-length)}`);
      }
    }

    // Prefixes
    for (const length of [2, 3, 4]) {
      if (t.length >= length) {
        feats.add(`P${length}:${t.slice(0, length)}`);
      }
    }
  }

  return Array.from(feats);
}

/**
 * Predicts gender ('male' | 'female' | null) from a Bangladeshi/Bengali name.
 * Uses grammatical prefixes/suffixes + pre-trained ML character n-gram weights.
 * NO hardcoded given names are shipped in the client bundle.
 */
export function inferBanglaGender(name: string): Gender | null {
  if (!name || name.trim().length < 2) return null;

  const rawTokens = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return null;

  // 1. Strict Prefix check (Md., Most., Mrs., মোছাঃ, etc.)
  const firstToken = rawTokens[0].replace(/[.:]/g, '');
  const firstTokenWithPunc = rawTokens[0];

  if (FEMALE_PREFIXES.has(firstToken) || FEMALE_PREFIXES.has(firstTokenWithPunc)) {
    return 'female';
  }
  if (MALE_PREFIXES.has(firstToken) || MALE_PREFIXES.has(firstTokenWithPunc)) {
    return 'male';
  }

  // 2. Strict Unambiguous Female Titles / Suffixes anywhere in the name
  // (e.g. বেগম, খাতুন, আক্তার, সুলতানা are exclusively female)
  for (const t of rawTokens) {
    if (FEMALE_SUFFIXES.has(t)) return 'female';
  }

  // 3. Strict Male Titles (e.g. uddin, mia, kumar, chandra, babu)
  const lastToken = rawTokens[rawTokens.length - 1];
  if (MALE_SUFFIXES.has(lastToken)) {
    return 'male';
  }
  for (const t of rawTokens) {
    if (MALE_SUFFIXES.has(t)) return 'male';
  }

  // 4. Pure Statistical Inference via Pre-trained Model Weights (39 KB offline-trained log-odds)
  const features = extractFeatures(name);
  let score = prior;

  for (const f of features) {
    if (f in weights) {
      score += weights[f];
    }
  }

  // Threshold: score > 1.2 indicates female, < -1.2 indicates male
  if (score > 1.2) {
    return 'female';
  }
  if (score < -1.2) {
    return 'male';
  }

  // Uncertain/unisex name -> return null so we don't guess blindly
  return null;
}
