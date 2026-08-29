import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function page(path) {
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    env,
    ctx,
  );
}

test("public home renders JA Star Plan proposition and media carousel", async () => {
  const response = await page("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Star Plan 星光计划/);
  assert.match(html, /让每一次探索/);
  assert.match(html, /正在发生的成长故事/);
  assert.match(html, /ja-china-logo\.jpg/);
  assert.match(html, /实习 \/ 项目机会/);
  assert.match(html, /\/auth\/student/);
  assert.match(html, /\/auth\/enterprise/);
});
test("native account and JA key login pages render as complete branded flows", async () => {
  const [student, enterprise, recovery, admin] = await Promise.all([
    page("/auth/student"), page("/auth/enterprise"), page("/auth/forgot-password"), page("/ja-login"),
  ]);
  for (const response of [student, enterprise, recovery, admin]) assert.equal(response.status, 200);
  assert.match(await student.text(), /学生空间/);
  assert.match(await enterprise.text(), /企业工作台/);
  assert.match(await recovery.text(), /找回密码/);
  assert.match(await admin.text(), /管理密钥/);
});
test("student workspace uses formal student navigation without role switching", async () => {
  const response = await page("/workspace?role=student");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /你好，张晨/);
  assert.match(html, /实习项目机会/);
  assert.match(html, /成长主页/);
  assert.match(html, /联系项目团队/);
  assert.doesNotMatch(
    html,
    /学生端|企业端|平台使用提示|JA 管理端体验|JA 管理端/,
  );
});
test("JA console is directly accessible during testing", async () => {
  const response = await page("/ja-console");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /湖南运营后台/);
  assert.match(html, /JA 本地测试管理员/);
  assert.match(html, /分区审核/);
  assert.match(html, /JA 发起的活动/);
  assert.match(html, /企业发布的活动/);
  assert.match(html, /企业发布的内容/);
  assert.match(html, /诚信管理/);
  assert.doesNotMatch(html, /此账号没有后台权限|<span>☷<\/span>报名数据/);
});
test("opportunity route is a Hunan category-based direct-email opportunity", async () => {
  const response = await page("/opportunities/job-01");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /三一集团/);
  assert.match(html, /工业互联网产品运营实习生/);
  assert.match(html, /产品运营/);
  assert.match(html, /长沙/);
  assert.match(html, /starlight-sany@example.com/);
  assert.match(html, /平台不读取邮件/);
  assert.doesNotMatch(html, /站内申请|与企业沟通|北京|上海|深圳/);
});
test("enterprise workbench exposes operational tasks and publishing status", async () => {
  const [enterprise, content] = await Promise.all([
    page("/workspace?role=enterprise"),
    page("/content"),
  ]);
  assert.equal(enterprise.status, 200);
  assert.equal(content.status, 200);
  const enterpriseHtml = await enterprise.text();
  assert.match(enterpriseHtml, /今日工作概览/);
  assert.match(enterpriseHtml, /待办事项/);
  assert.match(enterpriseHtml, /发布状态/);
  assert.match(enterpriseHtml, /资料完整度/);
  assert.match(enterpriseHtml, /活动发布/);
  assert.match(await content.text(), /成长内容/);
});
test("activity publishing and registration data entry points are present", async () => {
  const response = await page("/workspace?role=enterprise&tab=activities");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /报名数据/);
  assert.match(html, /活动发布/);
  assert.match(html, /明确报名所需字段/);
});
test("enterprise publisher supports drafts, validation and the correct review ownership", async () => {
  const [workspaceSource, platformApiSource] = await Promise.all([
    readFile(
      new URL("../app/workspace/PlatformApp.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/api/platform/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceSource, /保存草稿/);
  assert.match(workspaceSource, /已恢复上次未完成草稿/);
  assert.match(workspaceSource, /确认并发布/);
  assert.match(workspaceSource, /至少填写 2 条岗位职责/);
  assert.match(platformApiSource, /body\.kind === "job"/);
  assert.match(platformApiSource, /isDraft \? "draft" : "approved"/);
  assert.match(
    platformApiSource,
    /payload\.reviewStatus = isDraft \? "draft" : "pending"/,
  );
  assert.match(platformApiSource, /无权修改该记录/);
});
test("enterprise can review and decide student registrations", async () => {
  const response = await page("/workspace?role=enterprise&tab=registrations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /page-transition/);
  assert.match(html, /活动报名审核/);
  assert.match(html, /导出筛选结果/);
  assert.match(html, /报名可视化/);
  assert.match(html, /报名来源分布/);
  assert.match(html, /姓名、学校、电话或邮箱/);
  assert.match(html, /待确认/);
  assert.match(html, /已通过/);
  assert.match(html, /已退回/);
});
test("JA review ownership and enterprise registration export are separated", async () => {
  const [adminSource, workspaceSource] = await Promise.all([
    readFile(
      new URL("../app/ja-console/JAConsole.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/workspace/PlatformApp.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(adminSource, /admin-review-lanes/);
  assert.match(adminSource, /JA 发起的活动/);
  assert.match(adminSource, /企业发布的活动/);
  assert.match(adminSource, /企业发布的内容/);
  assert.doesNotMatch(adminSource, /RegistrationTable/);
  assert.match(workspaceSource, /导出筛选结果/);
  assert.match(workspaceSource, /text\/csv;charset=utf-8/);
});
test("registration API scopes enterprise data and supports batch review", async () => {
  const [apiSource, workspaceSource] = await Promise.all([
    readFile(
      new URL("../app/api/registrations/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/workspace/PlatformApp.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(apiSource, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(apiSource, /WHERE publisher_owner_id=\?/);
  assert.match(apiSource, /registrationIds/);
  assert.match(apiSource, /无权审核其他企业的报名/);
  assert.doesNotMatch(apiSource, /testVisible/);
  assert.match(workspaceSource, /批量通过/);
  assert.match(workspaceSource, /已导出当前筛选结果/);
});
test("public opportunities navigate by category and never by city filters", async () => {
  const response = await page("/opportunities");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /机会类别/);
  assert.match(html, /技术研发/);
  assert.match(html, /简历邮箱/);
  assert.match(html, /个开放机会/);
  assert.doesNotMatch(html, /全部城市|北京|上海|深圳|立即申请|站内沟通/);
});
test("student opportunity filters use dual-ended salary slider", async () => {
  const response = await page("/workspace?role=student&tab=opportunities");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /salary-dual-slider/);
  assert.match(html, /薪资下限/);
  assert.match(html, /薪资上限/);
  assert.match(html, /500 元\/天/);
});
test("student activities use automatic carousel without signup fields in showcase", async () => {
  const response = await page("/workspace?role=student&tab=activities");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /auto-showcase/);
  assert.match(html, /auto-track/);
  assert.doesNotMatch(html, /signup-fields-preview"><b>报名信息/);
});
test("growth profile focuses on resume and unified timeline", async () => {
  const response = await page("/workspace?role=student&tab=profile");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /fixed-left-profile/);
  assert.match(html, /profile-scroll-pane/);
  assert.match(html, /手动添加成长经历/);
  assert.match(html, /添加到时间轴/);
  assert.match(html, /JA 认证高亮展示/);
  assert.doesNotMatch(
    html,
    /学习与活动反馈|<h2>项目经历<\/h2>|timeline-spotlight/,
  );
});
test("student interactions are persistent and permission scoped", async () => {
  const [workspaceSource, socialApiSource] = await Promise.all([
    readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/social/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceSource, /\/api\/social\?contentId=/);
  assert.match(workspaceSource, /删除我的评论/);
  assert.doesNotMatch(workspaceSource, /发布方已收到，会在后续内容中补充回应/);
  assert.match(socialApiSource, /CREATE TABLE IF NOT EXISTS content_likes/);
  assert.match(socialApiSource, /CREATE TABLE IF NOT EXISTS content_comments/);
  assert.match(socialApiSource, /无权管理其他发布方的评论/);
  assert.match(socialApiSource, /WHERE id=\? AND author_id=\?/);
});
test("enterprise and JA consoles expose real comment operations", async () => {
  const [enterprise, admin, workspaceSource] = await Promise.all([
    page("/workspace?role=enterprise&tab=feedback"),
    page("/ja-console"),
    readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8"),
  ]);
  const enterpriseHtml = await enterprise.text();
  const adminHtml = await admin.text();
  assert.match(enterpriseHtml, /互动管理/);
  assert.match(enterpriseHtml, /CONTENT FEEDBACK/);
  assert.match(workspaceSource, /发布方回复/);
  assert.match(workspaceSource, /scope: "publisher"/);
  assert.match(adminHtml, /互动管理/);
  assert.match(adminHtml, /审计日志/);
});
test("JA publication operations support risk checks, batch review and display configuration", async () => {
  const [adminSource, adminApiSource] = await Promise.all([
    readFile(new URL("../app/ja-console/JAConsole.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(adminSource, /公开前核验清单/);
  assert.match(adminSource, /批量通过/);
  assert.match(adminSource, /保存展示设置/);
  assert.match(adminSource, /导出当前结果/);
  assert.match(adminApiSource, /configure-publication/);
  assert.match(adminApiSource, /单次最多审核 100 条内容/);
  assert.match(adminApiSource, /JA 仅审核 JA 活动、企业活动和企业内容/);
});
test("commercial profile and private resume flows are explicit", async () => {
  const [workspaceSource, platformApiSource, fileApiSource] = await Promise.all([
    readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/platform/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/files/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceSource, /资料完整度/);
  assert.match(workspaceSource, /内部联络信息（不在学生端公开）/);
  assert.doesNotMatch(workspaceSource, /JA HUNAN VERIFIED ORGANIZATION/);
  assert.match(workspaceSource, /正在安全读取简历/);
  assert.match(platformApiSource, /统一社会信用代码应为 18 位/);
  assert.match(fileApiSource, /private, no-store/);
});
test("public discovery uses live catalog data and deep-links to exact items", async () => {
  const [homeSource, sectionsSource, carouselSource, contentSource, workspaceSource, detailSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeSections.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeCarousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/content/ContentCatalog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/opportunities/[id]/DynamicJobDetail.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(homeSource, /action="\/opportunities"/);
  assert.doesNotMatch(homeSource, /12,600\+|180\+|92%|26 个机会/);
  assert.match(sectionsSource, /\/opportunities\/\$\{encodeURIComponent\(job\.id\)\}/);
  assert.match(sectionsSource, /\/activities\/\$\{encodeURIComponent\(activity\.id\)\}/);
  assert.match(carouselSource, /record\.id/);
  assert.match(contentSource, /\/content\/\$\{encodeURIComponent\(content\.id\)\}/);
  assert.match(workspaceSource, /initialItem/);
  assert.match(detailSource, /fetch\(`\/api\/catalog\?id=/);
});
