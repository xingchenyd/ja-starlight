import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("student data helpers validate private targets and derive reminders", async () => {
  const service = await import("../lib/services/student.ts");
  assert.equal(service.normalizeFavoriteType("job"), "job");
  assert.equal(service.normalizeFavoriteType("unknown"), null);
  assert.equal(
    service.reminderBefore("2026-09-12T09:00:00+08:00", 24),
    "2026-09-11T01:00:00.000Z",
  );
  assert.equal(service.reminderBefore("not-a-date", 24), null);
});

test("student migration creates favorites, calendar and structured experiences", async () => {
  const directory = new URL("../drizzle/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  const database = new DatabaseSync(":memory:");
  for (const file of files) database.exec(await readFile(new URL(file, directory), "utf8"));
  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'student_%' ORDER BY name")
    .all()
    .map((row) => row.name);
  assert.deepEqual(tables, ["student_calendar_events", "student_experiences", "student_favorites"]);
  database.close();
});

test("student API is session scoped, idempotent and audited", async () => {
  const source = await readFile(new URL("../app/api/student/route.ts", import.meta.url), "utf8");
  assert.match(source, /identity\.role !== "student"/);
  assert.match(source, /ON CONFLICT\(student_id,target_type,target_id\)/);
  assert.match(source, /WHERE student_id=\?/);
  assert.match(source, /writeAudit/);
});

test("activity registration maintains the student's calendar lifecycle", async () => {
  const source = await readFile(new URL("../app/api/registrations/route.ts", import.meta.url), "utf8");
  assert.match(source, /student_calendar_events/);
  assert.match(source, /status='cancelled'/);
  assert.match(source, /workspacePath|\/workspace\/student\/activities/);
});
