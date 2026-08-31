import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("enterprise publishing opens exact records through canonical workspace items", async () => {
  const source = await read("../app/workspace/PlatformApp.tsx");
  assert.match(source, /initialItem=\{initialItem\}/);
  assert.match(source, /records\.find\(\(record\) => record\.id === initialItem\)/);
  assert.match(source, /onNavigate\(tab,\s*record\.id,\s*true\)/);
  assert.match(source, /onNavigate\(tab,\s*undefined,\s*true\)/);
});

test("publishing center supports draft duplication and recoverable archive language", async () => {
  const source = await read("../app/workspace/PlatformApp.tsx");
  assert.match(source, /复制为草稿/);
  assert.match(source, /（副本）/);
  assert.match(source, /移入归档/);
  assert.match(source, /恢复到发布中心/);
  assert.match(source, /archived=1/);
  assert.doesNotMatch(source, /删除后无法恢复/);
});
