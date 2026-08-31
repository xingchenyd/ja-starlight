import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home story carousel is controllable, complete and reduced-motion aware", async () => {
  const source = await readFile(
    new URL("../app/HomeCarousel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /6500/);
  assert.match(source, /暂停轮播/);
  assert.match(source, /继续轮播/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /onFocusCapture/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /published\.slice\(0,\s*5\)/);
  assert.doesNotMatch(source, /\.\.\.fallbackSlides/);
});
