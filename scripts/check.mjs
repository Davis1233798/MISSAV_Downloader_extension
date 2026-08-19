import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const extension = join(root, 'extension');
const files = ['content.js', 'background.js', 'sniffer.js'];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(extension, file)], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}

const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('manifest_version must be 3');
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('manifest.version must use MAJOR.MINOR.PATCH');
if (manifest.version !== JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version) {
  throw new Error('package.json and extension/manifest.json versions differ');
}
for (const size of [16, 32, 48, 128]) {
  await stat(join(extension, `icons/icon${size}.png`));
}
console.log(`Static checks passed for v${manifest.version}`);
