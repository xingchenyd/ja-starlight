import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const share = await import("../lib/services/student-share.ts");

test("share duration accepts only supported expiry windows", () => {
  assert.equal(share.normalizeShareDays(7), 7);
  assert.equal(share.normalizeShareDays("90"), 90);
  assert.equal(share.normalizeShareDays(365), 30);
});

test("public growth profile excludes private contact and resume fields", () => {
  const result = share.sanitizePublicGrowthProfile({
    name: "张晨", school: "湖南大学", major: "工商管理", grade: "2027届",
    headline: "产品与青年发展", bio: "介绍", skills: "调研,策划", awards: "校级奖项",
    phone: "13800000000", email: "private@example.com", resumeKey: "private.pdf", extra: "hidden",
  }, [
    { id: "public", title: "公开经历", isPublic: 1, evidenceAssetKey: "secret" },
    { id: "private", title: "私密经历", isPublic: 0 },
  ]);
  assert.equal(result.profile.name, "张晨");
  assert.equal(result.experiences.length, 1);
  assert.equal(result.experiences[0].title, "公开经历");
  assert.equal("phone" in result.profile, false);
  assert.equal("email" in result.profile, false);
  assert.equal("resumeKey" in result.profile, false);
  assert.equal("evidenceAssetKey" in result.experiences[0], false);
});

test("application mail includes the standalone growth profile and attachment reminder", () => {
  const body = share.buildApplicationMailBody("产品运营实习生", "https://example.com/growth/share/id.secret");
  assert.match(body, /产品运营实习生/);
  assert.match(body, /公开成长档案/);
  assert.match(body, /https:\/\/example\.com\/growth\/share\/id\.secret/);
  assert.match(body, /PDF 简历/);
});

test("share routes and controls are present", async () => {
  const [schema, runtime, api, publicApi, profile, opportunity] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/student/share/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/public/growth/[token]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace/student/StudentProfile.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace/student/OpportunityBrowser.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /studentProfileShares/);
  assert.match(runtime, /student_profile_shares/);
  assert.match(api, /hashOpaqueToken/);
  assert.match(api, /expiresAt/);
  assert.match(publicApi, /getPublicGrowthProfile/);
  assert.match(profile, /StudentSharePanel/);
  assert.match(opportunity, /buildApplicationMailBody/);
  assert.match(opportunity, /\/api\/student\/share/);
});
