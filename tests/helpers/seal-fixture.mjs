import { generateKeyPairSync, publicEncrypt, randomBytes, createCipheriv, createHash, constants } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function sealFixture(source, database, assets, bytes) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const aes = randomBytes(32), transferId = 'test-transfer';
  const lines = [JSON.stringify({ format: 'star-plan-transfer-v1', transferId, wrappedKey: publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, aes).toString('base64') })];
  const frames = [{ ...database, type: 'database' }, ...assets.flatMap(a => [{ type: 'file-start', key: a.key, size: a.size, httpMetadata: a.httpMetadata, customMetadata: a.customMetadata }, { type: 'file-chunk', key: a.key, offset: 0, data: bytes.toString('base64') }, { type: 'file-end', key: a.key, size: bytes.length }]), { type: 'complete', tableCount: 1, rowCount: 1, fileCount: 1, fileBytes: bytes.length }];
  for (const [seq, frame] of frames.entries()) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', aes, iv);
    cipher.setAAD(Buffer.from(transferId + ':' + seq));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(frame)), cipher.final(), cipher.getAuthTag()]);
    lines.push(JSON.stringify({ seq, iv: iv.toString('base64'), data: encrypted.toString('base64') }));
  }
  const archive = lines.join('\n') + '\n';
  await writeFile(join(source, 'export.encrypted.ndjson'), archive);
  await writeFile(join(source, 'transfer-private.json'), JSON.stringify({ privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64') }));
  await writeFile(join(source, 'verified-summary.json'), JSON.stringify({ tableCount: 1, rowCount: 1, fileCount: 1, fileBytes: bytes.length, encryptedSha256: createHash('sha256').update(archive).digest('hex') }));
}
