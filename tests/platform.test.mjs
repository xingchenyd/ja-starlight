import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function page(path){return worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html"}}),env,ctx)}

test("public home renders JA Starlight proposition", async()=>{const response=await page("/");assert.equal(response.status,200);const html=await response.text();assert.match(html,/JA 星光计划/);assert.match(html,/让每一次探索/);assert.match(html,/实习机会/)});
test("public workspace exposes student and enterprise only", async()=>{const response=await page("/workspace?role=student");assert.equal(response.status,200);const html=await response.text();assert.match(html,/学生空间/);assert.match(html,/企业端/);assert.match(html,/个人主页/);assert.doesNotMatch(html,/JA 管理端体验|JA 管理端/)});
test("opportunity route uses direct enterprise email", async()=>{const response=await page("/opportunities/job-01");assert.equal(response.status,200);const html=await response.text();assert.match(html,/英特尔中国/);assert.match(html,/产品运营实习生/);assert.match(html,/campus.cn@intel.com/);assert.match(html,/平台不读取邮件/);assert.doesNotMatch(html,/站内申请|与企业沟通/)});
test("enterprise publishing and content routes render", async()=>{const [enterprise,content]=await Promise.all([page("/workspace?role=enterprise"),page("/content")]);assert.equal(enterprise.status,200);assert.equal(content.status,200);const enterpriseHtml=await enterprise.text();assert.match(enterpriseHtml,/岗位发布/);assert.match(enterpriseHtml,/活动发布/);assert.match(await content.text(),/成长内容/)});
test("public jobs include company logos and never expose in-platform apply", async()=>{const response=await page("/opportunities");assert.equal(response.status,200);const html=await response.text();assert.match(html,/logo/);assert.match(html,/简历邮箱/);assert.doesNotMatch(html,/立即申请|站内沟通/)});
