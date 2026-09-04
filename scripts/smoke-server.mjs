// Production smoke check: no business records are created or changed.
// Successful logins and logouts create ordinary session/audit records only.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
const [data, configFile] = process.argv.slice(2);
if (!data || !configFile) throw new Error('Usage: smoke-server.mjs DATA PRIVATE_CONFIG');
const config = JSON.parse(await readFile(configFile, 'utf8'));
const db = new DatabaseSync(join(data, 'app.sqlite'), { readOnly: true });
const base = 'http://127.0.0.1:3000';
const headers = { Host: 'star-plan.com', Origin: 'https://star-plan.com', 'X-Forwarded-Host': 'star-plan.com', 'X-Forwarded-Proto': 'https', 'Content-Type': 'application/json' };
const passed = [];
try {
  const home = await fetch(base, { headers });
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes('湘ICP备2026038303号-1'));
  passed.push('home and ICP footer');
  assert.equal((await fetch(base + '/api/admin', { headers: { Host: 'attacker.test', 'x-starlight-role': 'admin' } })).status, 401);
  assert.equal((await fetch(base + '/api/platform', { headers })).status, 401);
  passed.push('anonymous and forged-role access denied');
  for (const role of ['student', 'enterprise', 'admin']) {
    const user = db.prepare('SELECT u.email FROM users u JOIN password_credentials p ON p.user_id=u.id WHERE u.role=? LIMIT 1').get(role);
    const body = role === 'admin' ? { key: config.AUTH_SEED_ADMIN_KEY } : { role, email: user.email, password: config['AUTH_SEED_' + role.toUpperCase() + '_PASSWORD'] };
    const login = await fetch(base + (role === 'admin' ? '/api/admin-auth/login' : '/api/auth/login'), { method: 'POST', headers, body: JSON.stringify(body) });
    assert.equal(login.status, 200, role + ' login');
    assert.match(login.headers.get('set-cookie'), /; Secure(?:;|$)/, role + ' secure cookie behind HTTPS proxy');
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const authenticated = { ...headers, Cookie: cookie };
    const route = role === 'admin' ? '/api/registrations?scope=ja' : role === 'enterprise' ? '/api/registrations?scope=publisher' : '/api/registrations';
    assert.equal((await fetch(base + route, { headers: authenticated })).status, 200, role + ' data');
    if (role === 'student') assert.equal((await fetch(base + '/api/registrations?scope=publisher', { headers: authenticated })).status, 403);
    const logout = await fetch(base + (role === 'admin' ? '/api/admin-auth/logout' : '/api/auth/logout'), { method: 'POST', headers: authenticated, body: '{}' });
    assert.equal(logout.status, 200, role + ' logout');
    passed.push(role + ' original credential, authorized data and logout');
  }
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  passed.push('database integrity');
  console.log(JSON.stringify({ passed }, null, 2));
} finally { db.close(); }
