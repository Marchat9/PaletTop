import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceLogo = path.join(__dirname, '../src/assets/images/palet_logo.png');
const outputDir = path.join(__dirname, '../public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableBackground = '#0e141c'; // --color-background (dark theme default)

async function generateStandardIcons() {
  for (const size of sizes) {
    await sharp(sourceLogo)
      .resize(size, size)
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
  }
}

async function generateMaskableIcon() {
  const size = 512;
  const logoSize = Math.round(size * 0.7);
  const logoBuffer = await sharp(sourceLogo).resize(logoSize, logoSize).toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: maskableBackground,
    },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(outputDir, 'maskable-icon-512x512.png'));
}

await mkdir(outputDir, { recursive: true });
await generateStandardIcons();
await generateMaskableIcon();

console.log(`Generated ${sizes.length} icons + 1 maskable icon in ${outputDir}`);
