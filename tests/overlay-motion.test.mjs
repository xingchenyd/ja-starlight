import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("shared overlays expose modal semantics, escape handling and focus restoration", async () => {
  const source = await readFile("app/components/ui/Overlay.tsx", "utf8");
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /previousFocus\.current\?\.focus/);
  assert.match(source, /event\.key !== "Tab"/);
});

test("page transitions use progressive enhancement and reduced-motion fallback", async () => {
  const source = await readFile("app/components/motion/Transition.tsx", "utf8");
  assert.match(source, /startViewTransition/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /data-direction/);
  assert.match(source, /motion-page-enter/);
});
