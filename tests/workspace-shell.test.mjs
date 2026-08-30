import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workspace shell uses canonical history and shared feedback", async () => {
  const source = await readFile(
    new URL("../app/workspace/PlatformApp.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /workspacePath/);
  assert.match(source, /pushState/);
  assert.match(source, /popstate/);
  assert.match(source, /PageTransition/);
  assert.match(source, /ToastProvider/);
  assert.doesNotMatch(source, /starlight-demo-id/);
});
