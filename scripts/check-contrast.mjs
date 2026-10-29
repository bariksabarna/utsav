const pairs = [
  ['light body text', '#1F1630', '#FFFBF5', 4.5],
  ['light muted text', '#5B5470', '#FFFBF5', 4.5],
  ['light primary', '#4A2C82', '#FFFBF5', 4.5],
  ['primary button text', '#FFFFFF', '#4A2C82', 4.5],
  ['secondary button text', '#1F1630', '#F2EBFF', 4.5],
  ['success text', '#166534', '#FFFFFF', 4.5],
  ['warning text', '#92400E', '#FFFFFF', 4.5],
  ['danger text', '#B91C1C', '#FFFFFF', 4.5],
  ['info text', '#1D4ED8', '#FFFFFF', 4.5],
  ['chip text', '#4A2C82', '#F6EFE6', 4.5],
  ['dark body text', '#F7F2FF', '#14101F', 4.5],
  ['dark card text', '#F7F2FF', '#1F1830', 4.5],
  ['dark list text', '#F7F2FF', '#2A2040', 4.5],
  ['dark muted text', '#CFC3E8', '#2A2040', 4.5],
  ['dark secondary button', '#F7F2FF', '#33264D', 4.5],
  ['dark alert text', '#FECACA', '#3A1414', 4.5],
  ['dark good note', '#BBF7D0', '#12301C', 4.5],
  ['dark success text', '#86EFAC', '#2A2040', 4.5],
];

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    console.error(`Invalid color: ${hex}`);
    process.exit(1);
  }
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function ratio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

let failed = false;
for (const [label, foreground, background, minimum] of pairs) {
  const value = ratio(foreground, background);
  const rounded = Math.round(value * 100) / 100;
  if (value < minimum) {
    console.error(`${label}: ${rounded}:1 is below ${minimum}:1`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Contrast check passed for ${pairs.length} token pairs.`);
