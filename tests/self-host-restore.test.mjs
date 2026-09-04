import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { sealFixture } from './helpers/seal-fixture.mjs';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'starlight-restore-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source'); await mkdir(join(source, 'objects'), { recursive: true });
  const archive = Buffer.from('sealed-test-fixture'), file = Buffer.from('private resume');
  await writeFile(join(source, 'export.encrypted.ndjson'), archive);
  await writeFile(join(source, 'objects', 'resume.bin'), file);
  await writeFile(join(source, 'verified-summary.json'), JSON.stringify({ tableCount: 1, rowCount: 1, fileCount: 1, fileBytes: file.length, encryptedSha256: digest(archive) }));
  await writeFile(join(source, 'assets-manifest.json'), JSON.stringify([{ key: 'resumes/u1/a.pdf', filename: 'resume.bin', size: file.length, sha256: digest(file), customMetadata: { owner: 'u1', visibility: 'private' }, httpMetadata: { contentType: 'application/pdf' } }]));
  await writeFile(join(source, 'database-complete.json'), JSON.stringify({ schema: [{ type: 'table', name: 'entries', sql: 'CREATE TABLE entries(id INTEGER PRIMARY KEY AUTOINCREMENT,value TEXT)' }], tables: { entries: { rows: [{ id: 3, value: "星光's 资料" }] } }, sequences: [{ name: 'entries', seq: 20 }] }));
  await sealFixture(source, JSON.parse(await readFile(join(source, 'database-complete.json'))), JSON.parse(await readFile(join(source, 'assets-manifest.json'))), file);
  return { source, target: join(root, 'data') };
}

test('restored database retains records and deleted-row sequence, files remain private', async t => {
  const { restoreExport } = await import('../scripts/restore-export.mjs');
  const { createFileStore } = await import('../server/files.mjs');
  const { source, target } = await fixture(t);
  const result = await restoreExport(source, target);
  assert.equal(result.rowCount, 1);
  const db = new DatabaseSync(join(target, 'app.sqlite'));
  assert.equal(db.prepare('SELECT value FROM entries WHERE id=3').get().value, "星光's 资料");
  assert.equal(db.prepare("INSERT INTO entries(value) VALUES('next')").run().lastInsertRowid, 21);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); db.close();
  const file = await createFileStore(join(target, 'files')).get('resumes/u1/a.pdf');
  assert.equal(file.customMetadata.visibility, 'private');
  assert.equal(file.customMetadata.owner, 'u1');
  assert.equal(await new Response(file.body).text(), 'private resume');
  await access(join(target, 'restore-complete.json'));
});

test('restore rejects same-count edits of decoded records and private metadata', async t => {
  const { restoreExport } = await import('../scripts/restore-export.mjs');
  const { source, target } = await fixture(t);
  const database = JSON.parse(await readFile(join(source, 'database-complete.json')));
  database.tables.entries.rows[0].value = 'modified credential';
  await writeFile(join(source, 'database-complete.json'), JSON.stringify(database));
  await assert.rejects(restoreExport(source, target), /authenticated|integrity/i);
  await assert.rejects(access(target));
});

test('restore refuses a changed asset before creating destination', async t => {
  const { restoreExport } = await import('../scripts/restore-export.mjs');
  const { source, target } = await fixture(t);
  await writeFile(join(source, 'objects', 'resume.bin'), 'tampered');
  await assert.rejects(restoreExport(source, target), /integrity/i);
  await assert.rejects(access(target));
});

test('restore refuses to overwrite any existing destination', async t => {
  const { restoreExport } = await import('../scripts/restore-export.mjs');
  const { source, target } = await fixture(t);
  await mkdir(target); await writeFile(join(target, 'keep'), 'keep');
  await assert.rejects(restoreExport(source, target), /exist/i);
  assert.equal(await readFile(join(target, 'keep'), 'utf8'), 'keep');
});
