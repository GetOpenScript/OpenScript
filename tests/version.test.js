import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { VERSION } from '../src/version.js';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8').then(JSON.parse);

test('release versions stay synchronized', async () => {
  const [manifest, pkg, lock] = await Promise.all(
    ['manifest.json', 'package.json', 'package-lock.json'].map(read)
  );
  assert.equal(VERSION, manifest.version);
  assert.equal(VERSION, pkg.version);
  assert.equal(VERSION, lock.version);
  assert.equal(VERSION, lock.packages[''].version);
});
