import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("homepage sections stay concise and link to complete public directories", async () => {
  const source = await readFile(
    new URL("../app/HomeSections.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /slice\(0,\s*3\)/);
  assert.match(source, /href="\/opportunities"/);
  assert.match(source, /href="\/activities"/);
  assert.match(source, /href="\/content"/);
  assert.doesNotMatch(source, /expanded|home-more/);
});

test("public activity directory exists as a first-class route", async () => {
  const page = await readFile(
    new URL("../app/activities/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /ActivityCatalog/);
});

test("homepage exposes both filing records through official query links", async () => {
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /湘ICP备2026038303号-1/);
  assert.match(page, /https:\/\/beian\.miit\.gov\.cn\//);
  assert.match(page, /湘公网安备43012102001418号/);
  assert.match(page, /https:\/\/beian\.mps\.gov\.cn\/#\/query\/webSearch\?code=43012102001418/);
});
