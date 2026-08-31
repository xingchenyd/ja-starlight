import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("publish confirmation reflects actual content completion", async () => {
  const readiness = await import("../lib/services/publish-readiness.ts");
  const empty = readiness.buildPublishReadiness("job", {}, []);
  assert.deepEqual(empty.map((item) => item.complete), [false, false, false]);
  const complete = readiness.buildPublishReadiness("job", {
    title: "产品运营实习生", company: "长沙示范科技有限公司", summary: "参与真实产品项目并完成用户研究与运营复盘。",
    email: "talent@example.com", salaryMin: "120", salaryMax: "200",
    responsibilities: "参与用户访谈\n整理运营数据", requirements: "本科在读\n沟通表达清晰",
  }, []);
  assert.deepEqual(complete.map((item) => item.complete), [true, true, true]);
  const source = await read("../app/workspace/PlatformApp.tsx");
  assert.match(source, /buildPublishReadiness/);
  assert.match(source, /item\.complete\s*\?\s*"✓"\s*:\s*"○"/);
  assert.doesNotMatch(source, /form\.title && form\.summary \? "✓" : "1"/);
});

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
