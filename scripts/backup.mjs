import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, cp, readFile, readdir, writeFile, chmod, access, statfs, lstat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

async function hashFile(path) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) h.update(chunk);
  return h.digest('hex');
}
async function treeBytes(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw new Error('Backup source must not contain symbolic links');
  if (!info.isDirectory()) return info.size;
  let total = 0;
  for (const name of await readdir(path)) total += await treeBytes(join(path, name));
  return total;
}
export async function backupData(data, destination, config, { reserveBytes = 2 * 1024 ** 3 } = {}) {
  data = resolve(data); destination = resolve(destination);
  try { await access(destination); throw new Error('Backup destination exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Keep two GiB free for the running app; allow headroom for writes during a snapshot.
  const space = await statfs(dirname(destination));
  const needed = 2 * (await treeBytes(data) + (await lstat(config)).size) + reserveBytes;
  if (space.bavail * space.bsize < needed) throw new Error('Insufficient disk space for a safe backup');
  await mkdir(destination, { mode: 0o700 });
  const live = new DatabaseSync(join(data, 'app.sqlite'), { readOnly: true });
  try { await backup(live, join(destination, 'app.sqlite')); } finally { live.close(); }
  await chmod(join(destination, 'app.sqlite'), 0o600);
  try { await cp(join(data, 'files'), join(destination, 'files'), { recursive: true, filter: path => !path.endsWith('.tmp') }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await cp(config, join(destination, 'runtime.json')); await chmod(join(destination, 'runtime.json'), 0o600);
  await cp(join(data, 'restore-complete.json'), join(destination, 'restore-complete.json'));
  let names = [];
  try { names = await readdir(join(destination, 'files', 'index')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const assets = new Map();
  for (const name of names.filter(n => n.endsWith('.json'))) {
    const meta = JSON.parse(await readFile(join(destination, 'files', 'index', name), 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(meta.sha256) || await hashFile(join(destination, 'files', 'blobs', meta.sha256)) !== meta.sha256) throw new Error('Backup asset integrity failure');
    assets.set(meta.key, meta);
  }
  const verify = new DatabaseSync(join(destination, 'app.sqlite'), { readOnly: true });
  try {
    if (verify.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || verify.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Backup database integrity failure');
    if (verify.prepare("SELECT name FROM sqlite_master WHERE name='media_assets'").get()) {
      for (const row of verify.prepare('SELECT storage_key,size FROM media_assets').all()) if (assets.get(row.storage_key)?.size !== row.size) throw new Error('Backup database asset missing');
    }
  } finally { verify.close(); }
  const result = { createdAt: new Date().toISOString(), databaseSha256: await hashFile(join(destination, 'app.sqlite')), fileCount: assets.size };
  await writeFile(join(destination, 'backup-complete.json'), JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [data, root, config] = process.argv.slice(2);
  if (!data || !root || !config) throw new Error('Usage: backup.mjs DATA BACKUP_ROOT PRIVATE_CONFIG');
  const destination = join(root, new Date().toISOString().replaceAll(':', '-'));
  console.log(JSON.stringify(await backupData(data, destination, config)));
}
