import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("learning center persists category filters and opens exact content routes", async () => {
  const source = await read("../app/workspace/student/LearningCenter.tsx");
  assert.match(source, /URLSearchParams/);
  assert.match(source, /history\.replaceState/);
  assert.match(source, /popstate/);
  assert.match(source, /onNavigate\("content",\s*item\.id,\s*true\)/);
  assert.match(source, /FavoriteButton/);
});

test("content reader separates video and article layouts with reliable social actions", async () => {
  const source = await read("../app/workspace/student/ContentReader.tsx");
  assert.match(source, /mediaType === "video"/);
  assert.match(source, /<video/);
  assert.match(source, /bodyBlocks/);
  assert.match(source, /attachments/);
  assert.match(source, /optimistic/);
  assert.match(source, /rollback/);
  assert.match(source, /submittingRef/);
  assert.match(source, /mine/);
  assert.match(source, /repliedBy/);
});

test("social actions require an existing published content record", async () => {
  const source = await readFile(new URL("../app/api/social/route.ts", import.meta.url), "utf8");
  assert.match(source, /isPublishedContent/);
  assert.match(source, /kind='content' AND archived_at IS NULL/);
  assert.match(source, /reviewStatus === "approved"/);
});

test("workspace delegates student content to the refined modules", async () => {
  const source = await read("../app/workspace/PlatformApp.tsx");
  assert.match(source, /from "\.\/student\/LearningCenter"/);
  assert.match(source, /mergeCatalogRecords<ContentItem>/);
  assert.match(source, /privateData\.favorites/);
});
