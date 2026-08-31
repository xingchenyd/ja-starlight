import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8");

test("enterprise registration review has filtered export, batches and shared accessible detail", () => {
  assert.match(source, /导出筛选结果/);
  assert.match(source, /批量通过/);
  assert.match(source, /批量退回/);
  assert.match(source, /function RegistrationDetail[\s\S]*?<SidePanel/);
  assert.match(source, /退回时请填写原因/);
});

test("publisher feedback uses shared detail, explicit reply states and retry", () => {
  assert.match(source, /function PublisherFeedbackDesk[\s\S]*?<SidePanel/);
  assert.match(source, /待回复/);
  assert.match(source, /已回复/);
  assert.match(source, /回复已同步到学生端/);
  assert.match(source, /重新加载|重试/);
});
