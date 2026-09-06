import { Gender } from '../types/family';

export type CanonicalKey =
  | 'name'
  | 'id'
  | 'gender'
  | 'birth'
  | 'death'
  | 'spouse_female'
  | 'spouse_male'
  | 'spouse_any'
  | 'child'
  | 'father'
  | 'mother'
  | 'custom';

// Mappings for minimal keys in both English and Bangla
const KEY_MAP: Record<string, CanonicalKey> = {
  // Name
  name: 'name',
  'full name': 'name',
  person: 'name',
  'নাম': 'name',
  'পুরো নাম': 'name',
  'ব্যক্তি': 'name',

  // ID
  id: 'id',
  identifier: 'id',
  'আইডি': 'id',
  'নম্বর': 'id',

  // Gender
  gender: 'gender',
  sex: 'gender',
  'লিঙ্গ': 'gender',
  'জেন্ডার': 'gender',

  // Birth
  birth: 'birth',
  dob: 'birth',
  'date of birth': 'birth',
  'birth date': 'birth',
  'birth year': 'birth',
  'জন্ম': 'birth',
  'জন্মতারিখ': 'birth',
  'জন্ম সাল': 'birth',
  'জন্ম সন': 'birth',

  // Death
  death: 'death',
  dod: 'death',
  'date of death': 'death',
  'death date': 'death',
  'death year': 'death',
  'passed away': 'death',
  'মৃত্যু': 'death',
  'ইন্তেকাল': 'death',
  'মৃত্যু সাল': 'death',
  'মৃত্যু সন': 'death',
  'ওফাত': 'death',
  'পরলোকগমন': 'death',

  // Spouse
  wife: 'spouse_female',
  'স্ত্রী': 'spouse_female',
  'বউ': 'spouse_female',
  'সহধর্মিণী': 'spouse_female',

  husband: 'spouse_male',
  'স্বামী': 'spouse_male',
  'পতি': 'spouse_male',

  spouse: 'spouse_any',
  partner: 'spouse_any',
  'দম্পতি': 'spouse_any',
  'জীবনসঙ্গী': 'spouse_any',
  'স্ত্রী/স্বামী': 'spouse_any',

  // Child
  child: 'child',
  children: 'child',
  son: 'child',
  daughter: 'child',
  'সন্তান': 'child',
  'ছেলে': 'child',
  'মেয়ে': 'child',
  'পুত্র': 'child',
  'কন্যা': 'child',
  'সন্তানসন্ততি': 'child',

  // Parents
  father: 'father',
  dad: 'father',
  'পিতা': 'father',
  'বাবা': 'father',
  'আব্বা': 'father',
  'আব্বু': 'father',

  mother: 'mother',
  mom: 'mother',
  'মাতা': 'mother',
  'মা': 'mother',
  'আম্মা': 'mother',
  'আম্মু': 'mother',
};

/**
 * Normalizes an input key string to its canonical representation
 */
export function normalizeKey(rawKey: string): { canonical: CanonicalKey; original: string } {
  const cleaned = rawKey.trim().toLowerCase();
  const canonical = KEY_MAP[cleaned] || 'custom';
  return { canonical, original: rawKey.trim() };
}

/**
 * Normalizes gender value from English or Bangla
 */
export function normalizeGender(val: string): Gender {
  const cleaned = val.trim().toLowerCase();
  if (['male', 'm', 'man', 'boy', 'পুরুষ', 'ছেলে', 'পুত্র'].includes(cleaned)) {
    return 'male';
  }
  if (['female', 'f', 'woman', 'girl', 'নারী', 'মহিলা', 'মেয়ে', 'কন্যা'].includes(cleaned)) {
    return 'female';
  }
  return 'male';
}

