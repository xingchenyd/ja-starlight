// Generate a self-hosted release without private config, database or user uploads.
import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const tag = process.argv[2];
if (!/^[a-z0-9-]{8,64}$/.test(tag || '')) throw new Error('Provide a new safe release tag');
const root = resolve('work', tag), stage = join(root, 'package');
await mkdir(resolve('work'), { recursive: true });
await mkdir(root, { recursive: false });
await mkdir(stage);
await cp('dist/standalone', join(stage, 'standalone'), { recursive: true });
for (const folder of ['server', 'scripts', 'deploy']) await cp(folder, join(stage, folder), { recursive: true });
await cp('package.json', join(stage, 'package.json'));
const archive = join(root, 'release.tar.gz');
const packed = spawnSync('tar', ['-czf', archive, '-C', stage, '.'], { stdio: 'inherit' });
if (packed.status !== 0) throw new Error('Packaging failed');
const bytes = await readFile(archive), parts = [];
const hash = b => createHash('sha256').update(b).digest('hex');
for (let offset = 0, index = 0; offset < bytes.length; offset += 4 * 1024 * 1024, index++) {
  const part = bytes.subarray(offset, offset + 4 * 1024 * 1024), name = `archive.part${String(index).padStart(3, '0')}`;
  await writeFile(join(root, name), part, { flag: 'wx' });
  parts.push({ name, bytes: part.length, sha256: hash(part) });
}
const manifest = { tag, bytes: bytes.length, sha256: hash(bytes), parts };
await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ root, ...manifest }, null, 2));
