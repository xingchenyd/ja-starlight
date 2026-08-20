import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function page(path){return worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html"}}),env,ctx)}

test("public home renders JA Starlight proposition", async()=>{const response=await page("/");assert.equal(response.status,200);const html=await response.text();assert.match(html,/JA 星光计划/);assert.match(html,/让每一次探索/);assert.match(html,/实习机会/)});
test("student, enterprise and JA surfaces are present", async()=>{const response=await page("/workspace?role=student");assert.equal(response.status,200);const html=await response.text();assert.match(html,/学生端体验/);assert.match(html,/企业端体验/);assert.match(html,/JA 管理端体验/);assert.match(html,/成长档案/)});
test("opportunity and content routes render", async()=>{const [opportunity,content]=await Promise.all([page("/opportunities/job-01"),page("/content")]);assert.equal(opportunity.status,200);assert.equal(content.status,200);assert.match(await opportunity.text(),/产品运营实习生/);assert.match(await content.text(),/成长内容/)});
