import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const compact = (css) => css.replace(/\s+/g, " ").replace(/\s*([:;,{}])\s*/g, "$1");
const declarations = (css, selector) => {
  const start = css.indexOf(`${selector}{`);
  assert.notEqual(start, -1, `missing CSS rule ${selector}`);
  return css.slice(start + selector.length + 1, css.indexOf("}", start));
};

test("homepage search copy keeps readable dark text on its white surface", async () => {
  const css = compact(await readFile(new URL("../app/home-experience.css", import.meta.url), "utf8"));

  assert.match(css, /\.cinema-copy \.search\{[^}]*color:var\(--home-ink\)/);
  assert.match(css, /\.cinema-copy \.search input\{[^}]*color:var\(--home-ink\)/);
  assert.match(css, /\.cinema-copy \.search input::placeholder\{[^}]*color:#[0-9a-f]{6}/i);
});

test("learning card metadata overrides the global dark footer treatment", async () => {
  const css = compact(await readFile(new URL("../app/workspace/student/student-content.css", import.meta.url), "utf8"));
  const footer = declarations(css, ".learning-card-body footer");
  const tags = declarations(css, ".learning-card-body footer span,.learning-card-body footer i");

  assert.match(footer, /background:#fff/);
  assert.match(footer, /color:#24404d/);
  assert.match(footer, /padding:16px 0 0/);
  assert.match(tags, /border:1px solid #d[0-9a-f]{5}/i);
  assert.match(tags, /background:#fff/);
  assert.match(tags, /color:#24404d/);
});

test("dialogs stay inside dynamic viewport and page motion releases its transform", async () => {
  const [components, motion] = await Promise.all([
    readFile(new URL("../app/design-system/components.css", import.meta.url), "utf8").then(compact),
    readFile(new URL("../app/design-system/motion.css", import.meta.url), "utf8").then(compact),
  ]);
  const frame = declarations(components, ".ui-overlay-frame");
  const body = declarations(components, ".ui-overlay-body");

  assert.match(frame, /max-height:min\(820px,calc\(100dvh - 48px\)\)/);
  assert.match(components, /@media ?\(max-width:640px\)\{\.ui-overlay-root\{[^}]*padding:8px/);
  assert.match(body, /overscroll-behavior:contain/);
  assert.match(motion, /\.motion-page-enter\{animation:[^;}]+ backwards;/);
});
