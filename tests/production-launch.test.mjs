import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../server/sqlite.mjs';
import { publicationOrderStatement, compactPublicationOrderStatement, publicationRank } from '../lib/platform/publication-order.ts';
import { ensureLaunchMigration } from '../lib/platform/launch-migration.ts';
import { planSampleCleanup, applySampleCleanup } from '../scripts/sample-cleanup.mjs';

async function database() {
  const db = openDatabase(':memory:');
  await db.exec("CREATE TABLE workspace_records(id TEXT PRIMARY KEY,owner_id TEXT,kind TEXT,payload TEXT,version INTEGER DEFAULT 1,archived_at TEXT,published_at TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE system_migrations(id TEXT PRIMARY KEY)");
  return db;
}
async function add(db,id,rank,kind='content',status='approved',owner='ja:real') {
  await db.prepare('INSERT INTO workspace_records(id,owner_id,kind,payload) VALUES(?,?,?,?)').bind(id,owner,kind,JSON.stringify({title:id,sortOrder:rank,reviewStatus:status})).run();
}
async function positions(db,kind='content') {
  return (await db.prepare("SELECT id,json_extract(payload,'$.sortOrder') AS rank FROM workspace_records WHERE kind=? AND archived_at IS NULL AND json_extract(payload,'$.reviewStatus')='approved' ORDER BY rank").bind(kind).all()).results.map(row=>[row.id,row.rank]);
}

test('rank 2 insertion shifts old 2 and 3, moving closes gaps and columns remain independent',async()=>{
  const db=await database();
  try {
    for(const [id,rank] of [['one',1],['two',2],['three',3]])await add(db,id,rank);
    await add(db,'activity',1,'activity');
    await add(db,'new',0);
    await db.batch([publicationOrderStatement(db,'content','new',2)]);
    assert.deepEqual(await positions(db),[['one',1],['new',2],['two',3],['three',4]]);
    await db.batch([publicationOrderStatement(db,'content','three',1)]);
    assert.deepEqual(await positions(db),[['three',1],['one',2],['new',3],['two',4]]);
    await add(db,'auto',0);
    await db.batch([publicationOrderStatement(db,'content','auto',null)]);
    assert.deepEqual((await positions(db)).at(-1),['auto',5]);
    await db.batch([db.prepare("UPDATE workspace_records SET archived_at=CURRENT_TIMESTAMP WHERE id='new'"),compactPublicationOrderStatement(db,'content')]);
    assert.deepEqual(await positions(db),[['three',1],['one',2],['two',3],['auto',4]]);
    assert.deepEqual(await positions(db,'activity'),[['activity',1]]);
  } finally { db.close(); }
});

test('invalid ranks are rejected and failed writes roll back rank changes',async()=>{
  for(const value of [-1,1.2,'bad',Infinity,1000001])assert.throws(()=>publicationRank(value));
  assert.equal(publicationRank('2'),2);assert.equal(publicationRank(''),null);
  const db=await database();try{
    await add(db,'one',1);await add(db,'two',2);
    await assert.rejects(db.batch([publicationOrderStatement(db,'content','two',1),db.prepare("SELECT json('publication-write-conflict')")]));
    assert.deepEqual(await positions(db),[['one',1],['two',2]]);
  }finally{db.close();}
});

test('migration preserves old ordering, directly publishes platform pending records and runs once',async()=>{
  const db=await database();try{
    await add(db,'higher',88);await add(db,'lower',30);
    await add(db,'platform',10,'activity','pending');
    await add(db,'enterprise',9,'activity','pending','real-enterprise');
    await add(db,'draft',8,'activity','draft');
    await Promise.all([ensureLaunchMigration(db),ensureLaunchMigration(db)]);
    assert.deepEqual(await positions(db),[['higher',1],['lower',2]]);
    assert.deepEqual(await positions(db,'activity'),[['platform',1]]);
    await ensureLaunchMigration(db);
    assert.deepEqual(await positions(db),[['higher',1],['lower',2]]);
    assert.equal(JSON.parse((await db.prepare("SELECT payload FROM workspace_records WHERE id='enterprise'").first()).payload).reviewStatus,'pending');
    assert.equal(JSON.parse((await db.prepare("SELECT payload FROM workspace_records WHERE id='draft'").first()).payload).reviewStatus,'draft');
  }finally{db.close();}
});

test('sample cleanup removes only known fixtures and their related records, preserves real accounts and admin keys',async()=>{
  const source=await readFile(new URL('../db/runtime.ts',import.meta.url),'utf8');
  const schema=source.match(/const coreSchema = \[([\s\S]*?)\r?\n\];/)[1];
  const sqls=[...schema.matchAll(/^\s*("(?:[^"\\]|\\.)*"),?\s*$/gm)].map(match=>JSON.parse(match[1]));
  const db=new DatabaseSync(':memory:');try{
    for(const sql of sqls)db.exec(sql);
    for(const [id,email,role] of [['real','person@real-company.com','student'],['seed','student@starlight-hunan.cn','student'],['business','hr@real-company.com','enterprise']])db.prepare('INSERT INTO users(id,email,name,role,status) VALUES(?,?,?,?,?)').run(id,email,id,role,'active');
    db.prepare("INSERT INTO admin_credentials(id,label,key_prefix,secret_hash,status,created_by) VALUES('admin','真实管理员','key','retained-hash','active','system')").run();
    const insert=db.prepare('INSERT INTO workspace_records(id,owner_id,kind,payload) VALUES(?,?,?,?)');
    insert.run('formal-act-01','ja:formal','activity','{"title":"预置活动"}');
    insert.run('real-record','business','content','{"title":"正式企业发布","reviewStatus":"approved","sortOrder":3}');
    insert.run('ambiguous','business','activity','{"title":"产品测试实践"}');
    insert.run('seed-owned','seed','student-profile','{"name":"内测资料"}');
    db.prepare("INSERT INTO activity_registrations(id,activity_id,activity_title,student_owner_id,publisher_owner_id,answers) VALUES('fixture-signup','formal-act-01','预置活动','real','ja:formal','{}')").run();
    db.prepare("INSERT INTO student_experiences(id,student_id,source_type,source_id,category,title,occurred_at) VALUES('from-sample','real','platform','fixture-signup','活动','预置活动','2026-09-01')").run();
    db.prepare("INSERT INTO student_experiences(id,student_id,category,title,occurred_at) VALUES('real-growth','real','学生项目','真实经历','2026-10-13')").run();
    const plan=planSampleCleanup(db);
    assert.deepEqual(plan.reviewCandidates.map(row=>row.id),['ambiguous']);
    applySampleCleanup(db,plan);
    assert.deepEqual(db.prepare('SELECT id FROM users ORDER BY id').all().map(row=>row.id),['business','real']);
    assert.deepEqual(db.prepare('SELECT id FROM workspace_records ORDER BY id').all().map(row=>row.id),['ambiguous','real-record']);
    const retained=JSON.parse(db.prepare("SELECT payload FROM workspace_records WHERE id='real-record'").get().payload);
    assert.equal(retained.title,'正式企业发布');assert.equal(retained.sortOrder,1);
    assert.deepEqual(db.prepare('SELECT id FROM student_experiences').all().map(row=>row.id),['real-growth']);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM activity_registrations').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admin_credentials').get().n,1);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    const stale=planSampleCleanup(db);insert.run('new-real','business','job','{}');
    assert.throws(()=>applySampleCleanup(db,stale),/Database changed/);
    assert.ok(db.prepare("SELECT id FROM workspace_records WHERE id='new-real'").get());
  }finally{db.close();}
});
