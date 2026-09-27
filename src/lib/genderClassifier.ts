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
// Note: Surnames like 'রহমান', 'খান', 'চৌধুরী', 'হক', 'রায়' are family names used by both genders, so they are not here.
const MALE_SUFFIXES = new Set([
  'আলী', 'আলি', 'হোসেন', 'হোসাইন', 'হাসান', 'উদ্দিন', 'উদদীন', 'মিয়া', 'মিঞা',
  'কুমার', 'চন্দ্র', 'নাথ', 'বাবু',
  'ali', 'hossain', 'hasan', 'uddin', 'mia', 'miah', 'kumar', 'chandra', 'nath', 'babu'
]);

// Core prominent given names to disambiguate compound names with family surnames (e.g. ফারহানা রহমান, মাহদি হাসনাত)
const FEMALE_GIVEN_NAMES = new Set([
  'ফারহানা', 'সাদিয়া', 'সাদিয়া', 'সুমাইয়া', 'সুমাইয়া', 'ফাতেমা', 'আয়েশা', 'আয়েশা',
  'খাদিজা', 'নুসরাত', 'মারিয়া', 'মারিয়া', 'তানিয়া', 'তানিয়া', 'নাজনীন', 'শামীমা',
  'রোকসানা', 'রুমানা', 'সাগরিকা', 'রিমু', 'ঝুমুর', 'পূজা', 'পুজা', 'স্নেহা', 'মিলি',
  'শিউলি', 'আমেনা', 'সানজিদা', 'রিমা', 'মেবেল', 'অনামিকা', 'দীপিকা', 'রুবি',
  'তাসনিম', 'নাবিলা', 'ফারজানা', 'জান্নাত', 'জান্নাতুল', 'ইসরাত', 'মুশফিকা', 'সুবর্ণা',
  'হুমায়রা', 'হুমায়রা', 'মারিয়াম', 'মরিয়ম', 'তাসনুভা', 'সামিয়া', 'সামিয়া', 'শারমিন', 'শিরীন', 'শিরিন',
  'farhana', 'sadia', 'sumaiya', 'fatema', 'ayesha', 'khadija', 'nusrat', 'maria',
  'tania', 'naznin', 'shamima', 'roksana', 'rumana', 'angela', 'shampa', 'salma', 'amena',
  'tasnim', 'nabila', 'farzana', 'jannat', 'jannatul', 'israt', 'mushfika', 'suborna',
  'humaira', 'mariam', 'maryam', 'tasnuva', 'samia', 'sharmin', 'shirin'
]);

const MALE_GIVEN_NAMES = new Set([
  'মাহদি', 'মাহদী', 'হাসনাত', 'সিয়াম', 'সিয়াম', 'আব্দুল্লাহ', 'তাহমিদ', 'নাফিস',
  'অপূর্ব', 'আরিফ', 'আসিফ', 'তানভীর', 'তানজিম', 'সাকিব', 'তামিম', 'মুশফিক', 'মতিউর', 'সাজিদুর',
  'ইমরান', 'সালমান', 'মাহমুদ', 'নাদিম', 'আবরার', 'রাফি', 'সোহেল', 'শুভ', 'সৌরভ',
  'সুব্রত', 'বিজয়', 'জয়', 'পার্থ', 'আক্কাস', 'সবুজ', 'জালাল', 'শহীদুল', 'মেহেদি', 'মেহেদী',
  'মোজাম্মেল', 'জাহাঙ্গীর', 'সিরাজ', 'কামাল', 'শামীম', 'শামিম', 'নাঈম', 'নাঈমুর', 'জাহিদ',
  'রাকিব', 'রাকিবুল', 'সোহাগ', 'জুয়েল', 'রিয়াদ', 'আদনান', 'ফাহিম', 'সায়িম', 'সায়েম',
  'মিরাজ', 'মিজানুর', 'আশরাফুল', 'মোস্তাফিজুর', 'তাসকিন', 'শরিফুল', 'শরিফ', 'শরীফ', 'সাইফুল', 'তৌহিদ',
  'mahdi', 'mehdi', 'hasnat', 'siyam', 'siam', 'abdullah', 'tahmid', 'nafis',
  'apurba', 'tanvir', 'tanjim', 'arif', 'asif', 'sakib', 'tamim', 'imran', 'salman', 'motiur',
  'sajidur', 'shuvo', 'akkas', 'sohel', 'abrar', 'nadim', 'shamim', 'naim', 'zahid',
  'rakib', 'sohag', 'jewel', 'riyad', 'adnan', 'fahim', 'sayem', 'miraz', 'mizanur',
  'ashraful', 'mustafizur', 'taskin', 'shariful', 'sharif', 'saiful', 'towhid'
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
 * Uses high-confidence linguistic tokens + pre-trained character n-gram weights.
 */
export function inferBanglaGender(name: string): Gender | null {
  if (!name || name.trim().length < 2) return null;

  const rawTokens = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return null;

  // 1. Strict Prefix check
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

  // 3. Known Prominent Given Names
  // Women often carry father's/husband's surnames (e.g. Sadia Hasan, Farhana Rahman)
  // Given name takes precedence over family surnames
  let hasFemaleGiven = false;
  let hasMaleGiven = false;
  let firstGivenGender: Gender | null = null;

  for (const t of rawTokens) {
    if (FEMALE_GIVEN_NAMES.has(t)) {
      hasFemaleGiven = true;
      if (!firstGivenGender) firstGivenGender = 'female';
    }
    if (MALE_GIVEN_NAMES.has(t)) {
      hasMaleGiven = true;
      if (!firstGivenGender) firstGivenGender = 'male';
    }
  }

  if (hasFemaleGiven && !hasMaleGiven) return 'female';
  if (hasMaleGiven && !hasFemaleGiven) return 'male';
  if (hasFemaleGiven && hasMaleGiven && firstGivenGender) return firstGivenGender;

  // 4. Male Suffix / Title check
  const lastToken = rawTokens[rawTokens.length - 1];
  if (MALE_SUFFIXES.has(lastToken)) {
    return 'male';
  }
  for (const t of rawTokens) {
    if (MALE_SUFFIXES.has(t)) return 'male';
  }

  // 5. Statistical Inference via Pre-trained Model Weights
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
