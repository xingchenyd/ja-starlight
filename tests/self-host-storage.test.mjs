import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function fixtures(t) {
  const path = await mkdtemp(join(tmpdir(), 'starlight-storage-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('SQLite adapter persists parameterized records and matches D1 return shapes', async t => {
  const { openDatabase } = await import('../server/sqlite.mjs');
  const path = join(await fixtures(t), 'app.sqlite');
  let db = openDatabase(path);
  await db.exec('CREATE TABLE entries(id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT UNIQUE)');
  const stmt = db.prepare('INSERT INTO entries(value) VALUES(?)');
  assert.equal((await stmt.bind("学生's 资料").run()).meta.changes, 1);
  assert.equal((await stmt.bind('second').run()).meta.last_row_id, 2);
  assert.equal(await db.prepare('SELECT * FROM entries WHERE id=?').bind(99).first(), null);
  assert.equal(await db.prepare('SELECT value FROM entries WHERE id=?').bind(1).first('value'), "学生's 资料");
  assert.deepEqual(await db.prepare('SELECT id,value FROM entries WHERE id=2').raw(), [[2, 'second']]);
  assert.equal((await db.prepare('UPDATE entries SET value=? WHERE id=99').bind('unused').run()).meta.changes, 0);
  db.close(); db = openDatabase(path);
  assert.equal((await db.prepare('SELECT * FROM entries').all()).results.length, 2);
  db.close();
});

test('SQLite batch is atomic when a later statement fails', async t => {
  const { openDatabase } = await import('../server/sqlite.mjs');
  const db = openDatabase(join(await fixtures(t), 'app.sqlite'));
  await db.exec('CREATE TABLE entries(id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
  await assert.rejects(db.batch([db.prepare("INSERT INTO entries VALUES(1,'kept?')"), db.prepare('INSERT INTO entries VALUES(2,NULL)')]));
  assert.equal(await db.prepare('SELECT count(*) n FROM entries').first('n'), 0);
  const rows = await db.batch([db.prepare("INSERT INTO entries VALUES(1,'yes')"), db.prepare('SELECT value FROM entries')]);
  assert.equal(rows[1].results[0].value, 'yes');
  db.close();
});

test('disk object store preserves private ownership, bytes and overwrite consistency', async t => {
  const { createFileStore } = await import('../server/files.mjs');
  const path = await fixtures(t), files = createFileStore(path);
  const key = 'resumes/student/original.pdf';
  await files.put(key, new Uint8Array([0, 255, 10, 34]), { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { visibility: 'private', owner: 'student' } });
  let saved = await createFileStore(path).get(key);
  assert.equal(saved.customMetadata.owner, 'student');
  assert.equal(saved.customMetadata.visibility, 'private');
  assert.equal(saved.httpMetadata.contentType, 'application/pdf');
  assert.equal(saved.size, 4);
  assert.deepEqual(new Uint8Array(await new Response(saved.body).arrayBuffer()), new Uint8Array([0,255,10,34]));
  await files.put(key, new TextEncoder().encode('updated'), { customMetadata: { visibility: 'private', owner: 'student' } });
  saved = await files.get(key);
  assert.equal(await new Response(saved.body).text(), 'updated');
  assert.equal(await files.get('missing/file'), null);
});

test('disk object store rejects traversal and does not turn private files public by default', async t => {
  const { createFileStore } = await import('../server/files.mjs');
  const files = createFileStore(await fixtures(t));
  for (const key of ['../secret', '/etc/passwd', 'a/../../b', 'a\\b', '']) {
    await assert.rejects(files.put(key, new Uint8Array([1])));
    await assert.rejects(files.get(key));
  }
  await files.put('legacy/key', new Uint8Array([1]));
  const result = await files.get('legacy/key');
  assert.notEqual(result.customMetadata.visibility, 'public');
  await result.body.cancel();
});

test('retry after interrupted blob write never publishes a partial file', async t => {
  const { createFileStore } = await import('../server/files.mjs');
  const path = await fixtures(t), files = createFileStore(path), bytes = Buffer.from('complete document');
  await mkdir(join(path, 'blobs'));
  await writeFile(join(path, 'blobs', createHash('sha256').update(bytes).digest('hex')), 'incomplete');
  await files.put('resume/retry.pdf', bytes);
  assert.equal(await new Response((await files.get('resume/retry.pdf')).body).text(), 'complete document');
});
