import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const extension = join(root, 'extension');
const jsFiles = ['content.js', 'background.js', 'sniffer.js'];
const locales = ['en', 'zh_TW', 'zh_CN', 'ja', 'ko', 'es'];

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', join(extension, file)], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}

const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('manifest_version must be 3');
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('manifest.version must use MAJOR.MINOR.PATCH');
if (manifest.version !== pkg.version) throw new Error('package.json and extension/manifest.json versions differ');
if (manifest.default_locale !== 'en') throw new Error('default_locale must be en');
if (!manifest.permissions?.includes('downloads')) throw new Error('downloads permission is required for direct MP4 support');

const matches = manifest.content_scripts.flatMap(item => item.matches || []);
for (const required of ['*://missav.ai/*', '*://pornhub.com/*', '*://*.pornhub.com/*']) {
  const count = matches.filter(match => match === required).length;
  if (count < 2) throw new Error(`${required} must be present in both content-script declarations`);
}

const english = JSON.parse(await readFile(join(extension, '_locales/en/messages.json'), 'utf8'));
const englishKeys = Object.keys(english).sort();
for (const locale of locales) {
  const messages = JSON.parse(await readFile(join(extension, `_locales/${locale}/messages.json`), 'utf8'));
  const keys = Object.keys(messages).sort();
  if (JSON.stringify(keys) !== JSON.stringify(englishKeys)) {
    throw new Error(`Locale ${locale} does not contain exactly the English message keys`);
  }
  for (const [key, value] of Object.entries(messages)) {
    if (!value || typeof value.message !== 'string' || !value.message.trim()) {
      throw new Error(`Locale ${locale} has invalid message: ${key}`);
    }
  }
}

for (const size of [16, 32, 48, 128]) {
  await stat(join(extension, `icons/icon${size}.png`));
}

console.log(`Static checks passed for v${manifest.version} (${locales.length} locales)`);
