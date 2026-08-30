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
