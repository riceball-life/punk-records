// Generates the PWA/favicon/Apple icon set from a single source image.
// Source: assets/icon-source.png (square). Run with: npm run icons
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets', 'icon-source.png');
const OUT = join(ROOT, 'public', 'icons');

// The source is a square, full-bleed app icon. iOS/macOS apply their own rounded
// mask, so we just resize to each target size (cover keeps it square if the
// source ever isn't perfectly square).
const targets = [
  { size: 192, name: 'pwa-192.png' },
  { size: 512, name: 'pwa-512.png' },
  { size: 512, name: 'maskable-512.png' },
  { size: 180, name: 'apple-touch-180.png' },
  { size: 32, name: 'favicon-32.png' },
];

await mkdir(OUT, { recursive: true });
for (const { size, name } of targets) {
  await sharp(SRC).resize(size, size, { fit: 'cover' }).png().toFile(join(OUT, name));
  console.log(`  ${name} (${size}×${size})`);
}
console.log('Icons written to public/icons/');
