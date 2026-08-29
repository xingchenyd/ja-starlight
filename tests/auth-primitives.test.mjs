import assert from "node:assert/strict";
import test from "node:test";

import {
  hashPassword,
  verifyPassword,
  validateEmail,
  validatePassword,
  hashOpaqueToken,
  safeReturnTo,
} from "../lib/auth/crypto.ts";

test("account inputs enforce the approved email and password contract", () => {
  assert.equal(validateEmail("Student@Example.com"), "student@example.com");
  assert.throws(() => validateEmail("not-an-email"), /邮箱格式/);
  assert.deepEqual(validatePassword("Str0ng!Pass"), { valid: true, score: 4 });
  for (const password of ["short7", "contains space1!", "中文Pass123!", "aaaaaaaa"])
    assert.equal(validatePassword(password).valid, false, password);
  assert.equal(validatePassword("A1!2345678901234567890").valid, false);
});

test("password and opaque-token hashing are deterministic only with their secrets", async () => {
  const credential = await hashPassword("Str0ng!Pass", "pepper-value", { iterations: 10_000 });
  assert.notEqual(credential.hash, "Str0ng!Pass");
  assert.equal(await verifyPassword("Str0ng!Pass", "pepper-value", credential), true);
  assert.equal(await verifyPassword("Wrong!Pass", "pepper-value", credential), false);
  assert.equal(await verifyPassword("Str0ng!Pass", "other-pepper", credential), false);
  assert.equal(await hashOpaqueToken("token", "pepper"), await hashOpaqueToken("token", "pepper"));
});

test("password derivation splits work into runtime-compatible 100k rounds", async () => {
  const credential = await hashPassword("Str0ng!Pass", "pepper-value", { iterations: 100_001 });
  assert.equal(credential.algorithm, "pbkdf2-sha256-chain");
  assert.equal(credential.iterations, 100_001);
  assert.equal(await verifyPassword("Str0ng!Pass", "pepper-value", credential), true);
});

test("return paths stay inside this application", () => {
  assert.equal(safeReturnTo("/workspace?role=student"), "/workspace?role=student");
  assert.equal(safeReturnTo("https://evil.example/"), "/");
  assert.equal(safeReturnTo("//evil.example"), "/");
});
