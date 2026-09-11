import { execFileSync } from 'child_process';
import fs from 'fs';
import AdmZip from 'adm-zip';

console.log('Building OpenScript extension...');
fs.rmSync('dist', { recursive: true, force: true });
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'inherit' });

// Remove unneeded master images and screenshots from dist package
[
  'dist/icons/OpenScript_v1.png',
  'dist/icons/OpenScript_v2.png',
  'dist/icons/logo.png',
  'dist/screenshot1.png',
  'dist/scripts.png',
  'dist/secrets.png',
  'dist/store-screenshot-1280x800.png',
  'dist/store-scripts-1280x800.png',
  'dist/store-secrets-1280x800.png'
].forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

// Verify required files
const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));
const required = [
  'dist/manifest.json',
  `dist/${manifest.action?.default_popup || 'src/popup.html'}`,
  `dist/${manifest.background?.service_worker || 'src/background.js'}`,
  'dist/icons/icon-16.png',
  'dist/icons/icon-32.png',
  'dist/icons/icon-48.png',
  'dist/icons/icon-128.png'
];

for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`Missing required build file: ${path}`);
}

// Package into openscript.zip
const zip = new AdmZip();
zip.addLocalFolder('dist');
zip.writeZip('openscript.zip');

const stat = fs.statSync('openscript.zip');
console.log(`\n✓ Successfully created openscript.zip (${(stat.size / 1024).toFixed(1)} KB)`);
console.log('Manifest ready:', {
  name: manifest.name,
  version: manifest.version,
  manifest_version: manifest.manifest_version,
  icons: manifest.icons
});
