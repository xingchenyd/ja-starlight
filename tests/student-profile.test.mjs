import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("resume panel accepts private PDF files and has extraction confirmation fallback", async () => {
  const [panel, files] = await Promise.all([
    read("../app/workspace/student/ResumePanel.tsx"),
    read("../app/api/files/route.ts"),
  ]);
  assert.match(panel, /application\/pdf/);
  assert.match(panel, /20 \* 1024 \* 1024/);
  assert.match(panel, /识别结果/);
  assert.match(panel, /手动确认/);
  assert.match(panel, /\/api\/files\?key=/);
  assert.match(panel, /private|仅自己可见/);
  assert.match(files, /purpose === "resume" \? \["application\/pdf"\]/);
});

test("growth timeline merges certified and manual experience with safe controls", async () => {
  const source = await read("../app/workspace/student/GrowthTimeline.tsx");
  assert.match(source, /JA 认证/);
  assert.match(source, /save-experience/);
  assert.match(source, /reorder-experiences/);
  assert.match(source, /set-experience-visibility/);
  assert.match(source, /sourceType === "manual"/);
  assert.match(source, /evidenceUrl/);
});

test("student profile uses a fixed identity rail and private API timeline", async () => {
  const [profile, workspace] = await Promise.all([
    read("../app/workspace/student/StudentProfile.tsx"),
    read("../app/workspace/PlatformApp.tsx"),
  ]);
  assert.match(profile, /fixed-profile-rail/);
  assert.match(profile, /GrowthTimeline/);
  assert.match(profile, /ResumePanel/);
  assert.match(workspace, /from "\.\/student\/StudentProfile"/);
  assert.match(workspace, /privateData\.experiences/);
});

test("approved registrations create immutable platform experience records", async () => {
  const source = await read("../app/api/registrations/route.ts");
  assert.match(source, /student_experiences/);
  assert.match(source, /'platform'/);
  assert.match(source, /certified/);
});
