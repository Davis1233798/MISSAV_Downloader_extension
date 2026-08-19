import { execFileSync } from 'node:child_process';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const manifest = JSON.parse(await readFile(join(root, 'extension/manifest.json'), 'utf8'));
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const output = join(dist, `missav-multi-source-downloader-v${manifest.version}.zip`);
execFileSync('zip', ['-qr', output, '.'], { cwd: join(root, 'extension') });
execFileSync('unzip', ['-t', output], { stdio: 'inherit' });
console.log(output);
