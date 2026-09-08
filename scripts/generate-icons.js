import sharp from 'sharp';
import fs from 'fs';

const src = 'public/icons/OpenScript_v2.png';
const sizes = [16, 32, 48, 128];

for (const s of sizes) {
  await sharp(src)
    .resize(s, s, { fit: 'contain' })
    .png()
    .toFile(`public/icons/icon-${s}.png`);
  console.log(`✓ Generated icon-${s}.png`);
}
