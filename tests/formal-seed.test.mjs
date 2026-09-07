import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const data = await import("../lib/platform/formal-seed-data.ts");
const { ensureFormalPlatformData } = await import("../lib/platform/ensure-formal-data.ts");

function memoryDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL, archived_at TEXT, published_at TEXT, updated_at TEXT NOT NULL);
    CREATE TABLE student_experiences (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT, category TEXT NOT NULL, title TEXT NOT NULL, role TEXT NOT NULL, description TEXT NOT NULL, output TEXT NOT NULL, evidence_url TEXT NOT NULL, evidence_asset_key TEXT NOT NULL, occurred_at TEXT NOT NULL, certified INTEGER NOT NULL, is_public INTEGER NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE activity_registrations (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL, activity_title TEXT NOT NULL, student_owner_id TEXT NOT NULL, publisher_owner_id TEXT NOT NULL, answers TEXT NOT NULL, status TEXT NOT NULL, review_note TEXT NOT NULL, reviewed_at TEXT, updated_at TEXT NOT NULL, cancelled_at TEXT, attendance_status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE organizations (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, credit_code TEXT NOT NULL, verification_status TEXT NOT NULL, verified_by TEXT, verified_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  `);
  const adapter = {
    prepare(sql) {
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() { return sqlite.prepare(sql).get(...this.values) || null; },
        async run() { return sqlite.prepare(sql).run(...this.values); },
      };
    },
    async batch(statements) { for (const statement of statements) await statement.run(); },
  };
  return { sqlite, adapter };
}

test("formal seed contains rich Hunan business content and registrations", () => {
  assert.ok(data.formalRecords.filter((item) => item.kind === "job").length >= 12);
  assert.ok(data.formalRecords.filter((item) => item.kind === "activity").length >= 8);
  assert.ok(data.formalRecords.filter((item) => item.kind === "content").length >= 10);
  assert.ok(data.formalRegistrations.length >= 15);
  assert.ok(data.formalRegistrations.some((item) => item.publisher === "enterprise"));
  assert.ok(data.formalRegistrations.some((item) => item.publisher === "starlight"));
  assert.ok(new Set(data.formalRegistrations.map((item) => item.status)).size >= 4);
  for (const record of data.formalRecords) assert.match(String(record.payload.region || record.payload.city || record.payload.place), /湖南|长沙/);
});

test("formal seed initialization is idempotent and preserves edited payloads", async () => {
  const source = await readFile(new URL("../lib/platform/ensure-formal-data.ts", import.meta.url), "utf8");
  assert.match(source, /ON CONFLICT\(id\) DO NOTHING/);
  assert.match(source, /ensureFormalPlatformData/);
  assert.doesNotMatch(source, /演示数据|测试数据|Demo/);
});

test("formal seed reconciles early demo ownership into authenticated accounts", async () => {
  const source = await readFile(new URL("../lib/platform/ensure-formal-data.ts", import.meta.url), "utf8");
  assert.match(source, /UPDATE student_experiences SET student_id=\?/);
  assert.match(source, /UPDATE activity_registrations SET student_owner_id=\?/);
  assert.match(source, /UPDATE activity_registrations SET publisher_owner_id=\?/);
});

test("formal seed prefers the official test accounts over older historical accounts", async () => {
  const { sqlite, adapter } = memoryDatabase();
  const insert = sqlite.prepare("INSERT INTO users(id,email,role,status,created_at) VALUES(?,?,?,?,?)");
  insert.run("old-student", "student-demo@ja-starlight.test", "student", "active", "2026-08-01");
  insert.run("old-enterprise", "enterprise-demo@ja-starlight.test", "enterprise", "active", "2026-08-01");
  insert.run("official-student", "student@starlight-hunan.cn", "student", "active", "2026-09-01");
  insert.run("official-enterprise", "enterprise@starlight-hunan.cn", "enterprise", "active", "2026-09-01");

  await ensureFormalPlatformData(adapter);

  assert.equal(sqlite.prepare("SELECT owner_id FROM workspace_records WHERE id='formal-job-01'").get().owner_id, "official-enterprise");
  assert.equal(sqlite.prepare("SELECT owner_id FROM workspace_records WHERE id='formal-student-profile'").get().owner_id, "official-student");
  assert.equal(sqlite.prepare("SELECT student_id FROM student_experiences WHERE id='formal-experience-01'").get().student_id, "official-student");
  assert.equal(sqlite.prepare("SELECT student_owner_id FROM activity_registrations WHERE id='formal-registration-01'").get().student_owner_id, "official-student");
  assert.equal(sqlite.prepare("SELECT publisher_owner_id FROM activity_registrations WHERE id='formal-registration-02'").get().publisher_owner_id, "official-enterprise");
  sqlite.close();
});
