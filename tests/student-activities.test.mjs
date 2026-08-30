import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("activity discovery is a dedicated accessible five-second carousel", async () => {
  const source = await read("../app/workspace/student/ActivityExperience.tsx");
  assert.match(source, /5000/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /暂停轮播/);
  assert.match(source, /继续轮播/);
  assert.match(source, /onMouseEnter/);
  assert.match(source, /onFocusCapture/);
  assert.match(source, /sortOrder/);
  assert.doesNotMatch(source, /registrationFields\.map/);
});

test("activity detail uses a dynamic registration side panel and prefilled profile", async () => {
  const source = await read("../app/workspace/student/RegistrationPanel.tsx");
  assert.match(source, /SidePanel/);
  assert.match(source, /registrationFields/);
  assert.match(source, /prefill/);
  assert.match(source, /type === "email"/);
  assert.match(source, /type === "tel"/);
  assert.match(source, /报名已通过/);
  assert.match(source, /报名已取消/);
});

test("student activity calendar exposes month and upcoming views with reminder controls", async () => {
  const source = await read("../app/workspace/student/ActivityCalendar.tsx");
  assert.match(source, /本月日历/);
  assert.match(source, /近期安排/);
  assert.match(source, /onToggleReminder/);
  assert.match(source, /reminderEnabled/);
  assert.match(source, /SidePanel/);
});

test("workspace delegates student activities to the refined module", async () => {
  const source = await read("../app/workspace/PlatformApp.tsx");
  assert.match(source, /from "\.\/student\/ActivityExperience"/);
  assert.match(source, /mergeCatalogRecords<Activity>/);
  assert.match(source, /privateData\.calendar/);
});
