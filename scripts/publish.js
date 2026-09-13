import fs from 'fs';

const EXTENSION_ID = 'dkelmgdchndagjemmodhkphdikhpnfol';
const { CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN } = process.env;

if (!CHROME_CLIENT_ID || !CHROME_CLIENT_SECRET || !CHROME_REFRESH_TOKEN) {
  console.error('Missing Chrome Web Store credentials in environment variables.');
  process.exit(1);
}

const zipPath = 'openscript.zip';
if (!fs.existsSync(zipPath)) {
  console.error(`Zip file not found: ${zipPath}`);
  process.exit(1);
}

async function publish() {
  console.log('1. Refreshing access token...');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CHROME_CLIENT_ID,
      client_secret: CHROME_CLIENT_SECRET,
      refresh_token: CHROME_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('Failed to obtain access token:', tokenData);
    process.exit(1);
  }

  const accessToken = tokenData.access_token;
  console.log('✓ Access token obtained.');

  console.log(`2. Uploading ${zipPath} to Chrome Web Store (${EXTENSION_ID})...`);
  const zipBuffer = fs.readFileSync(zipPath);
  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${EXTENSION_ID}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-goog-api-version': '2',
      },
      body: zipBuffer,
    }
  );

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || uploadData.uploadState !== 'SUCCESS') {
    console.error('Upload failed:', uploadData);
    process.exit(1);
  }
  console.log('✓ Upload successful:', uploadData.uploadState);

  console.log('3. Publishing new version to Chrome Web Store...');
  const publishRes = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${EXTENSION_ID}/publish`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-goog-api-version': '2',
        'Content-Length': '0',
      },
    }
  );

  const publishData = await publishRes.json();
  if (!publishRes.ok || (publishData.status && !publishData.status.includes('OK'))) {
    console.error('Publish failed:', publishData);
    process.exit(1);
  }
  console.log('✓ Publish response:', publishData);
}

publish().catch(err => {
  console.error('Error during publish:', err);
  process.exit(1);
});
