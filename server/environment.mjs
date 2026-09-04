import { resolve, join } from 'node:path';
import { openDatabase } from './sqlite.mjs';
import { createFileStore } from './files.mjs';

let database, files;
const allowed = new Set(['AUTH_PEPPER', 'AUTH_SEED_ADMIN_KEY', 'AUTH_SEED_STUDENT_PASSWORD', 'AUTH_SEED_ENTERPRISE_PASSWORD', 'AUTH_TRUSTED_ORIGINS', 'STARLIGHT_TEST_MODE', 'RESEND_API_KEY', 'MAIL_FROM', 'MAIL_REPLY_TO']);
function dataRoot() {
  if (!process.env.STARLIGHT_DATA_DIR) throw new Error('STARLIGHT_DATA_DIR is required');
  return resolve(process.env.STARLIGHT_DATA_DIR);
}
// Lazy initialization avoids opening or creating databases during static builds.
export const env = new Proxy({}, {
  get(_target, key) {
    if (key === 'STARLIGHT_RUNTIME') return 'node';
    if (key === 'DB') return database ??= openDatabase(join(dataRoot(), 'app.sqlite'));
    if (key === 'FILES') return files ??= createFileStore(join(dataRoot(), 'files'));
    if (allowed.has(key)) return process.env[key];
    return undefined;
  },
});
