import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const failures = [];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dist-server', 'coverage', '.git'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

const files = walk('.');
const source = files.filter((file) => /\.(ts|tsx|js|mjs)$/.test(file) && !file.startsWith(`scripts${path.sep}`));

for (const file of source) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('dangerouslySetInnerHTML')) failures.push(`${file}: dangerouslySetInnerHTML`);
  if (/\.innerHTML\s*=/.test(text)) failures.push(`${file}: direct innerHTML assignment`);
  if (/\beval\s*\(/.test(text)) failures.push(`${file}: eval()`);
  if (/AIza[0-9A-Za-z_-]{20,}/.test(text)) failures.push(`${file}: possible Google API key`);
  if (/sk-[A-Za-z0-9]{20,}/.test(text)) failures.push(`${file}: possible secret key`);
}

const app = readFileSync('server/src/app.ts', 'utf8');
for (const needle of [
  'helmet(',
  'cors(',
  'rateLimit(',
  "express.json({ limit: '32kb'",
  "app.set('trust proxy', 1)",
  "res.setHeader('Cache-Control', 'no-store')",
]) {
  if (!app.includes(needle)) failures.push(`server/src/app.ts missing ${needle}`);
}

const errors = readFileSync('server/src/middleware/errors.ts', 'utf8');
if (!errors.includes('application/problem+json')) failures.push('problem+json response missing');

const worker = readFileSync('public/sw.js', 'utf8');
if (!worker.includes("url.pathname.startsWith('/api/')")) {
  failures.push('service worker may cache API responses');
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
for (const dependency of ['helmet', 'cors', 'express-rate-limit', 'zod', '@google/genai']) {
  if (!pkg.dependencies?.[dependency]) failures.push(`missing dependency: ${dependency}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(`Security checks passed across ${source.length} source files.`);
