// Exercises only a disposable restored database. Explicit flag prevents accidental production writes.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';
const [base, source, acknowledgement] = process.argv.slice(2);
if (acknowledgement !== '--disposable-database' || !['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('A disposable loopback test server is required');
const secrets = JSON.parse(await readFile(source + '/runtime-secrets.json', 'utf8'));
const snapshot = JSON.parse(await readFile(source + '/database-complete.json', 'utf8'));
const cookies = {};
const passed = [];
const spoofedStatus = await new Promise((resolve, reject) => {
  http.get(base + '/api/admin', { headers: { Host: 'attacker.test', 'x-starlight-role': 'admin' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
});
assert.equal(spoofedStatus, 401, 'Host header must not activate demo authorization');
passed.push('forged test hostname cannot bypass administrator login');
async function call(path, role, method = 'GET', body, status = 200) {
  const headers = { origin: base };
  if (role) headers.cookie = cookies[role];
  if (body && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  const r = await fetch(base + path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  if (r.status !== status) throw new Error(`${method} ${path} expected ${status}, got ${r.status}: ${(await r.text()).slice(0, 250)}`);
  return r;
}
for (const role of ['student', 'enterprise', 'admin']) {
  const user = snapshot.tables.users.rows.find(u => u.role === role && snapshot.tables.password_credentials.rows.some(p => p.user_id === u.id));
  const body = role === 'admin' ? { key: secrets.AUTH_SEED_ADMIN_KEY } : { role, email: user.email, password: secrets['AUTH_SEED_' + role.toUpperCase() + '_PASSWORD'] };
  const r = await call(role === 'admin' ? '/api/admin-auth/login' : '/api/auth/login', null, 'POST', body);
  cookies[role] = r.headers.get('set-cookie').split(';')[0];
  passed.push(role + ' original login');
}
await call('/api/registrations?scope=publisher', 'enterprise');
await call('/api/registrations?scope=ja', 'admin');
await call('/api/registrations?scope=publisher', 'student', 'GET', undefined, 403);
await call('/api/admin', 'student', 'GET', undefined, 401);
await call('/api/platform', null, 'GET', undefined, 401);
passed.push('role isolation');

const id = crypto.randomUUID();
const activity = { title: '迁移验收活动', summary: '仅用于独立副本的迁移验收，不会写入正式运行数据库。', cover: '/media/ja-career-fair.jpg', date: '2099-12-31', deadline: '2099-12-30', capacity: 20, registrationFields: [{ id: 'name', label: '姓名', required: true, type: 'text' }, { id: 'email', label: '邮箱', required: true, type: 'email' }] };
await call('/api/platform', 'enterprise', 'POST', { id, kind: 'activity', payload: activity });
let publicItem = await (await call('/api/catalog?id=' + id, null, 'GET', undefined, 404)).text();
void publicItem;
await call('/api/admin', 'admin', 'POST', { id, decision: 'approved' });
await call('/api/catalog?id=' + id);
const registration = await (await call('/api/registrations', 'student', 'POST', { activityId: id, activityTitle: activity.title, answers: { name: '迁移验收学生', email: 'acceptance@example.invalid' } })).json();
const registrations = await (await call('/api/registrations?scope=publisher', 'enterprise')).json();
assert.ok(registrations.registrations.some(r => r.id === registration.id && r.answers.name === '迁移验收学生'));
await call('/api/registrations', 'enterprise', 'PATCH', { registrationId: registration.id, decision: 'approved' });
const studentRows = await (await call('/api/registrations', 'student')).json();
assert.ok(studentRows.registrations.some(r => r.id === registration.id && r.status === 'approved'));
passed.push('enterprise publish → admin review → student registration → enterprise sees and approves → student receives result');

const bytes = '%PDF-1.4\nDisposable acceptance resume\n%%EOF';
const form = new FormData(); form.set('purpose', 'resume'); form.set('file', new File([bytes], 'acceptance.pdf', { type: 'application/pdf' }));
const uploaded = await (await call('/api/files', 'student', 'POST', form)).json();
assert.equal(uploaded.url, null);
const path = '/api/files?key=' + encodeURIComponent(uploaded.key);
assert.equal(await (await call(path, 'student')).text(), bytes);
await call(path, null, 'GET', undefined, 403);
await call(path, 'enterprise', 'GET', undefined, 403);
passed.push('private resume upload, exact bytes and owner-only download');
await call('/api/auth/logout', 'student', 'POST', {});
await call('/api/platform', 'student', 'GET', undefined, 401);
passed.push('logout revokes session');
console.log(JSON.stringify({ passed }, null, 2));
