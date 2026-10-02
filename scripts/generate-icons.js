import sharp from 'sharp';
import fs from 'fs';

const src = 'public/icons/OpenScript_v3.png';
const sizes = [16, 32, 48, 128];

for (const s of sizes) {
  await sharp(src)
    .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`public/icons/icon-${s}.png`);
  console.log(`✓ Generated icon-${s}.png`);
}
