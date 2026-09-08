import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMeta, normalizeMatch, getBoilerplate } from '../src/utils/parser.js';
import { wrapScriptCode } from '../src/utils/userScripts.js';

test('parseMeta extracts standard Tampermonkey metadata', () => {
  const sample = `
// ==UserScript==
// @name         Test Script
// @version      2.1.0
// @description  Sample description
// @author       Alice
// @match        https://gemini.google.com/*
// @match        https://example.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

console.log('hello');
`;

  const meta = parseMeta(sample);
  assert.equal(meta.name, 'Test Script');
  assert.equal(meta.version, '2.1.0');
  assert.equal(meta.description, 'Sample description');
  assert.equal(meta.author, 'Alice');
  assert.deepEqual(meta.matches, ['https://gemini.google.com/*', 'https://example.com/*']);
  assert.equal(meta.runAt, 'document_start');
});

test('parseMeta falls back to defaults when fields are missing', () => {
  const sample = `
// ==UserScript==
// ==/UserScript==
`;
  const meta = parseMeta(sample);
  assert.equal(meta.name, 'Untitled Script');
  assert.equal(meta.version, '1.0.0');
  assert.deepEqual(meta.matches, ['*://*/*']);
  assert.equal(meta.runAt, 'document_idle');
});

test('normalizeMatch formats URL patterns for Chrome userScripts API', () => {
  assert.equal(normalizeMatch('https://example.com'), 'https://example.com/*');
  assert.equal(normalizeMatch('example.com/*'), '*://example.com/*');
  assert.equal(normalizeMatch('*://*/*'), '*://*/*');
});

test('wrapScriptCode injects OpenScript.env and GM_getValue polyfill', () => {
  const code = 'console.log(env.API_KEY, GM_getValue("API_KEY"));';
  const wrapped = wrapScriptCode(code, { API_KEY: 'secret123' });

  assert.ok(wrapped.includes('const OpenScript = Object.freeze('));
  assert.ok(wrapped.includes('"API_KEY":"secret123"'));
  assert.ok(wrapped.includes('const env = OpenScript.env;'));
  assert.ok(wrapped.includes('const GM_getValue ='));
  assert.ok(wrapped.includes(code));
});

test('getBoilerplate produces valid Tampermonkey template without namespace', () => {
  const template = getBoilerplate('My Script');
  assert.ok(template.includes('// @name         My Script'));
  assert.ok(!template.includes('@namespace'));
  const parsed = parseMeta(template);
  assert.equal(parsed.name, 'My Script');
});
