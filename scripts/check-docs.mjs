import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'README.md',
  'SECURITY.md',
  'docs/PROGRESS.md',
  'docs/DECISIONS.md',
  'docs/ARCHITECTURE.md'
];

const missing = requiredFiles.filter((file) => !existsSync(file));

if (missing.length > 0) {
  console.error(`Missing required docs: ${missing.join(', ')}`);
  process.exit(1);
}

const readme = readFileSync('README.md', 'utf8');
const requiredTerms = ['Chosen vertical', 'Approach', 'How it works', 'Assumptions'];
const missingTerms = requiredTerms.filter((term) => !readme.includes(term));

if (missingTerms.length > 0) {
  console.error(`README missing required sections: ${missingTerms.join(', ')}`);
  process.exit(1);
}

console.log('Docs check passed.');
