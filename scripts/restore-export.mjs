import { readFile, readdir, mkdir, writeFile, access, chmod } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createFileStore } from '../server/files.mjs';
import { verifyDecodedExport } from '../server/verify-export.mjs';

const quote = s => '"' + s.replaceAll('"', '""') + '"';
async function digest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function restoreExport(source, destination, migrations) {
  source = resolve(source); destination = resolve(destination);
  try { await access(destination); throw new Error('Destination already exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const json = async name => JSON.parse(await readFile(join(source, name), 'utf8'));
  const summary = await json('verified-summary.json'), snapshot = await json('database-complete.json'), assets = await json('assets-manifest.json');
  const count = Object.values(snapshot.tables).reduce((n, t) => n + t.rows.length, 0);
  if (summary.encryptedSha256 !== await digest(join(source, 'export.encrypted.ndjson')) || count !== summary.rowCount || Object.keys(snapshot.tables).length !== summary.tableCount || assets.length !== summary.fileCount || assets.reduce((n, a) => n + a.size, 0) !== summary.fileBytes) throw new Error('Snapshot integrity mismatch');
  for (const asset of assets) {
    if (basename(asset.filename) !== asset.filename || /[\\/]/.test(asset.filename) || asset.filename.includes('..') || await digest(join(source, 'objects', asset.filename)) !== asset.sha256) throw new Error('Asset integrity mismatch');
  }
  await verifyDecodedExport(source, snapshot, assets);
  await mkdir(destination, { mode: 0o700 });
  const dbFile = join(destination, 'app.sqlite'), db = new DatabaseSync(dbFile);
  await chmod(dbFile, 0o600);
  const applied = [];
  try {
    db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE');
    for (const entry of snapshot.schema.filter(x => x.type === 'table')) db.exec(entry.sql);
    for (const [name, table] of Object.entries(snapshot.tables)) {
      for (const row of table.rows) {
        const keys = Object.keys(row);
        db.prepare('INSERT INTO ' + quote(name) + '(' + keys.map(quote).join(',') + ') VALUES(' + keys.map(() => '?').join(',') + ')').run(...keys.map(k => row[k]));
      }
      if (db.prepare('SELECT count(*) n FROM ' + quote(name)).get().n !== table.rows.length) throw new Error('Restored row count mismatch');
    }
    for (const entry of snapshot.schema.filter(x => x.type !== 'table')) db.exec(entry.sql);
    for (const item of snapshot.sequences || []) {
      db.prepare('DELETE FROM sqlite_sequence WHERE name=?').run(item.name);
      db.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)').run(item.name, item.seq);
    }
    db.exec('COMMIT; PRAGMA foreign_keys=ON;');
    if (migrations) {
      const previous = new Set((snapshot.tables.__appgarden_migrations?.rows || []).map(r => r.name));
      db.exec('CREATE TABLE IF NOT EXISTS self_host_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
      for (const file of (await readdir(migrations)).filter(f => /^\d+.*\.sql$/.test(f)).sort()) {
        if (previous.has(file)) continue;
        db.exec('BEGIN IMMEDIATE');
        try { db.exec(await readFile(join(migrations, file), 'utf8')); db.prepare('INSERT INTO self_host_migrations(name) VALUES(?)').run(file); db.exec('COMMIT'); applied.push(file); }
        catch (error) { db.exec('ROLLBACK'); throw error; }
      }
    }
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Restored database integrity failure');
  } finally { db.close(); }
  const files = createFileStore(join(destination, 'files'));
  for (const asset of assets) {
    const bytes = await readFile(join(source, 'objects', asset.filename));
    if (bytes.length !== asset.size) throw new Error('Asset size mismatch');
    await files.put(asset.key, bytes, { httpMetadata: asset.httpMetadata, customMetadata: asset.customMetadata });
  }
  const result = { sourceSha256: summary.encryptedSha256, tableCount: summary.tableCount, rowCount: count, fileCount: assets.length, appliedMigrations: applied, restoredAt: new Date().toISOString() };
  await writeFile(join(destination, 'restore-complete.json'), JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, destination, migrations] = process.argv.slice(2);
  if (!source || !destination) throw new Error('Usage: restore-export.mjs SOURCE NEW_DESTINATION [MIGRATIONS]');
  console.log(JSON.stringify(await restoreExport(source, destination, migrations)));
}
