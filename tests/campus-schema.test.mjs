import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { campusSchema } from '../db/campus-schema.ts';

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('s1'),('s2');");
  for (const sql of campusSchema) db.exec(sql);
  db.exec("INSERT INTO schools(id,name) VALUES('a','A school'),('b','B school')");
  return db;
}
test('campus schema applies idempotently and enforces one verified school relationship per student', () => {
  const db=database();
  for(const sql of campusSchema) db.exec(sql);
  db.exec("INSERT INTO school_memberships(student_id,school_id,status) VALUES('s1','a','verified')");
  assert.throws(()=>db.exec("INSERT INTO school_memberships(student_id,school_id,status) VALUES('s1','b','verified')"),/UNIQUE/);
  assert.throws(()=>db.exec("INSERT INTO school_memberships(student_id,school_id,status) VALUES('s2','missing','verified')"),/FOREIGN KEY/);
  db.close();
});
test('business grants require school scope only for campus partners and forbid duplicate active assignments',()=>{
  const db=database();
  const grant=(id,role,school,status='active')=>db.prepare("INSERT INTO business_grants(id,user_id,role,school_id,status,granted_by) VALUES(?,'s1',?,?,?,'owner')").run(id,role,school,status);
  assert.throws(()=>grant('bad','campus_partner',null),/CHECK/);
  assert.throws(()=>grant('bad','project_lead','a'),/CHECK/);
  grant('one','campus_partner','a');assert.throws(()=>grant('two','campus_partner','a'),/UNIQUE/);
  db.exec("UPDATE business_grants SET status='revoked' WHERE id='one'");
  grant('two','campus_partner','a');grant('review','content_reviewer',null);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM business_grants").get().n,3);db.close();
});
test('only one technical owner row can exist, with unique credential binding',()=>{
  const db=database();
  db.exec("INSERT INTO platform_owner(id,credential_id) VALUES(1,'owner-key')");
  assert.throws(()=>db.exec("INSERT INTO platform_owner(id,credential_id) VALUES(2,'another-key')"),/CHECK/);
  assert.throws(()=>db.exec("INSERT INTO platform_owner(id,credential_id) VALUES(1,'another-key')"),/UNIQUE/);db.close();
});
