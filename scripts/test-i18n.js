import { bnTranslations } from '../src/i18n/bn.ts';
import { enTranslations } from '../src/i18n/en.ts';

function compareObjects(bnObj, enObj, prefix = '') {
  const bnKeys = Object.keys(bnObj);
  const enKeys = Object.keys(enObj);

  let errors = [];

  for (const k of bnKeys) {
    const fullPath = prefix ? `${prefix}.${k}` : k;
    if (!(k in enObj)) {
      errors.push(`Missing key in EN: ${fullPath}`);
      continue;
    }

    const bnVal = bnObj[k];
    const enVal = enObj[k];

    if (typeof bnVal === 'object' && bnVal !== null) {
      if (typeof enVal !== 'object' || enVal === null) {
        errors.push(`Type mismatch at ${fullPath}: BN is object, EN is ${typeof enVal}`);
      } else {
        errors.push(...compareObjects(bnVal, enVal, fullPath));
      }
    } else if (typeof bnVal === 'function') {
      if (typeof enVal !== 'function') {
        errors.push(`Type mismatch at ${fullPath}: BN is function, EN is ${typeof enVal}`);
      } else {
        // Test function invocation
        try {
          const bnRes = bnVal(5, 'http://test.com');
          const enRes = enVal(5, 'http://test.com');
          if (!bnRes || !enRes) {
            errors.push(`Function returned empty string at ${fullPath}`);
          }
        } catch (e) {
          errors.push(`Error executing function at ${fullPath}: ${e.message}`);
        }
      }
    } else {
      if (!bnVal || typeof bnVal !== 'string') {
        errors.push(`Empty or invalid BN string at ${fullPath}`);
      }
      if (!enVal || typeof enVal !== 'string') {
        errors.push(`Empty or invalid EN string at ${fullPath}`);
      }
    }
  }

  for (const k of enKeys) {
    const fullPath = prefix ? `${prefix}.${k}` : k;
    if (!(k in bnObj)) {
      errors.push(`Missing key in BN: ${fullPath}`);
    }
  }

  return errors;
}

console.log('Testing i18n Translation Schema Parity...');
const errors = compareObjects(bnTranslations, enTranslations);

if (errors.length > 0) {
  console.error(`❌ i18n verification failed with ${errors.length} errors:`);
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('✅ i18n translation parity test passed! BN and EN dictionaries are 100% symmetric.');
}
