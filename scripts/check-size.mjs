import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const distDir = 'dist';
if (!existsSync(distDir)) {
  console.error('dist/ does not exist. Run the build before check:size.');
  process.exit(1);
}

const budgets = {
  rawTotal: 350000,
  initialGzip: 90 * 1024,
  cssGzip: 10 * 1024,
  lazyChunkGzip: 25 * 1024,
};

const indexHtml = readFileSync(path.join(distDir, 'index.html'), 'utf8');
const entryScripts = [...indexHtml.matchAll(/assets\/[^"']+\.js/g)].map((match) => match[0]);
const entryStyles = [...indexHtml.matchAll(/assets\/[^"']+\.css/g)].map((match) => match[0]);

if (entryScripts.length === 0) {
  console.error('Could not find the initial script in dist/index.html.');
  process.exit(1);
}

let rawTotal = 0;
let gzipTotal = 0;
let initialGzip = gzipSync(indexHtml).length;
let cssGzip = 0;
const initial = new Set([...entryScripts, ...entryStyles]);

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const buffer = readFileSync(fullPath);
    const relative = path.relative(distDir, fullPath).split(path.sep).join('/');
    const compressed = gzipSync(buffer).length;
    rawTotal += buffer.length;
    gzipTotal += compressed;

    if (initial.has(relative)) {
      initialGzip += compressed;
      if (relative.endsWith('.css')) cssGzip += compressed;
    } else if (relative.endsWith('.js') && compressed > budgets.lazyChunkGzip) {
      console.error(`Lazy chunk ${relative} is too large: ${compressed} bytes gzip.`);
      process.exit(1);
    }
  }
}

walk(distDir);

if (rawTotal > budgets.rawTotal) {
  console.error(`Built assets are too large: ${rawTotal} bytes raw (budget ${budgets.rawTotal}).`);
  process.exit(1);
}

if (initialGzip > budgets.initialGzip) {
  console.error(`Initial gzip is too large: ${initialGzip} bytes (budget ${budgets.initialGzip}).`);
  process.exit(1);
}

if (cssGzip > budgets.cssGzip) {
  console.error(`CSS gzip is too large: ${cssGzip} bytes (budget ${budgets.cssGzip}).`);
  process.exit(1);
}

console.log(
  `Bundle size check passed: ${initialGzip} bytes initial gzip, ${gzipTotal} bytes total gzip, ${rawTotal} bytes raw, ${cssGzip} bytes CSS gzip.`,
);
