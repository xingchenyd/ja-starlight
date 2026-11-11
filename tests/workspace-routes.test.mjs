import test from "node:test";
import assert from "node:assert/strict";

test("workspace paths are canonical for every approved student and enterprise module", async () => {
  const routes = await import("../lib/ui/workspace-routes.ts");
  assert.equal(routes.workspacePath("student", "activities"), "/workspace/student/activities");
  assert.equal(routes.workspacePath("enterprise", "registrations", "reg-1"), "/workspace/enterprise/registrations?item=reg-1");
  assert.equal(routes.workspacePath("student", "content", "内容 1"), "/workspace/student/content?item=%E5%86%85%E5%AE%B9%201");
});

test("workspace route normalization prevents cross-role and unknown modules", async () => {
  const routes = await import("../lib/ui/workspace-routes.ts");
  assert.deepEqual(routes.normalizeWorkspaceRoute("student", "registrations"), { role: "student", tab: "overview" });
  assert.deepEqual(routes.normalizeWorkspaceRoute("enterprise", "opportunities"), { role: "enterprise", tab: "overview" });
  assert.deepEqual(routes.normalizeWorkspaceRoute("invalid", "activities"), { role: "student", tab: "activities" });
});

test("legacy workspace query values map to the same canonical destination", async () => {
  const routes = await import("../lib/ui/workspace-routes.ts");
  assert.equal(routes.legacyWorkspacePath({ role: "enterprise", tab: "content", item: "con-7" }), "/workspace/enterprise/content?item=con-7");
  assert.equal(routes.legacyWorkspacePath({ role: "unknown", tab: "keys" }), "/workspace/student/overview");
});

test("sign-in preserves activity links and rejects redirects outside the signed-in role", async () => {
  const { workspaceLoginReturnPath } = await import("../lib/ui/workspace-routes.ts");
  assert.equal(workspaceLoginReturnPath("student", "/workspace/student/activities?item=activity-1"), "/workspace/student/activities?item=activity-1");
  assert.equal(workspaceLoginReturnPath("student", "/campus"), "/campus");
  assert.equal(workspaceLoginReturnPath("enterprise", "/workspace/enterprise/registrations?item=reg-1"), "/workspace/enterprise/registrations?item=reg-1");
  for (const path of ["//example.com", "/\\example.com", "https://example.com", "/workspace/enterprise/profile", "/workspace/student/keys", "/workspace/student/activities/extra"]) {
    assert.equal(workspaceLoginReturnPath("student", path), "/workspace/student/overview");
  }
});
