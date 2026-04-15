import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateIcon(size) {
  const bgColor = '#080f1a';
  const rectColor = '#1a4a7a';
  const inset = Math.round(size * 0.1);
  const rectSize = size - inset * 2;
  const radius = Math.round(size * 0.15);
  const ibsFontSize = Math.round(size * 0.3);
  const vaFontSize = Math.round(size * 0.15);
  const ibsY = Math.round(size / 2 - ibsFontSize * 0.15);
  const vaY = Math.round(ibsY + ibsFontSize * 0.55);

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${bgColor}"/>
    <rect x="${inset}" y="${inset}" width="${rectSize}" height="${rectSize}" rx="${radius}" ry="${radius}" fill="${rectColor}"/>
    <text x="${size / 2}" y="${ibsY}" text-anchor="middle" dominant-baseline="central"
      font-family="sans-serif" font-weight="bold" font-size="${ibsFontSize}" fill="white">IBS</text>
    <text x="${size / 2}" y="${vaY}" text-anchor="middle" dominant-baseline="central"
      font-family="sans-serif" font-weight="bold" font-size="${vaFontSize}" fill="#5ba3e8">VA</text>
  </svg>`;

  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

const publicDir = join(__dirname, '..', 'public');

const [icon192, icon512] = await Promise.all([generateIcon(192), generateIcon(512)]);

const { writeFileSync } = await import('fs');
writeFileSync(join(publicDir, 'icon-192.png'), icon192);
writeFileSync(join(publicDir, 'icon-512.png'), icon512);

console.log('Icons generated: icon-192.png, icon-512.png');
