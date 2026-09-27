import { inferBanglaGender } from '../src/lib/genderClassifier.ts';

const testCases = [
  // Bengali Script Male
  { name: 'আক্কাস আলী', expected: 'male' },
  { name: 'মতিউর রহমান', expected: 'male' },
  { name: 'মোঃ তানভীর হাসান', expected: 'male' },
  { name: 'সৈয়দ জামিল আহমেদ', expected: 'male' },
  { name: 'অপূর্ব কুমার রায়', expected: 'male' },
  { name: 'আরিফ হোসেন', expected: 'male' },
  { name: 'সাজিদুর রহমান', expected: 'male' },
  { name: 'আবরার হক', expected: 'male' },
  { name: 'মোজাম্মেল হক', expected: 'male' },
  { name: 'শুভ সরকার', expected: 'male' },
  { name: 'সাকিব আল হাসান', expected: 'male' },

  // Bengali Script Female
  { name: 'সালেহা বেগম', expected: 'female' },
  { name: 'রোকসানা আক্তার', expected: 'female' },
  { name: 'মোছাঃ ফাতেমা খাতুন', expected: 'female' },
  { name: 'সাদিয়া সুলতানা', expected: 'female' },
  { name: 'সাদিয়া সুলতানা', expected: 'female' },
  { name: 'তানিয়া সুলতানা', expected: 'female' },
  { name: 'নাজনীন আক্তার', expected: 'female' },
  { name: 'ফারহানা রহমান', expected: 'female' },
  { name: 'প্রিয়াঙ্কা রানী দেবী', expected: 'female' },
  { name: 'নুসরাত জাহান', expected: 'female' },
  { name: 'খাদিজা খাতুন', expected: 'female' },
  { name: 'শামীমা পারভীন', expected: 'female' },

  // English Transliterated Male
  { name: 'Akkas Ali', expected: 'male' },
  { name: 'Md. Motiur Rahman', expected: 'male' },
  { name: 'Tanvir Hasan', expected: 'male' },
  { name: 'Apurba Roy', expected: 'male' },
  { name: 'mahdi hasnat siyam', expected: 'male' },
  { name: 'Mahdi Hasnat Siyam', expected: 'male' },
  { name: 'মাহদি হাসনাত সিয়াম', expected: 'male' },
  { name: 'মাহদী হাসনাত সিয়াম', expected: 'male' },
  { name: 'Hasnat Abdullah', expected: 'male' },
  { name: 'Siam Ahmed', expected: 'male' },

  // English Transliterated Female
  { name: 'Saleha Begum', expected: 'female' },
  { name: 'Roksana Akter', expected: 'female' },
  { name: 'Sadia Sultana', expected: 'female' },
  { name: 'Most. Fatema Khatun', expected: 'female' },
  { name: 'Nusrat Jahan', expected: 'female' },
  { name: 'Angela Gomes', expected: 'female' },
  { name: 'Sadia Hasan', expected: 'female' },
  { name: 'Farhana Hasan', expected: 'female' },
  { name: 'Tasnim Hossain', expected: 'female' },
  { name: 'Nabila Rahman', expected: 'female' },
];

let passed = 0;
console.log('Testing genderClassifier:');
for (const tc of testCases) {
  const result = inferBanglaGender(tc.name);
  const ok = result === tc.expected;
  if (ok) passed++;
  console.log(`  [${ok ? '✓ PASS' : '✗ FAIL'}] ${tc.name.padEnd(25)} -> Inferred: ${String(result).padEnd(6)} | Expected: ${tc.expected}`);
}

console.log(`\nResult: ${passed}/${testCases.length} (${(passed / testCases.length * 100).toFixed(1)}%)`);
if (passed < testCases.length) {
  process.exit(1);
}
