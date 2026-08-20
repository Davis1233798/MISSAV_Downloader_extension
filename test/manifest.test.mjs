import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8'));

test('manifest is MV3 and semver aligned', async () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.version, pkg.version);
});

test('content scripts support MissAV and Pornhub only by declared patterns', () => {
  const matches = manifest.content_scripts.flatMap(item => item.matches || []);
  assert.ok(matches.includes('*://missav.ai/*'));
  assert.ok(matches.includes('*://pornhub.com/*'));
  assert.ok(matches.includes('*://*.pornhub.com/*'));
  assert.ok(!matches.includes('<all_urls>'));
});

test('direct MP4 support declares downloads permission', () => {
  assert.ok(manifest.permissions.includes('downloads'));
});

test('manifest uses Chrome i18n messages', () => {
  assert.equal(manifest.default_locale, 'en');
  assert.match(manifest.name, /^__MSG_.+__$/);
  assert.match(manifest.description, /^__MSG_.+__$/);
  assert.match(manifest.action.default_title, /^__MSG_.+__$/);
});

test('background service worker exists in manifest', () => {
  assert.equal(manifest.background.service_worker, 'background.js');
});
