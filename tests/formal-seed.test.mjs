import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = await import("../lib/platform/formal-seed-data.ts");

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
