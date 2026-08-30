import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("student overview is a dedicated module with exact recent-content limits", async () => {
  const source = await readFile(new URL("../app/workspace/student/StudentOverview.tsx", import.meta.url), "utf8");
  assert.match(source, /slice\(0,\s*5\)/);
  assert.equal((source.match(/slice\(0,\s*3\)/g) || []).length >= 3, true);
  assert.match(source, /workspacePath\("student"/);
  assert.match(source, /initialItem|itemId/);
  assert.doesNotMatch(source, /growth-tree|柱状图|GrowthMap/);
});

test("student overview exposes private grouped favorites and resilient states", async () => {
  const [overview, favorites] = await Promise.all([
    readFile(new URL("../app/workspace/student/StudentOverview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace/student/FavoritesPanel.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(overview, /我的收藏/);
  assert.match(overview, /重新加载/);
  assert.match(overview, /skeleton/i);
  assert.match(favorites, /SidePanel/);
  assert.match(favorites, /实习项目机会/);
  assert.match(favorites, /成长活动/);
  assert.match(favorites, /成长内容/);
  assert.match(favorites, /已下线/);
});

test("workspace shell delegates the student overview to its module", async () => {
  const source = await readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8");
  assert.match(source, /from "\.\/student\/StudentOverview"/);
  assert.match(source, /useStudentData/);
});
