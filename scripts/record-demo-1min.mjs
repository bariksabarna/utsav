import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outDir = path.resolve(process.cwd(), 'demo-video/one-minute');
fs.mkdirSync(outDir, { recursive: true });
for (const file of fs.readdirSync(outDir)) {
  fs.rmSync(path.join(outDir, file), { recursive: true, force: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const save = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await save('01-home');

await page.getByRole('link', { name: 'Start planning' }).click();
await page.waitForTimeout(600);

await page.getByRole('button', { name: 'Wedding' }).click();
await page.getByRole('combobox', { name: 'Event sub-type' }).selectOption('Bengali');
await page.getByRole('spinbutton', { name: 'Budget' }).fill('1500000');
await page.getByRole('spinbutton', { name: 'Guests' }).fill('250');
await page.getByRole('spinbutton', { name: 'Children' }).fill('0');
await page.getByRole('textbox', { name: 'Event date' }).fill('2027-02-26');
await page.getByRole('textbox', { name: 'Start time' }).fill('18:00');
await page.getByRole('combobox', { name: 'Venue style' }).selectOption('Indoor Hall');
await page.getByRole('combobox', { name: 'City tier' }).selectOption('Tier 1');
await page.getByRole('combobox', { name: 'Dietary preference' }).selectOption('Vegetarian');
await page.getByRole('combobox', { name: 'Top priority' }).selectOption('Catering');
await page.getByRole('combobox', { name: 'Plan language' }).selectOption('English');
await page.getByLabel('Elderly guests attending').check();
await page.getByLabel('Live music or DJ').check();
await page.waitForTimeout(800);
await save('02-planner-live');

await page.locator('text=Budget status').waitFor({ timeout: 30000 });
await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'instant' }));
await page.waitForTimeout(500);
await save('03-budget-readiness');

await page.evaluate(() => window.scrollTo({ top: 950, behavior: 'instant' }));
await page.waitForTimeout(500);
await save('04-timeline');

await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
await page.waitForTimeout(500);
await save('05-vendors');

await page.getByLabel('Focus for ideas').fill('low-waste decor, elder-friendly seating');
await page.getByRole('button', { name: 'Generate ideas' }).scrollIntoViewIfNeeded();
await page.getByRole('button', { name: 'Generate ideas' }).click();
await page.waitForTimeout(3000);
await save('06-ai-ideas');

await page.evaluate(() => window.scrollTo({ top: 2300, behavior: 'instant' }));
await page.waitForTimeout(500);
await save('07-ai-panel');

await page.getByRole('button', { name: 'Where am I overspending?' }).click();
await page.waitForTimeout(3500);
await save('08-assistant-budget');

await page.getByRole('button', { name: 'Review my plan' }).click();
await page.waitForTimeout(3500);
await save('09-plan-review');

await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(600);
await save('10-summary');

await browser.close();

const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
if (files.length === 0) {
  throw new Error('No screenshots were created.');
}

const sortedNames = files.map((file) => file.replace(/\.[^/.]+$/, ''));
const first = sortedNames[0]?.replace(/\d+$/, '');
const pattern = path.join(outDir, '01-home.png');
const output = path.resolve(process.cwd(), 'demo-video/utsav-demo-video-1min.mp4');
const shellPattern = path.join(outDir, '*.png');
execSync(`ffmpeg -y -framerate 1/5 -pattern_type glob -i "${shellPattern}" -vf "scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -c:v libx264 -pix_fmt yuv420p -r 30 -t 60 "${output}"`, { stdio: 'inherit' });
console.log(`Created 1-minute demo video: ${output}`);
