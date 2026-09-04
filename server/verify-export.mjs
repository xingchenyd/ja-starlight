import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createPrivateKey, privateDecrypt, createDecipheriv, createHash, constants } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { join } from 'node:path';

// Check the decoded input against the authenticated encrypted frames, not only row totals.
// This runs locally; the migration private key is never needed on the destination server.
export async function verifyDecodedExport(source, snapshot, assets) {
  const secret = JSON.parse(await readFile(join(source, 'transfer-private.json'), 'utf8'));
  const privateKey = createPrivateKey({ key: Buffer.from(secret.privateKey, 'base64'), type: 'pkcs8', format: 'der' });
  const lines = createInterface({ input: createReadStream(join(source, 'export.encrypted.ndjson')), crlfDelay: Infinity });
  let header, aes, seq = 0, database, current, complete, fileCount = 0;
  try {
    for await (const line of lines) {
      const value = JSON.parse(line);
      if (!header) {
        if (value.format !== 'star-plan-transfer-v1') throw new Error('Authenticated export format mismatch');
        header = value;
        aes = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(value.wrappedKey, 'base64'));
        continue;
      }
      if (complete || value.seq !== seq) throw new Error('Authenticated export sequence mismatch');
      const data = Buffer.from(value.data, 'base64'), cipher = createDecipheriv('aes-256-gcm', aes, Buffer.from(value.iv, 'base64'));
      cipher.setAAD(Buffer.from(header.transferId + ':' + seq++)); cipher.setAuthTag(data.subarray(-16));
      const frame = JSON.parse(Buffer.concat([cipher.update(data.subarray(0, -16)), cipher.final()]).toString());
      if (frame.type === 'environment') {
        const environment = JSON.parse(await readFile(join(source, 'runtime-secrets.json'), 'utf8'));
        if (!isDeepStrictEqual(frame.values, environment)) throw new Error('Authenticated configuration mismatch');
      } else if (frame.type === 'database') {
        if (database) throw new Error('Duplicate authenticated database');
        const actual = { ...snapshot, type: 'database' };
        if (!isDeepStrictEqual(frame, actual)) throw new Error('Authenticated database integrity mismatch');
        database = true;
      } else if (frame.type === 'file-start') {
        if (current) throw new Error('Nested authenticated file');
        const asset = assets.find(a => a.key === frame.key);
        if (!asset || ['key', 'size', 'httpMetadata', 'customMetadata', 'etag'].some(k => !isDeepStrictEqual(asset[k], frame[k]))) throw new Error('Authenticated file metadata integrity mismatch');
        current = { key: frame.key, asset, offset: 0, hash: createHash('sha256') };
      } else if (frame.type === 'file-chunk') {
        if (!current || current.key !== frame.key || current.offset !== frame.offset) throw new Error('Authenticated file sequence mismatch');
        const bytes = Buffer.from(frame.data, 'base64'); current.hash.update(bytes); current.offset += bytes.length;
      } else if (frame.type === 'file-end') {
        if (!current || current.key !== frame.key || frame.size !== current.offset || current.asset.size !== current.offset || current.asset.sha256 !== current.hash.digest('hex')) throw new Error('Authenticated file integrity mismatch');
        fileCount++; current = null;
      } else if (frame.type === 'complete') complete = frame;
      else throw new Error('Unknown authenticated frame');
    }
    if (!complete || !database || current || fileCount !== assets.length || complete.fileCount !== fileCount) throw new Error('Authenticated export incomplete');
  } finally { lines.close(); }
}
