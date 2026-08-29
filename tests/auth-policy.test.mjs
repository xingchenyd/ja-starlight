import assert from "node:assert/strict";
import test from "node:test";
import { cookieForRole, evaluateRateLimit, sessionDurationSeconds } from "../lib/auth/policy.ts";

test("role sessions use the approved durations and secure cookies", () => {
  assert.equal(sessionDurationSeconds("student"), 7 * 24 * 60 * 60);
  assert.equal(sessionDurationSeconds("enterprise"), 24 * 60 * 60);
  assert.equal(sessionDurationSeconds("admin"), 4 * 60 * 60);
  assert.match(cookieForRole("student", "opaque", true), /ja_account_session=opaque/);
  assert.match(cookieForRole("student", "opaque", true), /HttpOnly; Secure; SameSite=Lax/);
  assert.match(cookieForRole("admin", "opaque", true), /ja_admin_session=opaque/);
});

test("rate limiting blocks repeated failures but resets after the window", () => {
  const first = evaluateRateLimit(null, 1000, { maximum: 3, windowMs: 60_000, blockMs: 120_000 });
  assert.equal(first.allowed, true);
  const second = evaluateRateLimit(first.next, 2000, { maximum: 3, windowMs: 60_000, blockMs: 120_000 });
  const third = evaluateRateLimit(second.next, 3000, { maximum: 3, windowMs: 60_000, blockMs: 120_000 });
  assert.equal(third.allowed, false);
  assert.equal(evaluateRateLimit(third.next, 124_000, { maximum: 3, windowMs: 60_000, blockMs: 120_000 }).allowed, true);
});
