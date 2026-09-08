import sharp from 'sharp';
import fs from 'fs';

async function generate() {
  const popupSrc = 'public/screenshot1.png';
  const meta = await sharp(popupSrc).metadata();

  const canvasW = 1280;
  const canvasH = 800;

  // Scale popup card to 690px height
  const targetH = 690;
  const targetW = Math.round((meta.width / meta.height) * targetH);
  const rx = 14;

  const maskSvg = Buffer.from(`
    <svg width="${targetW}" height="${targetH}">
      <rect x="0" y="0" width="${targetW}" height="${targetH}" rx="${rx}" ry="${rx}" fill="#fff" />
    </svg>
  `);

  const roundedPopup = await sharp(popupSrc)
    .resize(targetW, targetH, { fit: 'fill' })
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const x = Math.round((canvasW - targetW) / 2);
  const y = Math.round((canvasH - targetH) / 2);

  // Rounded icon badge for top-left
  const iconRx = 8;
  const iconMask = Buffer.from(`
    <svg width="40" height="40">
      <rect x="0" y="0" width="40" height="40" rx="${iconRx}" ry="${iconRx}" fill="#fff" />
    </svg>
  `);

  const logoBuf = await sharp('public/icons/icon-48.png')
    .resize(40, 40)
    .composite([{ input: iconMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const bgSvg = Buffer.from(`
    <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#070c18" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#080d1a" />
        </linearGradient>
        <radialGradient id="ocean-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.25" />
          <stop offset="60%" stop-color="#0369a1" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="corner-glow" cx="15%" cy="15%" r="45%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#000" stop-opacity="0" />
        </radialGradient>
        <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="28" stdDeviation="36" flood-color="#000000" flood-opacity="0.75" />
          <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0284c7" flood-opacity="0.25" />
        </filter>
      </defs>

      <!-- Backgrounds -->
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect width="100%" height="100%" fill="url(#ocean-glow)" />
      <rect width="100%" height="100%" fill="url(#corner-glow)" />

      <!-- Subtle background grid lines -->
      <g stroke="rgba(255,255,255,0.03)" stroke-width="1">
        <line x1="0" y1="200" x2="${canvasW}" y2="200" />
        <line x1="0" y1="400" x2="${canvasW}" y2="400" />
        <line x1="0" y1="600" x2="${canvasW}" y2="600" />
        <line x1="320" y1="0" x2="320" y2="${canvasH}" />
        <line x1="960" y1="0" x2="960" y2="${canvasH}" />
      </g>

      <!-- Card shadow base -->
      <rect x="${x}" y="${y}" width="${targetW}" height="${targetH}" rx="${rx}" ry="${rx}"
            fill="#ffffff" filter="url(#card-shadow)" />

      <!-- Top-left Branding -->
      <g transform="translate(108, 48)">
        <text font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="18" fill="#f8fafc" letter-spacing="-0.3">
          OpenScript
        </text>
        <text font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="500" font-size="12" fill="#94a3b8" y="19">
          Lightweight MV3 User Script Manager
        </text>
      </g>

      <!-- Top-right Badges -->
      <g transform="translate(${canvasW - 275}, 44)">
        <rect width="105" height="26" rx="13" fill="rgba(14,165,233,0.12)" stroke="rgba(56,189,248,0.3)" stroke-width="1" />
        <text x="52" y="17" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="11" fill="#38bdf8">
          Manifest V3
        </text>
      </g>
      <g transform="translate(${canvasW - 158}, 44)">
        <rect width="98" height="26" rx="13" fill="rgba(16,185,129,0.12)" stroke="rgba(52,211,153,0.3)" stroke-width="1" />
        <text x="49" y="17" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="11" fill="#34d399">
          Sync Secrets
        </text>
      </g>
    </svg>
  `);

  const borderSvg = Buffer.from(`
    <svg width="${targetW}" height="${targetH}">
      <rect x="0.5" y="0.5" width="${targetW - 1}" height="${targetH - 1}" rx="${rx}" ry="${rx}"
            fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
    </svg>
  `);

  const final1280 = await sharp(bgSvg)
    .composite([
      { input: logoBuf, top: 40, left: 56 },
      { input: roundedPopup, top: y, left: x },
      { input: borderSvg, top: y, left: x }
    ])
    .png()
    .toBuffer();

  await sharp(final1280).toFile('public/store-screenshot-1280x800.png');
  console.log('✓ Generated public/store-screenshot-1280x800.png (1280x800)');

  await sharp(final1280)
    .resize(640, 400)
    .png()
    .toFile('public/store-screenshot-640x400.png');
  console.log('✓ Generated public/store-screenshot-640x400.png (640x400)');
}

generate();
