import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dist = 'dist';
const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

for (const file of requiredFiles) {
  if (!existsSync(path.join(dist, file))) {
    console.error(`PWA file missing from dist/: ${file}`);
    process.exit(1);
  }
}

const manifest = JSON.parse(readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
for (const field of ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color']) {
  if (typeof manifest[field] !== 'string' || manifest[field].length === 0) {
    console.error(`Manifest field missing: ${field}`);
    process.exit(1);
  }
}

if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
  console.error('Manifest needs at least two icons.');
  process.exit(1);
}

for (const icon of manifest.icons) {
  const file = String(icon.src ?? '').replace(/^\//, '');
  if (!existsSync(path.join(dist, file))) {
    console.error(`Manifest icon missing from dist/: ${icon.src}`);
    process.exit(1);
  }
}

const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!html.includes('manifest.webmanifest') || !html.includes('theme-color')) {
  console.error('index.html is missing the manifest link or theme-color meta tag.');
  process.exit(1);
}

const worker = readFileSync(path.join(dist, 'sw.js'), 'utf8');
if (!worker.includes("addEventListener('fetch'") || !worker.includes('caches')) {
  console.error('Service worker does not implement offline caching.');
  process.exit(1);
}

const entry = readFileSync('src/main.tsx', 'utf8');
if (!entry.includes('serviceWorker.register')) {
  console.error('Client entry does not register the service worker.');
  process.exit(1);
}

console.log('PWA check passed.');
