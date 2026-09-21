import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8");

test("enterprise registration review has filtered export, batches and shared accessible detail", () => {
  assert.match(source, /导出筛选结果/);
  assert.match(source, /批量通过/);
  assert.match(source, /批量退回/);
  assert.match(source, /function RegistrationDetail[\s\S]*?<SidePanel/);
  assert.match(source, /退回时请填写原因/);
});

test("publisher feedback uses shared detail, explicit reply states and retry", () => {
  assert.match(source, /function PublisherFeedbackDesk[\s\S]*?<SidePanel/);
  assert.match(source, /待回复/);
  assert.match(source, /已回复/);
  assert.match(source, /回复已同步到学生端/);
  assert.match(source, /重新加载|重试/);
});

test("enterprise overview distinguishes drafts from items under review", () => {
  assert.match(source, /record\.payload\.reviewStatus === "draft"/);
  assert.match(source, /return \{ label: "草稿", className: "draft" \}/);
  assert.match(source, /<small>草稿<\/small>/);
});

test("enterprise profile waits for persisted data instead of showing built-in identity", () => {
  assert.match(source, /key=\{enterpriseProfile\?\.id \|\| "new-enterprise-profile"\}/);
  assert.doesNotMatch(source, /old\.name \|\| "湖南示例企业"/);
  assert.doesNotMatch(source, /old\.website \|\| "https:\/\/example\.com"/);
  assert.match(source, /aria-label="尚未上传企业 Logo"/);
  assert.match(source, /\[form\.companySize, form\.city, form\.address\][\s\S]*?\.filter\(\(value\) => value\.trim\(\)\)/);
});
