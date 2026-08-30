import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("catalog filters serialize into stable public URLs", async () => {
  const { catalogFilterUrl, parseCatalogFilters } = await import(
    "../lib/catalog/catalog-url.ts"
  );

  assert.equal(
    catalogFilterUrl("/opportunities", {
      query: "人工智能",
      category: "技术研发",
    }),
    "/opportunities?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD&category=%E6%8A%80%E6%9C%AF%E7%A0%94%E5%8F%91",
  );
  assert.deepEqual(
    parseCatalogFilters("?q=%E9%9D%92%E5%B9%B4&category=%E8%81%8C%E4%B8%9A%E6%8E%A2%E7%B4%A2"),
    { query: "青年", category: "职业探索" },
  );
});

test("public catalogs restore filters and update history without reload", async () => {
  for (const file of [
    "../app/opportunities/OpportunityCatalog.tsx",
    "../app/activities/ActivityCatalog.tsx",
    "../app/content/ContentCatalog.tsx",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /history\.replaceState/);
    assert.match(source, /popstate/);
    assert.match(source, /initialQuery/);
    assert.match(source, /initialCategory/);
  }
});

test("public detail actions use canonical student workspace routes", async () => {
  for (const file of [
    "../app/activities/[id]/ActivityDetailView.tsx",
    "../app/content/[id]/ContentDetailView.tsx",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /workspacePath\("student"/);
    assert.doesNotMatch(source, /workspace\?role=student/);
  }
});

test("all public navigation returns to the first-class activity directory", async () => {
  for (const file of [
    "../app/opportunities/page.tsx",
    "../app/content/page.tsx",
    "../app/activities/[id]/ActivityDetailView.tsx",
    "../app/activities/[id]/DynamicActivityDetail.tsx",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\/#events/);
    assert.match(source, /\/activities/);
  }
});
