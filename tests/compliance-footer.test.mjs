import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public homepage displays the approved ICP filing and operator contact", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /湘ICP备2026038303号-1/);
  assert.match(source, /https:\/\/beian\.miit\.gov\.cn\//);
  assert.match(source, /ruthyanghao@hotmail\.com/);
  assert.match(source, /主办者：杨浩/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noreferrer"/);
  assert.doesNotMatch(source, /51bc4326d9c361f163e6f730af1ad7e3/);
});
