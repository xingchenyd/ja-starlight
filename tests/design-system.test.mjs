import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system exposes semantic JA color and focus tokens", async () => {
  const tokens = await readFile("app/design-system/tokens.css", "utf8");
  for (const name of ["--ja-deep", "--ja-aqua", "--ja-yellow", "--focus-ring"]) {
    assert.match(tokens, new RegExp(`${name}\\s*:`));
  }
});

test("motion system defines one timing scale and a reduced-motion fallback", async () => {
  const motion = await readFile("app/design-system/motion.css", "utf8");
  for (const name of ["--motion-duration-micro", "--motion-duration-page", "--motion-ease-enter"]) {
    assert.match(motion, new RegExp(`${name}\\s*:`));
  }
  assert.match(motion, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(motion, /\.motion-page-enter/);
  assert.match(motion, /\.motion-pressable/);
});
