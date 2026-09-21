import assert from "node:assert/strict";
import test from "node:test";
import { extractResumeProfile } from "../lib/services/resume-profile.ts";

test("resume fields come from actual Chinese document text", () => {
  const fields = extractResumeProfile(`个人简历
姓名：测试同学 | 学校：中南大学
专业：计算机科学与技术 年级：2028届
邮箱：resume-check@example.com 电话：13812345678
专业技能
Python、SQL
数据分析、用户研究
获奖经历
2025 年校级创新项目一等奖
自我介绍
喜欢通过调研解决实际问题。
项目经历
校园调研项目`);
  assert.equal(fields.name, "测试同学");
  assert.equal(fields.school, "中南大学");
  assert.equal(fields.major, "计算机科学与技术");
  assert.equal(fields.grade, "2028届");
  assert.equal(fields.phone, "13812345678");
  assert.equal(fields.email, "resume-check@example.com");
  assert.equal(fields.skills, "Python、SQL，数据分析、用户研究");
  assert.equal(fields.awards, "2025 年校级创新项目一等奖");
  assert.equal(fields.bio, "喜欢通过调研解决实际问题。");
});

test("missing information never becomes a fabricated default or erases existing fields", () => {
  assert.deepEqual(extractResumeProfile(""), {});
  const old = { name: "已保存姓名", school: "已保存学校", skills: "Python" };
  assert.deepEqual({ ...old, ...extractResumeProfile("邮箱：new@example.com") }, { ...old, email: "new@example.com" });
  assert.equal(extractResumeProfile("个人简历\n教育背景\n湖南大学\n2028届").name, undefined);
});

test("English labels and compact Chinese headings are supported", () => {
  const result = extractResumeProfile("Name: Chen Li\nUniversity: Example University\nMajor: Computer Science\nSkills: Python, SQL\nAwards: First prize\nSummary: Student researcher");
  assert.equal(result.name, "Chen Li");
  assert.equal(result.school, "Example University");
  assert.equal(result.major, "Computer Science");
  assert.equal(result.skills, "Python, SQL");
  assert.equal(result.awards, "First prize");
});
