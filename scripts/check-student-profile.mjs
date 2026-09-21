// Isolated local acceptance only. Never writes to a public or production origin.
import assert from 'node:assert/strict';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const base = process.argv[2] || 'http://localhost:3012';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local acceptance origin required');
const headers = { 'content-type': 'application/json', origin: base };
async function register(email) {
  const response = await fetch(base + '/api/auth/register', { method: 'POST', headers, body: JSON.stringify({ email, password: 'LocalCheck2026!', role: 'student' }) });
  assert.equal(response.status, 201, await response.clone().text());
  return { ...headers, cookie: response.headers.get('set-cookie').split(';')[0] };
}
const primary = await register('profile-check@example.test');
const other = await register('profile-other@example.test');
const initial = await (await fetch(base + '/api/platform', { headers: primary })).json();
assert.deepEqual(initial.records, [], 'new student must have no sample profile');
const profile = { name: '资料验收同学', school: '验收大学', major: '计算机科学', grade: '2028届', skills: 'Python', email: 'profile-check@example.test' };
let saved = await fetch(base + '/api/platform', { method: 'POST', headers: primary, body: JSON.stringify({ kind: 'student-profile', payload: profile }) });
assert.equal(saved.status, 200, await saved.clone().text());
const record = await saved.json();
assert.equal((await fetch(base + '/api/platform', { method: 'POST', headers: primary, body: JSON.stringify({ kind: 'student-profile', payload: profile }) })).status, 409);
assert.equal((await fetch(base + '/api/platform', { method: 'POST', headers: other, body: JSON.stringify({ kind: 'student-profile', id: record.id, payload: profile }) })).status, 403);
saved = await fetch(base + '/api/platform', { method: 'POST', headers: primary, body: JSON.stringify({ kind: 'student-profile', id: record.id, version: record.version, payload: { ...profile, bio: '连续输入之后保存的完整自我介绍' } }) });
assert.equal(saved.status, 200);
assert.equal((await fetch(base + '/api/platform', { method: 'POST', headers: primary, body: JSON.stringify({ kind: 'student-profile', id: record.id, version: record.version, payload: profile }) })).status, 409);
const reread = await (await fetch(base + '/api/platform', { headers: primary })).json();
assert.equal(reread.records[0].payload.bio, '连续输入之后保存的完整自我介绍');
const lines = ['Name: Resume Student', 'School: Example University', 'Major: Computer Science', 'Grade: 2028', 'Email: resume@example.test', 'Phone: 13812345678', 'Skills: Python, SQL', 'Awards: First prize', 'Summary: I enjoy research and collaboration.'];
const stream = 'BT /F1 12 Tf 50 760 Td 18 TL\n' + lines.map((line, i) => `${i ? 'T* ' : ''}(${line}) Tj`).join('\n') + '\nET';
const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
let pdf = '%PDF-1.4\n', offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
const folder = await mkdtemp(join(tmpdir(), 'star-plan-resume-fixture-'));
const path = join(folder, 'resume-acceptance.pdf');
await writeFile(path, pdf);
console.log(JSON.stringify({ passed: ['empty new profile', 'save and reread', 'duplicate protection', 'cross-account denial', 'version conflict protection'], fixture: path, localBrowserAccount: 'profile-check@example.test' }, null, 2));
