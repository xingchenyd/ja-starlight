// Full product acceptance against an isolated loopback database only.
import assert from "node:assert/strict";

const [base, acknowledgement] = process.argv.slice(2);
if (acknowledgement !== "--disposable-database" || !["127.0.0.1", "localhost"].includes(new URL(base).hostname)) {
  throw new Error("A disposable loopback test server is required");
}

const credentials = {
  student: { email: "student@starlight-hunan.cn", password: "StudentAudit2026!" },
  enterprise: { email: "enterprise@starlight-hunan.cn", password: "EnterpriseAudit2026!" },
  admin: { key: "STARLIGHT-LocalAuditAdminKey-20260921-Only" },
};
const cookies = {};
const passed = [];
const headersFor = (role, json = true) => ({
  origin: base,
  ...(role ? { cookie: cookies[role] } : {}),
  ...(json ? { "content-type": "application/json" } : {}),
});
async function call(path, role, method = "GET", body, status = 200) {
  const response = await fetch(base + path, {
    method,
    headers: headersFor(role, !(body instanceof FormData)),
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  if (response.status !== status) throw new Error(`${method} ${path} expected ${status}, got ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response;
}
async function json(path, role, method = "GET", body, status = 200) {
  return (await call(path, role, method, body, status)).json();
}

for (const role of ["student", "enterprise", "admin"]) {
  const endpoint = role === "admin" ? "/api/admin-auth/login" : "/api/auth/login";
  const payload = role === "admin" ? credentials.admin : { role, ...credentials[role] };
  const response = await call(endpoint, null, "POST", payload);
  cookies[role] = response.headers.get("set-cookie").split(";")[0];
  assert.ok(cookies[role]);
}
passed.push("student, enterprise and operations authentication");

await call("/api/platform", null, "GET", undefined, 401);
await call("/api/admin", "student", "GET", undefined, 401);
await call("/api/registrations?scope=publisher", "student", "GET", undefined, 403);
passed.push("anonymous and cross-role access isolation");

const profileRecords = await json("/api/platform?kind=student-profile", "student");
assert.equal(profileRecords.records.length, 0);
const studentProfile = {
  name: "验收学生", school: "中南大学", major: "计算机科学与技术", grade: "2028届",
  headline: "用真实项目持续成长", bio: "完整功能验收专用资料。", skills: "产品调研、数据分析",
  awards: "校级创新项目一等奖", phone: "13812345678", email: "student-audit@example.test",
  resumeKey: "", resumeName: "",
};
const profileSaved = await json("/api/platform", "student", "POST", { id: "audit-student-profile", kind: "student-profile", payload: studentProfile });
const profileRead = await json("/api/platform?kind=student-profile", "student");
assert.equal(profileRead.records[0].payload.name, studentProfile.name);
assert.equal(profileRead.records[0].version, profileSaved.version);
passed.push("student profile create and durable readback");

const enterpriseProfile = {
  name: "长沙全链路验收科技有限公司", industry: "互联网AI", intro: "这是一家用于隔离数据库全链路验收的企业主体，验证资料认证、内容发布和报名管理流程。",
  contactName: "验收负责人", contactPhone: "13800000000", contactEmail: "enterprise-audit@example.test",
  creditCode: "91430100MA4AUDIT01", city: "长沙",
};
await json("/api/platform", "enterprise", "POST", { id: "audit-enterprise-profile", kind: "enterprise-profile", payload: enterpriseProfile });
await call("/api/platform", "enterprise", "POST", { id: "audit-job-before-verification", kind: "job", payload: { title: "认证前岗位", company: enterpriseProfile.name, jobCategory: "产品运营", contactEmail: enterpriseProfile.contactEmail, responsibilities: ["职责一", "职责二"], requirements: ["要求一", "要求二"] } }, 403);
const adminState = await json("/api/admin", "admin");
const organization = adminState.organizations.find((item) => item.name === enterpriseProfile.name);
assert.ok(organization);
await json("/api/admin", "admin", "POST", { action: "verify-organization", organizationId: organization.id, decision: "approved" });
passed.push("enterprise profile, pre-verification block and operations verification");

const jobId = "audit-job-full-flow", activityId = "audit-activity-full-flow", contentId = "audit-content-full-flow";
await json("/api/platform", "enterprise", "POST", { id: jobId, kind: "job", payload: {
  title: "青年产品研究实习生", company: enterpriseProfile.name, summary: "参与真实青年产品研究项目。", jobCategory: "产品运营", industry: "互联网AI", degree: "本科",
  contactEmail: enterpriseProfile.contactEmail, responsibilities: ["参与用户访谈", "整理研究结论"], requirements: ["表达清晰", "能够持续复盘"], salaryMin: 150, salaryMax: 220,
} });
await json("/api/catalog?id=" + jobId, null);

await json("/api/platform", "enterprise", "POST", { id: activityId, kind: "activity", payload: {
  title: "青年产品共创工作坊", summary: "围绕真实产品课题完成一次完整的用户研究与方案共创。", cover: "/media/ja-career-fair.jpg", date: "2099-10-20", deadline: "2099-10-19", capacity: 30,
  registrationFields: [{ id: "name", label: "姓名", required: true, type: "text" }, { id: "email", label: "邮箱", required: true, type: "email" }],
} });
await call("/api/catalog?id=" + activityId, null, "GET", undefined, 404);
await json("/api/admin", "admin", "POST", { id: activityId, decision: "approved" });
await json("/api/catalog?id=" + activityId, null);

await json("/api/platform", "enterprise", "POST", { id: contentId, kind: "content", payload: {
  title: "如何完成一次可信的用户研究", summary: "从问题定义、访谈记录到结论表达，形成可以展示的成长成果。", cover: "/media/ja-roundtable.jpg", category: "技能成长", mediaType: "article",
  blocks: [{ type: "heading", text: "确定问题" }, { type: "paragraph", text: "先明确要解决的真实问题，再选择研究方法。" }],
} });
await call("/api/catalog?id=" + contentId, null, "GET", undefined, 404);
await json("/api/admin", "admin", "POST", { id: contentId, decision: "approved" });
await json("/api/admin", "admin", "POST", { action: "configure", id: contentId, sortOrder: 88, featured: true, category: "技能成长" });
const configured = await json("/api/catalog?id=" + contentId, null);
assert.equal(configured.record.payload.sortOrder, 88);
assert.equal(configured.record.payload.featured, true);
passed.push("enterprise job direct publication plus activity/content review and display configuration");

await call("/api/social", "student", "POST", { action: "toggle-like", contentId: "missing-content" }, 404);
const liked = await json("/api/social", "student", "POST", { action: "toggle-like", contentId });
assert.equal(liked.liked, true);
const comment = await json("/api/social", "student", "POST", { action: "add-comment", contentId, text: "内容清晰，想了解访谈提纲如何设计。" });
const publisherComments = await json("/api/social?scope=publisher", "enterprise");
assert.ok(publisherComments.comments.some((item) => item.id === comment.comment.id));
await json("/api/social", "enterprise", "PATCH", { commentId: comment.comment.id, action: "reply", reply: "可以先从目标、对象和五个核心问题开始。", scope: "publisher" });
const socialRead = await json("/api/social?contentId=" + contentId, "student");
assert.ok(socialRead.comments.some((item) => item.id === comment.comment.id && item.reply));
await json("/api/social?commentId=" + comment.comment.id, "student", "DELETE");
passed.push("published-content likes, comments, publisher reply and student deletion");

for (const [targetType, targetId, title] of [["job", jobId, "青年产品研究实习生"], ["activity", activityId, "青年产品共创工作坊"], ["content", contentId, "如何完成一次可信的用户研究"]]) {
  await json("/api/student", "student", "POST", { action: "favorite", targetType, targetId, snapshot: { title } });
}
let studentData = await json("/api/student", "student");
assert.equal(studentData.favorites.filter((item) => item.status === "active" && item.targetId.startsWith("audit-")).length, 3);
await json(`/api/student?targetType=job&targetId=${jobId}`, "student", "DELETE");
studentData = await json("/api/student", "student");
assert.equal(studentData.favorites.find((item) => item.targetId === jobId).status, "removed");
passed.push("student favorites create, read and remove");

const experience = await json("/api/student", "student", "POST", { action: "save-experience", category: "学生项目", title: "全链路验收项目", role: "负责人", description: "验证功能链路", output: "验收报告", occurredAt: "2026-09-21", isPublic: true });
await json("/api/student", "student", "POST", { action: "save-experience", id: experience.id, category: "学生项目", title: "全链路验收项目（已更新）", role: "负责人", description: "验证并修复功能链路", output: "完整验收报告", occurredAt: "2026-09-21", isPublic: true });
studentData = await json("/api/student", "student");
assert.ok(studentData.experiences.some((item) => item.id === experience.id && item.title.endsWith("（已更新）")));
await json("/api/student", "student", "POST", { action: "set-experience-visibility", id: experience.id, isPublic: false });
await json("/api/student", "student", "POST", { action: "set-experience-visibility", id: experience.id, isPublic: true });
passed.push("manual growth experience create, edit and visibility");

const share = await json("/api/student/share", "student", "POST", { days: 7 }, 201);
const publicPath = new URL(share.url).pathname;
const publicProfile = await json(publicPath.replace("/growth/share/", "/api/public/growth/"), null);
assert.equal(publicProfile.profile.name, studentProfile.name);
assert.equal("phone" in publicProfile.profile, false);
assert.ok(publicProfile.experiences.some((item) => item.id === experience.id));
await json("/api/student/share", "student", "DELETE");
await call(publicPath.replace("/growth/share/", "/api/public/growth/"), null, "GET", undefined, 404);
passed.push("public growth profile creation, privacy filtering and revocation");

const registration = await json("/api/registrations", "student", "POST", { activityId, activityTitle: "tampered title", answers: { name: "验收学生", email: "student-audit@example.test" } });
studentData = await json("/api/student", "student");
assert.ok(studentData.calendar.some((item) => item.sourceId === activityId && item.status === "active"));
await json("/api/student", "student", "POST", { action: "set-reminder", sourceId: activityId, enabled: false });
const publisherRegistrations = await json("/api/registrations?scope=publisher", "enterprise");
assert.ok(publisherRegistrations.registrations.some((item) => item.id === registration.id && item.answers.email === "student-audit@example.test"));
await json("/api/registrations", "enterprise", "PATCH", { registrationId: registration.id, decision: "approved", note: "报名信息完整，确认通过" });
const studentRegistrations = await json("/api/registrations", "student");
assert.ok(studentRegistrations.registrations.some((item) => item.id === registration.id && item.status === "approved"));
studentData = await json("/api/student", "student");
assert.ok(studentData.experiences.some((item) => item.sourceId === registration.id && item.certified));
const notifications = await json("/api/notifications", "student");
assert.ok(notifications.unread > 0);
await json("/api/notifications", "student", "PATCH", { all: true });
assert.equal((await json("/api/notifications", "student")).unread, 0);
passed.push("student registration, calendar, reminder, enterprise approval, certified experience and notification");

const resumeBytes = "%PDF-1.4\nFull acceptance resume\n%%EOF";
const resumeForm = new FormData();
resumeForm.set("purpose", "resume");
resumeForm.set("file", new File([resumeBytes], "full-acceptance.pdf", { type: "application/pdf" }));
const uploadedResume = await (await call("/api/files", "student", "POST", resumeForm)).json();
assert.equal(await (await call("/api/files?key=" + encodeURIComponent(uploadedResume.key), "student")).text(), resumeBytes);
await call("/api/files?key=" + encodeURIComponent(uploadedResume.key), "enterprise", "GET", undefined, 403);
const coverForm = new FormData();
coverForm.set("purpose", "cover");
coverForm.set("file", new File([new Uint8Array([137, 80, 78, 71])], "cover.png", { type: "image/png" }));
const uploadedCover = await (await call("/api/files", "enterprise", "POST", coverForm)).json();
assert.equal((await call("/api/files?key=" + encodeURIComponent(uploadedCover.key), null)).status, 200);
await json("/api/files?key=" + encodeURIComponent(uploadedCover.key), "enterprise", "DELETE");
passed.push("private resume isolation plus public media upload and recoverable archive");

const createdKey = await json("/api/admin-auth/keys", "admin", "POST", { label: "全功能验收临时密钥" }, 201);
let keys = await json("/api/admin-auth/keys", "admin");
assert.ok(keys.keys.some((item) => item.id === createdKey.id && item.status === "active"));
await json(`/api/admin-auth/keys/${createdKey.id}`, "admin", "PATCH", { action: "disable" });
await json(`/api/admin-auth/keys/${createdKey.id}`, "admin", "PATCH", { action: "restore" });
await json(`/api/admin-auth/keys/${createdKey.id}`, "admin", "PATCH", { action: "revoke" });
keys = await json("/api/admin-auth/keys", "admin");
assert.equal(keys.keys.find((item) => item.id === createdKey.id).status, "revoked");
passed.push("operations key create, disable, restore and revoke");

await json("/api/platform?id=" + contentId, "enterprise", "DELETE");
await call("/api/catalog?id=" + contentId, null, "GET", undefined, 404);
const archived = await json("/api/platform?kind=content&archived=1", "enterprise");
const archivedContent = archived.records.find((item) => item.id === contentId);
assert.ok(archivedContent);
await json("/api/platform", "enterprise", "POST", { id: contentId, kind: "content", version: archivedContent.version, payload: { ...archivedContent.payload, reviewStatus: "draft" } });
assert.ok((await json("/api/platform?kind=content", "enterprise")).records.some((item) => item.id === contentId));
passed.push("publisher archive listing and restore");

console.log(JSON.stringify({ passed }, null, 2));
