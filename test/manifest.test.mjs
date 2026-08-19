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

test('content scripts are restricted to supported MissAV hosts', () => {
  const matches = manifest.content_scripts.flatMap(item => item.matches || []);
  assert.ok(matches.length >= 6);
  for (const match of matches) assert.match(match, /^\*:\/\/missav/);
});

test('background service worker exists in manifest', () => {
  assert.equal(manifest.background.service_worker, 'background.js');
});
