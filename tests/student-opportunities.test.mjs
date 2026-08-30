import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("student opportunity filters have a stable round-trip URL contract", async () => {
  const { parseStudentOpportunityFilters, studentOpportunityUrl } = await import("../lib/catalog/student-opportunity-url.ts");
  const filters = {
    query: "产品",
    category: "产品运营",
    degree: "本科",
    industry: "互联网AI",
    salaryMin: 120,
    salaryMax: 380,
    sort: "salary-high",
  };
  const url = studentOpportunityUrl(filters, "job-1");
  assert.match(url, /^\/workspace\/student\/opportunities\?/);
  assert.deepEqual(parseStudentOpportunityFilters(new URL(`https://example.com${url}`).search), filters);
  assert.match(url, /item=job-1/);
  assert.deepEqual(parseStudentOpportunityFilters(""), {
    query: "",
    category: "全部类别",
    degree: "全部学历",
    industry: "全部行业",
    salaryMin: 0,
    salaryMax: 500,
    sort: "latest",
  });
});

test("opportunity browser implements expandable filters, debounce and active chips", async () => {
  const source = await readFile(new URL("../app/workspace/student/OpportunityBrowser.tsx", import.meta.url), "utf8");
  assert.match(source, /300/);
  assert.match(source, /history\.replaceState/);
  assert.match(source, /popstate/);
  assert.match(source, /active-filter-chips/);
  assert.match(source, /salary-dual-slider/);
  assert.match(source, /step="1"/);
  assert.match(source, /max="500"/);
  assert.match(source, /Set<string>/);
});

test("opportunity cards use direct email, public company pages, favorites and side panels", async () => {
  const source = await readFile(new URL("../app/workspace/student/OpportunityBrowser.tsx", import.meta.url), "utf8");
  assert.match(source, /FavoriteButton/);
  assert.match(source, /mailto:/);
  assert.match(source, /复制邮箱/);
  assert.match(source, /\/companies\//);
  assert.match(source, /SidePanel/);
  assert.doesNotMatch(source, /申请岗位|站内投递|立即申请/);
});

test("workspace delegates student opportunities to the dedicated module", async () => {
  const source = await readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8");
  assert.match(source, /from "\.\/student\/OpportunityBrowser"/);
});
