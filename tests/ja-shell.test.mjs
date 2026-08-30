import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("JA console paths normalize invalid modules to the activity pulse", async () => {
  const routes = await import("../lib/ui/ja-routes.ts");

  assert.equal(routes.jaConsolePath("review"), "/ja-console/review");
  assert.equal(routes.normalizeJATab("unknown"), "pulse");
  assert.equal(routes.normalizeJATab("keys"), "keys");
});

test("JA console uses canonical modules and shared interaction primitives", async () => {
  const [source, loginSource] = await Promise.all([
    readFile(new URL("../app/ja-console/JAConsole.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ja-login/JALoginPanel.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(source, /jaConsolePath/);
  assert.match(source, /pushState/);
  assert.match(source, /popstate/);
  assert.match(source, /PageTransition/);
  assert.match(source, /ToastProvider/);
  assert.match(source, /aria-current/);
  assert.doesNotMatch(source, /from "next\/link"/);
  assert.match(source, /<a href="\/" className="side-brand/);
  assert.match(loginSource, /jaConsolePath\("pulse"\)/);
});
