import assert from "node:assert/strict";
import test from "node:test";

const catalog = await import("../lib/catalog/public-catalog.ts");

test("student jobs tolerate omitted optional arrays and legacy list data", () => {
  const payload = { title: "产品调研", company: "虚构企业", responsibilities: "需求调研\n整理报告", requirements: null, benefits: ["实践", null, {}, ""] };
  const [job] = catalog.mergeCatalogRecords([{ id: "job-without-tags", kind: "job", payload }], [], "job");
  assert.equal(job.tags.join(""), "");
  assert.deepEqual(job.responsibilities, ["需求调研", "整理报告"]);
  assert.deepEqual(job.requirements, []);
  assert.deepEqual(job.benefits, ["实践"]);
  assert.equal(job.company, "虚构企业");
  assert.equal(job.status, "招募中");
  assert.equal(payload.tags, undefined, "normalization must not rewrite stored records");
  assert.deepEqual(catalog.normalizePublicJob({ id: "bad-tags", kind: "job", payload: { tags: {} } }).tags, []);
});

test("public catalog excludes records before publication and after offline time", () => {
  const now = new Date("2026-08-30T10:00:00.000Z");
  assert.equal(catalog.isPublicNow({ reviewStatus: "approved" }, now), true);
  assert.equal(
    catalog.isPublicNow(
      { reviewStatus: "approved", publishAt: "2026-08-31T00:00:00.000Z" },
      now,
    ),
    false,
  );
  assert.equal(
    catalog.isPublicNow(
      { reviewStatus: "approved", offlineAt: "2026-08-30T09:59:00.000Z" },
      now,
    ),
    false,
  );
  assert.equal(catalog.isPublicNow({ reviewStatus: "rejected" }, now), false);
});

test("public records sort by recommendation, operations order and publish date", () => {
  const records = [
    { id: "new", kind: "content", payload: { publishedAt: "2026-08-30" } },
    { id: "ordered", kind: "content", payload: { sortOrder: 8, publishedAt: "2026-08-20" } },
    { id: "featured", kind: "content", payload: { featured: true, sortOrder: 1 } },
  ];
  assert.deepEqual(
    catalog.sortPublicRecords(records).map((record) => record.id),
    ["featured", "ordered", "new"],
  );
});

test("live records replace fallback examples and duplicates are removed", () => {
  const live = [
    { id: "live-1", kind: "job", payload: { title: "真实岗位", company: "真实企业" } },
    { id: "live-2", kind: "job", payload: { title: "真实岗位", company: "真实企业" } },
  ];
  const fallback = [{ id: "demo", title: "示例岗位", company: "示例企业" }];
  assert.deepEqual(
    catalog.mergeCatalogRecords(live, fallback, "job").map((item) => item.id),
    ["live-1"],
  );
  assert.deepEqual(catalog.mergeCatalogRecords([], fallback, "job"), []);
});
