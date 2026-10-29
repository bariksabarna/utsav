import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const videoDir = path.resolve(process.cwd(), 'demo-video');
fs.mkdirSync(videoDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
  recordVideo: {
    dir: videoDir,
    size: { width: 1440, height: 900 },
  },
});

const page = await context.newPage();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const scrollTo = async (y) => {
  await page.evaluate((value) => window.scrollTo({ top: value, behavior: 'auto' }), y);
  await wait(800);
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await page.locator('h1').waitFor();
await page.getByRole('link', { name: 'Start planning' }).click();
await wait(800);

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
await wait(1200);

await page.locator('text=Budget status').waitFor({ timeout: 30000 });
await scrollTo(350);
await page.getByRole('button', { name: 'Try a sample plan' }).click();
await wait(1200);
await scrollTo(200);
await wait(1000);

await scrollTo(650);
await wait(1200);

const taskCheckbox = page.locator('input[aria-label^="Mark done:"]').first();
if (await taskCheckbox.isVisible().catch(() => false)) {
  await taskCheckbox.check();
  await wait(1200);
}

await scrollTo(1000);
await wait(1200);
await scrollTo(1500);
await wait(1200);

await page.getByLabel('Focus for ideas').fill('low-waste decor, elder-friendly seating');
await page.getByRole('button', { name: 'Generate ideas' }).scrollIntoViewIfNeeded();
await page.getByRole('button', { name: 'Generate ideas' }).click();
await page.getByText('Generate ideas').waitFor({ timeout: 30000 });
await wait(3500);

await page.getByRole('button', { name: 'Where am I overspending?' }).scrollIntoViewIfNeeded();
await page.getByRole('button', { name: 'Where am I overspending?' }).click();
await wait(3500);

await page.getByRole('button', { name: 'Check dietary handling' }).click();
await wait(3500);

await page.getByRole('button', { name: 'Review my plan' }).scrollIntoViewIfNeeded();
await page.getByRole('button', { name: 'Review my plan' }).click();
await wait(4000);

await page.locator('body').screenshot({ path: path.join(videoDir, 'final-frame.png') });

await context.close();
await browser.close();

const webmFiles = fs.readdirSync(videoDir).filter((file) => file.endsWith('.webm')).sort((a, b) => b.localeCompare(a));
if (webmFiles.length === 0) {
  throw new Error('No Playwright video was produced.');
}

const webmPath = path.join(videoDir, webmFiles[0]);
const mp4Path = path.join(videoDir, 'utsav-demo-video-full.mp4');
execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Path}"`, { stdio: 'inherit' });
console.log(`Created full demo video: ${mp4Path}`);
