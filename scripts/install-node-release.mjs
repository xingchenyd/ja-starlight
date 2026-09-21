// Run with sudo on the existing Tencent Cloud host. Never modifies runtime config or business data.
import { readFile, writeFile, mkdir, readlink, symlink, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
const tag = process.argv[2];
if (!/^[a-z0-9-]{8,64}$/.test(tag || '')) throw new Error('Invalid release tag');
const source = `/tmp/star-plan-${tag}`, release = `/srv/star-plan/releases/${tag}`;
const current = '/srv/star-plan/current', node = '/opt/node-v24.20.0-linux-x64/bin/node';
const previous = await readlink(current);
if (!/^\/srv\/star-plan\/releases\/[a-zA-Z0-9-]+$/.test(previous)) throw new Error('Unexpected current release');
const manifest = JSON.parse(await readFile(`${source}/manifest.json`, 'utf8'));
if (manifest.tag !== tag || !Array.isArray(manifest.parts) || manifest.parts.length > 100) throw new Error('Invalid manifest');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const parts = [];
for (let i = 0; i < manifest.parts.length; i++) {
  const part = manifest.parts[i];
  if (part.name !== `archive.part${String(i).padStart(3, '0')}`) throw new Error('Invalid part name');
  const bytes = await readFile(`${source}/${part.name}`);
  if (bytes.length !== part.bytes || hash(bytes) !== part.sha256) throw new Error(`Damaged part ${i}`);
  parts.push(bytes);
}
const bytes = Buffer.concat(parts);
if (bytes.length !== manifest.bytes || hash(bytes) !== manifest.sha256) throw new Error('Archive integrity mismatch');
const archive = `${source}/verified.tar.gz`;
await writeFile(archive, bytes, { flag: 'wx', mode: 0o600 });
const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
if (entries.some(p => p.startsWith('/') || p.split('/').includes('..'))) throw new Error('Unsafe archive path');
execFileSync('systemctl', ['start', 'star-plan-backup.service'], { stdio: 'inherit' });
const tables = ['users', 'workspace_records', 'activity_registrations', 'student_experiences', 'media_assets'];
function inventory() {
  const db = new DatabaseSync('/srv/star-plan/data/app.sqlite', { readOnly: true });
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Invalid database');
    return Object.fromEntries(tables.map(t => [t, new Set(db.prepare(`SELECT id FROM ${t}`).all().map(r => r.id))]));
  } finally { db.close(); }
}
const before = inventory();
await mkdir(release, { recursive: false, mode: 0o750 });
execFileSync('tar', ['-xzf', archive, '-C', release]);
execFileSync('chown', ['-R', 'star-plan:star-plan', release]);
execFileSync('find', [release, '-type', 'd', '-exec', 'chmod', '750', '{}', '+']);
execFileSync('find', [release, '-type', 'f', '-exec', 'chmod', '640', '{}', '+']);
async function switchTo(target, suffix) {
  const next = `/srv/star-plan/current.next-${tag}-${suffix}`;
  await symlink(target, next); await rename(next, current);
  execFileSync('systemctl', ['restart', 'star-plan']);
}
try {
  await switchTo(release, 'install');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch('http://127.0.0.1:3000/api/catalog', { headers: { Host: 'star-plan.com', 'X-Forwarded-Proto': 'https' } })).ok) { ready = true; break; } } catch { /* Startup. */ }
    await new Promise(r => setTimeout(r, 500));
  }
  if (!ready) throw new Error('Service did not become ready');
  execFileSync('runuser', ['-u', 'star-plan', '--', node, '--experimental-sqlite', 'scripts/smoke-server.mjs', '/srv/star-plan/data', '/etc/star-plan/runtime.json'], { cwd: release, stdio: 'inherit' });
  const after = inventory();
  for (const table of tables) for (const id of before[table]) if (!after[table].has(id)) throw new Error(`Existing record missing in ${table}`);
  console.log(JSON.stringify({ release, previous, archiveSha256: manifest.sha256, existingRecordsPreserved: true, counts: Object.fromEntries(tables.map(t => [t, after[t].size])) }));
} catch (error) {
  await switchTo(previous, 'rollback');
  throw error;
}
