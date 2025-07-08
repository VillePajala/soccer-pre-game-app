import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const baseLang = 'en';
const translationPath = path.resolve('src/locales', `${baseLang}.json`);
const data = JSON.parse(readFileSync(translationPath, 'utf8'));

function flatten(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flatten(value, newKey));
    } else {
      keys.push(newKey);
    }
  }
  return keys;
}

const keys = flatten(data).sort();

const typeDef = `// AUTO-GENERATED FILE - DO NOT EDIT\n` +
  `export type TranslationKey =\n${keys.map(k => `  | '${k}'`).join('\n')};\n`;

writeFileSync('src/i18n-types.ts', typeDef);
console.log(`Generated src/i18n-types.ts with ${keys.length} keys`);

