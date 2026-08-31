import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("registration ownership distinguishes JA and enterprise publishers", async () => {
  const governance = await import("../lib/services/registration-governance.ts");

  assert.equal(governance.registrationReviewScope("ja:seed"), "ja");
  assert.equal(governance.registrationReviewScope("ja:admin-1"), "ja");
  assert.equal(governance.registrationReviewScope("enterprise-1"), "enterprise");
  assert.equal(governance.canReviewRegistration("ja", "admin-1", "ja:seed"), true);
  assert.equal(governance.canReviewRegistration("ja", "admin-1", "enterprise-1"), false);
  assert.equal(governance.canReviewRegistration("enterprise", "enterprise-1", "enterprise-1"), true);
  assert.equal(governance.canReviewRegistration("enterprise", "enterprise-1", "ja:seed"), false);
});

test("JA console exposes a dedicated registration operations module", async () => {
  const [routes, consoleSource] = await Promise.all([
    import("../lib/ui/ja-routes.ts"),
    readFile(new URL("../app/ja-console/JAConsole.tsx", import.meta.url), "utf8"),
  ]);

  assert.equal(routes.jaConsolePath("registrations"), "/ja-console/registrations");
  assert.match(consoleSource, /星光计划活动报名/);
  assert.match(consoleSource, /function JARegistrationDesk/);
  assert.match(consoleSource, /导出筛选结果/);
  assert.match(consoleSource, /批量通过/);
  assert.match(consoleSource, /批量退回/);
  assert.match(consoleSource, /<SidePanel/);
});

test("registration API routes JA and enterprise decisions through separate scopes", async () => {
  const source = await readFile(
    new URL("../app/api/registrations/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /scope === "ja"/);
  assert.match(source, /requireAdmin/);
  assert.match(source, /canReviewRegistration/);
  assert.match(source, /seedActivities\.find/);
  assert.match(source, /活动不存在或已下线/);
  assert.doesNotMatch(source, /publisherOwnerId === "ja:seed"\s*\n\s*\)/);
});
