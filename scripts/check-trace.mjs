import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const testsDir = 'tests';
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const info = statSync(fullPath);
    if (info.isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
}

walk(testsDir);
const content = files.map((file) => readFileSync(file, 'utf8')).join('\n');

if (!content.includes('[FR-ONB-001]')) {
  console.error('No FR-ONB-001 trace tag found in tests.');
  process.exit(1);
}

console.log('Trace check passed.');
