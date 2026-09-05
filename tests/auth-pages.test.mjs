import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("student, enterprise, recovery and operations login pages use one branded system", async () => {
  const files = await Promise.all([
    readFile(new URL("../app/auth/student/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/enterprise/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/forgot-password/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ja-login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/AuthPanel.tsx", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.match(source, /星光计划/);
  assert.match(source, /登录/);
  assert.match(source, /注册/);
  assert.match(source, /忘记密码/);
  assert.match(source, /8-20/);
  assert.match(source, /autocomplete|autoComplete/);
  assert.doesNotMatch(source, /Student2026|Enterprise2026|JA-STARLIGHT-DEMO/);
});

test("student login provides a native horizontal story rail without page overflow", async () => {
  const [student, shell, styles] = await Promise.all([
    readFile(new URL("../app/auth/student/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/AuthShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(student, /stories=\{/);
  assert.match(student, /ja-official-career-market\.jpg/);
  assert.match(student, /ja-official-student-company\.jpg/);
  assert.match(shell, /auth-story-track/);
  assert.match(shell, /aria-label="星光计划成长故事"/);
  assert.match(styles, /\.auth-story-track[^}]*overflow-x:\s*auto/);
  assert.match(styles, /scroll-snap-type:\s*x\s+mandatory/);
  assert.match(styles, /\.auth-story-slide[^}]*scroll-snap-align:\s*start/);
  assert.match(styles, /\.auth-page[^}]*overflow-x:\s*(?:hidden|clip)/);
});

test("auth shell removes the left logo and uses a plain home link", async () => {
  const [shell, styles] = await Promise.all([
    readFile(new URL("../app/auth/AuthShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(shell, /className="auth-logo"/);
  assert.doesNotMatch(shell, /ja-china-logo\.jpg/);
  assert.doesNotMatch(styles, /\.auth-logo/);
  assert.match(shell, /<a className="auth-back" href="\/">← 返回首页<\/a>/);
  assert.doesNotMatch(shell, /<Link className="auth-back"/);
});
