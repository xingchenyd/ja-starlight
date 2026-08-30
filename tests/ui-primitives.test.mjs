import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("shared action controls expose formal visual and asynchronous states", async () => {
  const source = await readFile("app/components/ui/Button.tsx", "utf8");
  for (const variant of ["primary", "secondary", "tertiary", "ghost", "danger"]) {
    assert.match(source, new RegExp(`\\"${variant}\\"`));
  }
  for (const state of ["idle", "loading", "success", "error"]) {
    assert.match(source, new RegExp(`\\"${state}\\"`));
  }
  assert.match(source, /aria-label/);
  assert.match(source, /aria-busy/);
});

test("shared feedback announces status and errors without relying on color", async () => {
  const source = await readFile("app/components/ui/Feedback.tsx", "utf8");
  assert.match(source, /ToastProvider/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role={notice\.tone === "error" \? "alert" : "status"}/);
  assert.match(source, /InlineError/);
  assert.match(source, /EmptyState/);
});
