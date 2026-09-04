import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { join, resolve, dirname } from 'node:path';

const hash = value => createHash('sha256').update(value).digest('hex');
function validateKey(key) {
  if (typeof key !== 'string' || !key || key.length > 1000 || key.startsWith('/') || key.includes('..') || key.includes('\\') || [...key].some(c => c.charCodeAt(0) < 32)) throw new Error('Invalid object key');
}
async function durableWrite(path, bytes) {
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
}
async function durableDirectory(path) {
  // Windows does not expose directory fsync; production runs on Linux.
  if (process.platform === 'win32') return;
  const directory = await open(path, 'r');
  try { await directory.sync(); } finally { await directory.close(); }
}

export function createFileStore(directory) {
  const root = resolve(directory), blobs = join(root, 'blobs'), index = join(root, 'index');
  return {
    async put(key, value, options = {}) {
      validateKey(key);
      await mkdir(blobs, { recursive: true, mode: 0o700 });
      await mkdir(index, { recursive: true, mode: 0o700 });
      await durableDirectory(root);
      await durableDirectory(dirname(root));
      const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
      const digest = hash(bytes), blobPath = join(blobs, digest);
      const temporaryBlob = blobPath + '.' + randomUUID() + '.tmp';
      await durableWrite(temporaryBlob, bytes);
      await rename(temporaryBlob, blobPath);
      await durableDirectory(blobs);
      const metadata = { key, sha256: digest, size: bytes.byteLength, etag: '"' + digest + '"', uploaded: new Date().toISOString(), httpMetadata: options.httpMetadata || {}, customMetadata: options.customMetadata || {} };
      const target = join(index, hash(key) + '.json'), temporary = target + '.' + randomUUID() + '.tmp';
      await durableWrite(temporary, JSON.stringify(metadata));
      await rename(temporary, target);
      await durableDirectory(index);
      return metadata;
    },
    async get(key) {
      validateKey(key);
      let metadata;
      try { metadata = JSON.parse(await readFile(join(index, hash(key) + '.json'), 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
      if (metadata.key !== key || !/^[a-f0-9]{64}$/.test(metadata.sha256)) throw new Error('Invalid object metadata');
      const path = join(blobs, metadata.sha256);
      if ((await stat(path)).size !== metadata.size) throw new Error('Object integrity failure');
      return { ...metadata, body: Readable.toWeb(createReadStream(path)) };
    },
  };
}
