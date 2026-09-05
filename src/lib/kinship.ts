import { FamilyTree, KinshipResult } from '../types/family';

/**
 * Resolves the specific Bangladeshi kinship relationship between Person A (Subject) and Person B (Target)
 * i.e., "What is Person B to Person A?" (A এর সাথে B এর সম্পর্ক কী?)
 */
export function calculateKinship(tree: FamilyTree, personAId: string, personBId: string): KinshipResult {
  if (personAId === personBId) {
    return { termBn: 'নিজে', termEn: 'Self', description: 'একই ব্যক্তি' };
  }

  const pA = tree.people[personAId];
  const pB = tree.people[personBId];
  if (!pA || !pB) {
    return { termBn: 'সম্পর্ক অজ্ঞাত', termEn: 'Unknown', description: 'তথ্য অপ্রতুল' };
  }

  // 1. Direct Parent
  if (pA.fatherId === pB.id) {
    return { termBn: 'বাবা (পিতা)', termEn: 'Father', description: `${pB.name} হলেন ${pA.name} এর বাবা` };
  }
  if (pA.motherId === pB.id) {
    return { termBn: 'মা (মাতা)', termEn: 'Mother', description: `${pB.name} হলেন ${pA.name} এর মা` };
  }

  // 2. Direct Child
  if (pB.fatherId === pA.id || pB.motherId === pA.id) {
    const isMale = pB.gender === 'male';
    const isFemale = pB.gender === 'female';
    const termBn = isMale ? 'ছেলে (পুত্র)' : isFemale ? 'মেয়ে (কন্যা)' : 'সন্তান';
    const termEn = isMale ? 'Son' : isFemale ? 'Daughter' : 'Child';
    return { termBn, termEn, description: `${pB.name} হলেন ${pA.name} এর ${termBn}` };
  }

  // 3. Spouse
  const isSpouseOfA = pA.marriages.some(m => m.spouseId === pB.id);
  if (isSpouseOfA) {
    const termBn = pB.gender === 'female' ? 'স্ত্রী (সহধর্মিণী)' : pB.gender === 'male' ? 'স্বামী' : 'জীবনসঙ্গী';
    const termEn = pB.gender === 'female' ? 'Wife' : pB.gender === 'male' ? 'Husband' : 'Spouse';
    return { termBn, termEn, description: `${pB.name} হলেন ${pA.name} এর ${termBn}` };
  }

  // 4. Siblings
  const shareFather = pA.fatherId && pB.fatherId && pA.fatherId === pB.fatherId;
  const shareMother = pA.motherId && pB.motherId && pA.motherId === pB.motherId;
  if (shareFather && shareMother) {
    const isMale = pB.gender === 'male';
    const isFemale = pB.gender === 'female';
    const termBn = isMale ? 'সহোদর ভাই' : isFemale ? 'সহোদর বোন' : 'সহোদর';
    const termEn = isMale ? 'Brother' : isFemale ? 'Sister' : 'Sibling';
    return { termBn, termEn, description: `${pB.name} হলেন ${pA.name} এর ${termBn}` };
  } else if (shareFather && !shareMother) {
    const isMale = pB.gender === 'male';
    const isFemale = pB.gender === 'female';
    const termBn = isMale ? 'বৈমাত্রেয় ভাই' : isFemale ? 'বৈমাত্রেয় বোন' : 'বৈমাত্রেয় ভাই/বোন';
    const termEn = isMale ? 'Half-Brother (Paternal)' : isFemale ? 'Half-Sister (Paternal)' : 'Half-Sibling';
    return { termBn, termEn, description: `${pB.name} হলেন ${pA.name} এর ${termBn} (একই পিতা, ভিন্ন মাতা)` };
  } else if (!shareFather && shareMother) {
    const isMale = pB.gender === 'male';
    const isFemale = pB.gender === 'female';
    const termBn = isMale ? 'বৈপিত্রীয় ভাই' : isFemale ? 'বৈপিত্রীয় বোন' : 'বৈপিত্রীয় ভাই/বোন';
    const termEn = isMale ? 'Half-Brother (Maternal)' : isFemale ? 'Half-Sister (Maternal)' : 'Half-Sibling';
    return { termBn, termEn, description: `${pB.name} হলেন ${pA.name} এর ${termBn} (একই মাতা, ভিন্ন পিতা)` };
  }

  // 5. Grandparents (দাদা/দাদী / নানা/নানী)
  const fatherOfA = pA.fatherId ? tree.people[pA.fatherId] : null;
  const motherOfA = pA.motherId ? tree.people[pA.motherId] : null;

  if (fatherOfA) {
    if (fatherOfA.fatherId === pB.id) {
      return { termBn: 'দাদা', termEn: 'Paternal Grandfather', description: `${pB.name} হলেন ${pA.name} এর দাদা` };
    }
    if (fatherOfA.motherId === pB.id) {
      return { termBn: 'দাদী', termEn: 'Paternal Grandmother', description: `${pB.name} হলেন ${pA.name} এর দাদী` };
    }
  }

  if (motherOfA) {
    if (motherOfA.fatherId === pB.id) {
      return { termBn: 'নানা', termEn: 'Maternal Grandfather', description: `${pB.name} হলেন ${pA.name} এর নানা` };
    }
    if (motherOfA.motherId === pB.id) {
      return { termBn: 'নানী', termEn: 'Maternal Grandmother', description: `${pB.name} হলেন ${pA.name} এর নানী` };
    }
  }

  // 6. Uncles & Aunts (চাচা / ফুফু / মামা / খালা)
  if (fatherOfA && (fatherOfA.fatherId || fatherOfA.motherId)) {
    const isSiblingOfFather =
      (fatherOfA.fatherId && fatherOfA.fatherId === pB.fatherId) ||
      (fatherOfA.motherId && fatherOfA.motherId === pB.motherId);
    if (isSiblingOfFather) {
      if (pB.gender === 'male') {
        return { termBn: 'চাচা', termEn: 'Paternal Uncle', description: `${pB.name} হলেন ${pA.name} এর চাচা` };
      }
      if (pB.gender === 'female') {
        return { termBn: 'ফুফু', termEn: 'Paternal Aunt', description: `${pB.name} হলেন ${pA.name} এর ফুফু` };
      }
    }
  }

  if (motherOfA && (motherOfA.fatherId || motherOfA.motherId)) {
    const isSiblingOfMother =
      (motherOfA.fatherId && motherOfA.fatherId === pB.fatherId) ||
      (motherOfA.motherId && motherOfA.motherId === pB.motherId);
    if (isSiblingOfMother) {
      if (pB.gender === 'male') {
        return { termBn: 'মামা', termEn: 'Maternal Uncle', description: `${pB.name} হলেন ${pA.name} এর মামা` };
      }
      if (pB.gender === 'female') {
        return { termBn: 'খালা', termEn: 'Maternal Aunt', description: `${pB.name} হলেন ${pA.name} এর খালা` };
      }
    }
  }

  // 7. Cousins (চাচাতো, ফুফাতো, মামাতো, খালাতো ভাই/বোন)
  const fatherOfB = pB.fatherId ? tree.people[pB.fatherId] : null;
  const motherOfB = pB.motherId ? tree.people[pB.motherId] : null;

  if (fatherOfA && fatherOfB) {
    if (fatherOfA.fatherId && fatherOfA.fatherId === fatherOfB.fatherId) {
      const termBn = pB.gender === 'male' ? 'চাচাতো ভাই' : 'চাচাতো বোন';
      return { termBn, termEn: 'Paternal Cousin (Uncle\'s child)', description: `${pB.name} হলেন ${pA.name} এর ${termBn}` };
    }
  }

  if (motherOfA && motherOfB) {
    if (motherOfA.motherId && motherOfA.motherId === motherOfB.motherId) {
      const termBn = pB.gender === 'male' ? 'খালাতো ভাই' : 'খালাতো বোন';
      return { termBn, termEn: 'Maternal Cousin (Aunt\'s child)', description: `${pB.name} হলেন ${pA.name} এর ${termBn}` };
    }
  }

  return {
    termBn: 'আত্মীয়',
    termEn: 'Relative',
    description: `${pB.name} হলেন ${pA.name} এর বংশীয় আত্মীয়`,
  };
}

