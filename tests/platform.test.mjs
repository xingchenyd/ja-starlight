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
  assert.match(html, /JA 测试管理员/);
  assert.match(html, /诚信管理/);
  assert.doesNotMatch(html, /此账号没有后台权限/);
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
test("enterprise publishing explains the JA review workflow", async () => {
  const [enterprise, content] = await Promise.all([
    page("/workspace?role=enterprise"),
    page("/content"),
  ]);
  assert.equal(enterprise.status, 200);
  assert.equal(content.status, 200);
  const enterpriseHtml = await enterprise.text();
  assert.match(enterpriseHtml, /湖南企业发布，JA 审核后公开/);
  assert.match(enterpriseHtml, /JA 分类、排序与审核/);
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
test("enterprise can review and decide student registrations", async () => {
  const response = await page("/workspace?role=enterprise&tab=registrations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /page-transition/);
  assert.match(html, /活动报名审核/);
  assert.match(html, /测试阶段显示全部活动报名/);
  assert.match(html, /待确认/);
  assert.match(html, /已通过/);
  assert.match(html, /已退回/);
});
test("registration API exposes test-stage review queue", async () => {
  const source = await readFile(
    new URL("../app/api/registrations/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(source, /testVisible/);
  assert.doesNotMatch(source, /无权审核此报名/);
});
test("public opportunities navigate by category and never by city filters", async () => {
  const response = await page("/opportunities");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /机会类别/);
  assert.match(html, /技术研发/);
  assert.match(html, /简历邮箱/);
  assert.match(html, /湖南开放机会/);
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
