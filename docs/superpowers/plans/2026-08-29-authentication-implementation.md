# JA 星光计划 Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ChatGPT-header authentication with secure student and enterprise email/password accounts, password-reset email infrastructure, and auditable JA administrator-key sessions without losing existing platform data.

**Architecture:** Keep authentication behind focused services: pure password/session primitives, an `AuthRepository` contract with D1 implementation, account and administrator session services, and a swappable `MailProvider`. Existing API authorization continues through `db/runtime.ts`, but its actor lookup changes from forwarded headers to hashed session cookies. Login pages use the established JA visual system, while public content remains anonymous.

**Tech Stack:** Vinext/React 19, TypeScript, Cloudflare Workers Web Crypto, D1 SQLite, raw prepared statements, Resend HTTPS API, Node test runner, ESLint.

**Spec:** `docs/superpowers/specs/2026-08-29-authentication-design.md`

## Global Constraints

- Student and enterprise registration uses only email, password, and password confirmation; registration does not verify email.
- One normalized email maps to one account and one role.
- Passwords are 8–20 visible ASCII characters, contain no spaces or Unicode, and reject the defined weak-password set.
- Student, enterprise, and JA sessions last 7 days, 24 hours, and 4 hours respectively.
- No password, reset code, session token, or full JA key is stored or logged in plaintext.
- The public website must never display demo credentials or the JA login entry.
- Resend is the initial provider, but missing Resend configuration must produce a complete branded unavailable state rather than fake delivery.
- Existing business records and user IDs must remain intact.
- Tests are written and observed failing before the corresponding production code.
- `.openai/hosting.json`, D1/R2 bindings, Vinext structure, package manager, and existing JA brand system remain in place.

---

### Task 1: Pure authentication primitives

**Files:**
- Create: `lib/auth/types.ts`
- Create: `lib/auth/policy.ts`
- Create: `lib/auth/crypto.ts`
- Create: `lib/auth/cookies.ts`
- Create: `tests/auth-primitives.test.mjs`

**Interfaces:**
- Produces `normalizeEmail(value: string): string`.
- Produces `validateRegistrationPassword(value: string): { ok: true } | { ok: false; code: string; message: string }`.
- Produces `hashPassword(password, pepper, options?)`, `verifyPassword(password, stored, pepper)`, `hashOpaqueToken(value, pepper)`, and `createOpaqueToken(bytes?)`.
- Produces `accountSessionLifetime(role)`, `serializeSessionCookie`, `serializeExpiredCookie`, and `readCookie`.

- [ ] **Step 1: Write the failing primitive tests**

```js
test("normalizes email and rejects non-ASCII passwords", async () => {
  assert.equal(normalizeEmail("  Student@Example.COM "), "student@example.com");
  assert.deepEqual(validateRegistrationPassword("Valid-2026!"), { ok: true });
  assert.equal(validateRegistrationPassword("中文Pass123!").ok, false);
  assert.equal(validateRegistrationPassword("space pass").ok, false);
  assert.equal(validateRegistrationPassword("short7").ok, false);
  assert.equal(validateRegistrationPassword("12345678").ok, false);
});

test("password verification is salted and rejects the wrong password", async () => {
  const first = await hashPassword("Valid-2026!", "test-pepper", { iterations: 1000 });
  const second = await hashPassword("Valid-2026!", "test-pepper", { iterations: 1000 });
  assert.notEqual(first.salt, second.salt);
  assert.equal(await verifyPassword("Valid-2026!", first, "test-pepper"), true);
  assert.equal(await verifyPassword("wrong-pass", first, "test-pepper"), false);
});
```

- [ ] **Step 2: Run the primitive test and verify RED**

Run: `node --test tests/auth-primitives.test.mjs`  
Expected: FAIL because `lib/auth/policy.ts`, `crypto.ts`, and `cookies.ts` do not exist.

- [ ] **Step 3: Implement minimal pure modules**

Use `/^[!-~]{8,20}$/`, a lowercase weak-password set, `crypto.subtle.deriveBits` with PBKDF2-HMAC-SHA-256, random salts/tokens from `crypto.getRandomValues`, base64url encoding, fixed-time byte comparison, and production default 600,000 iterations. Cookie serializers must set `Path=/; HttpOnly; Secure; SameSite=Lax` and the exact role lifetime.

- [ ] **Step 4: Run the primitive tests and verify GREEN**

Run: `node --test tests/auth-primitives.test.mjs`  
Expected: all primitive tests PASS with no warnings.

- [ ] **Step 5: Commit**

```bash
git add lib/auth tests/auth-primitives.test.mjs
git commit -m "feat: add secure authentication primitives"
```

### Task 2: D1 schema, migrations, and repository boundary

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/runtime.ts`
- Create: `lib/auth/repository.ts`
- Create: `lib/auth/d1-repository.ts`
- Create: `tests/auth-schema.test.mjs`
- Create: generated `drizzle/0006_*.sql`
- Create: generated `drizzle/meta/0006_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**
- Produces `AuthRepository` with user, credential, session, reset-challenge, rate-limit, and admin-key methods defined in the spec.
- Produces `D1AuthRepository` implementing that contract with prepared statements.
- Extends `ensureCoreSchema()` with idempotent table/index creation and safe legacy-column additions.

- [ ] **Step 1: Write failing schema/repository tests**

The test reads `db/schema.ts` and asserts declarations for `passwordCredentials`, `authSessions`, `passwordResetChallenges`, `adminCredentials`, and `authRateLimits`; it also asserts unique normalized-email/session/admin-key indexes and that the repository exposes `findUserByEmail`, `createAccountWithCredential`, `createSession`, `findSessionByTokenHash`, `revokeUserSessions`, `createResetChallenge`, and `findAdminCredentialByHash`.

- [ ] **Step 2: Run schema tests and verify RED**

Run: `node --test tests/auth-schema.test.mjs`  
Expected: FAIL because the new tables and repository do not exist.

- [ ] **Step 3: Implement schema and repository**

Add the exact fields and indexes from the specification. Use one SQL statement per `prepare()` call and `batch()` for grouped writes. User creation and credential creation must share a D1 batch so partial accounts are not created. Do not delete or rename existing user or business columns.

- [ ] **Step 4: Generate and inspect migration**

Run: `npm run db:generate`  
Inspect the generated migration for destructive table drops, unsafe non-constant ALTER defaults, missing data copies, normalized-email uniqueness, and `PRAGMA optimize`. Amend only the generated SQL necessary for safe D1 application.

- [ ] **Step 5: Execute all migrations against in-memory SQLite**

Run all `drizzle/*.sql` in filename order through `sqlite3 :memory:` and finish with `PRAGMA integrity_check;`.  
Expected: no SQL errors and final output `ok`.

- [ ] **Step 6: Run schema tests and verify GREEN**

Run: `node --test tests/auth-schema.test.mjs`  
Expected: all schema/repository contract tests PASS.

- [ ] **Step 7: Commit**

```bash
git add db lib/auth drizzle tests/auth-schema.test.mjs
git commit -m "feat: add durable authentication storage"
```

### Task 3: Account sessions and registration/login APIs

**Files:**
- Create: `lib/auth/service.ts`
- Create: `lib/auth/request.ts`
- Create: `app/api/auth/register/route.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/session/route.ts`
- Create: `tests/auth-account-api.test.mjs`

**Interfaces:**
- Produces `registerAccount`, `loginAccount`, `logoutSession`, and `resolveAccountSession`.
- API responses use `{ ok, code, message, redirectTo? }` and set/expire `ja_account_session`.
- `resolveAccountSession(request)` returns `{ id, email, name, role, testMode: false } | null`.

- [ ] **Step 1: Write failing account-flow tests**

Use an in-memory `AuthRepository` test implementation to assert: student and enterprise registration, duplicate normalized email rejection, cross-role rejection, invalid password rejection, correct-password login, wrong-password generic failure, status enforcement, exact session lifetime, session lookup by token hash, and logout revocation.

- [ ] **Step 2: Run account-flow tests and verify RED**

Run: `node --test tests/auth-account-api.test.mjs`  
Expected: FAIL because account services/routes do not exist.

- [ ] **Step 3: Implement account services and API routes**

Validate JSON and same-origin mutation requests, run equivalent password work for nonexistent accounts, enforce email-role ownership, apply email and network rate limits, set no-store responses, write audits, and return generic login errors. Registration reuses an existing user only when a password credential does not exist and ownership was previously proven; ordinary duplicate registration remains rejected.

- [ ] **Step 4: Run account-flow tests and verify GREEN**

Run: `node --test tests/auth-account-api.test.mjs`  
Expected: account-flow tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth app/api/auth tests/auth-account-api.test.mjs
git commit -m "feat: add email password account sessions"
```

### Task 4: Password reset and swappable branded mail

**Files:**
- Create: `lib/mail/types.ts`
- Create: `lib/mail/templates.ts`
- Create: `lib/mail/resend.ts`
- Create: `lib/mail/index.ts`
- Create: `lib/auth/password-reset.ts`
- Create: `app/api/auth/password/forgot/route.ts`
- Create: `app/api/auth/password/verify/route.ts`
- Create: `app/api/auth/password/reset/route.ts`
- Create: `tests/password-reset.test.mjs`

**Interfaces:**
- Produces `MailProvider.sendPasswordResetCode(input): Promise<{ id: string }>`.
- Produces `createMailProvider(config)` that returns Resend or an unavailable provider.
- Produces `requestReset`, `verifyResetCode`, and `completePasswordReset`.

- [ ] **Step 1: Write failing password-reset and template tests**

Assert six-digit codes, 10-minute expiry, 60-second resend delay, hourly send cap, five-attempt cap, single use, old-session revocation, credential-version increment, identical unknown-email response, `MAIL_SERVICE_UNAVAILABLE`, Resend HTTPS request shape, idempotency header, and HTML/plain-text templates containing JA Star Plan branding and no password/key/token.

- [ ] **Step 2: Run reset tests and verify RED**

Run: `node --test tests/password-reset.test.mjs`  
Expected: FAIL because mail and reset modules do not exist.

- [ ] **Step 3: Implement reset service, provider, and APIs**

Keep provider configuration behind `RESEND_API_KEY`, `MAIL_FROM`, and `MAIL_REPLY_TO`. Store only code hashes. Verification returns a short-lived opaque reset grant whose hash is stored with the challenge; reset requires that grant and invalidates it atomically with the password change.

- [ ] **Step 4: Run reset tests and verify GREEN**

Run: `node --test tests/password-reset.test.mjs`  
Expected: all reset/provider/template tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/mail lib/auth/password-reset.ts app/api/auth/password tests/password-reset.test.mjs
git commit -m "feat: add branded password recovery flow"
```

### Task 5: Student and enterprise authentication UI

**Files:**
- Create: `app/auth/[role]/page.tsx`
- Create: `app/auth/AuthExperience.tsx`
- Create: `app/auth/forgot-password/page.tsx`
- Create: `app/auth/ForgotPasswordExperience.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Create: `tests/auth-pages.test.mjs`

**Interfaces:**
- Login/register UI calls `/api/auth/login` and `/api/auth/register`.
- Forgot-password UI calls the three reset endpoints and renders unavailable-email state.
- Successful auth uses server-provided `redirectTo` and top-level navigation.

- [ ] **Step 1: Write failing auth-page tests**

Add SSR/source assertions for `/auth/student`, `/auth/enterprise`, login/register tabs, exact fields, password toggle, Caps Lock notice, 8–20 password copy, forgot-password three-step interface, branded image/logo, no ChatGPT sign-in copy, no visible demo credentials, and homepage links to the new routes.

- [ ] **Step 2: Build and run page tests to verify RED**

Run: `npm run build` then `node --test tests/auth-pages.test.mjs`  
Expected: FAIL because the auth pages are absent and homepage links still target workspaces.

- [ ] **Step 3: Implement branded responsive pages**

Compose a shared accessible auth shell. Use existing `/media` JA photographs and brand tokens, semantic labels, `autocomplete="email"`, `current-password`, and `new-password`, disabled submit state, inline errors with `aria-live`, password strength, show/hide controls, and motion-reduction support.

- [ ] **Step 4: Build and run page tests to verify GREEN**

Run: `npm run build` then `node --test tests/auth-pages.test.mjs`  
Expected: auth-page tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/auth app/page.tsx app/globals.css app/privacy app/terms tests/auth-pages.test.mjs
git commit -m "feat: add JA branded account entry experience"
```

### Task 6: JA key login and administrator key management

**Files:**
- Create: `lib/auth/admin-service.ts`
- Create: `app/api/admin-auth/login/route.ts`
- Create: `app/api/admin-auth/logout/route.ts`
- Create: `app/api/admin-auth/keys/route.ts`
- Create: `app/api/admin-auth/keys/[id]/route.ts`
- Create: `app/ja-login/page.tsx`
- Create: `app/ja-login/JAKeyLogin.tsx`
- Modify: `app/ja-console/page.tsx`
- Modify: `app/ja-console/JAConsole.tsx`
- Modify: `app/globals.css`
- Create: `tests/admin-key-auth.test.mjs`

**Interfaces:**
- Produces `resolveAdminSession`, `loginWithAdminKey`, `generateAdminKey`, and `changeAdminKeyStatus`.
- Full generated key format is `JA-STARLIGHT-<label>-<base64url secret>` and is returned only from creation.
- JA console receives the resolved administrator display name.

- [ ] **Step 1: Write failing administrator tests**

Assert key-only login, hashed lookup, generic failure, four-hour session, last-used update, one-time full key response, list output without full keys, suspend/restore/revoke, prevention of revoking the final active key, audit attribution, no homepage JA link, and JA console rejection without admin session.

- [ ] **Step 2: Run administrator tests and verify RED**

Run: `node --test tests/admin-key-auth.test.mjs`  
Expected: FAIL because JA key services, pages, and routes do not exist.

- [ ] **Step 3: Implement JA key auth and management**

Use the separate `ja_admin_session` cookie, server-side admin-role checks, constant-time key verification, rate limiting, single-display key modal, confirmation dialogs for status changes, last-active-key guard, and audit entries for every key action.

- [ ] **Step 4: Run administrator tests and verify GREEN**

Run: `node --test tests/admin-key-auth.test.mjs`  
Expected: administrator tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/admin-service.ts app/api/admin-auth app/ja-login app/ja-console app/globals.css tests/admin-key-auth.test.mjs
git commit -m "feat: secure JA console with managed access keys"
```

### Task 7: Replace existing identity plumbing and preserve data

**Files:**
- Modify: `db/runtime.ts`
- Modify: `app/workspace/page.tsx`
- Modify: `app/workspace/PlatformApp.tsx`
- Modify: `app/api/actions/route.ts`
- Modify: `app/api/admin/route.ts`
- Modify: `app/api/files/route.ts`
- Modify: `app/api/notifications/route.ts`
- Modify: `app/api/platform/route.ts`
- Modify: `app/api/registrations/route.ts`
- Modify: `app/api/social/route.ts`
- Modify: `tests/platform.test.mjs`
- Create: `tests/auth-authorization.test.mjs`

**Interfaces:**
- `getActor(request)` resolves only the account session in production; localhost test helpers remain restricted to localhost.
- `requireAdmin(request)` resolves only the JA session in production.
- Workspace pages redirect anonymous visitors to the exact role auth route with a safe relative return path.

- [ ] **Step 1: Write failing authorization/compatibility tests**

Assert removal of ChatGPT sign-in imports from workspace/JA pages, session-only production actor resolution, safe return paths, role mismatch denial, student/enterprise/admin API separation, suspended-user denial, legacy user ID preservation through password reset claim, and logout buttons posting to the new routes.

- [ ] **Step 2: Run authorization tests and verify RED**

Run: `node --test tests/auth-authorization.test.mjs`  
Expected: FAIL while the existing header-based actor path remains.

- [ ] **Step 3: Replace identity resolution and guards**

Refactor `db/runtime.ts` to call the session services, preserve public catalog behavior, keep localhost-only deterministic actors for SSR regression tests, update workspace and JA redirects, and replace ChatGPT sign-out links with POST logout forms. Do not change owner IDs for existing records.

- [ ] **Step 4: Run authorization and platform tests**

Run: `npm run build` then `node --test tests/auth-authorization.test.mjs tests/platform.test.mjs`  
Expected: both suites PASS.

- [ ] **Step 5: Commit**

```bash
git add db/runtime.ts app/workspace app/ja-console app/api tests
git commit -m "refactor: authorize platform through native sessions"
```

### Task 8: Secure seed initialization, final verification, and publication

**Files:**
- Create: `lib/auth/seed.ts`
- Create: `tests/auth-seed.test.mjs`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `tests/platform.test.mjs`
- Modify: migration/runtime schema files only if final verification identifies an actual compatibility gap

**Interfaces:**
- `ensureAuthSeeds(config, repository)` idempotently creates the two demo accounts and initial JA credential from environment-only secrets.
- The initial JA key is supplied only through `AUTH_SEED_ADMIN_KEY`; no HTTP response ever returns seed credentials.

- [ ] **Step 1: Write failing seed tests**

Assert exact demo emails/roles, environment-only passwords, idempotent reruns, no plaintext secret in source/migrations/logs, an admin key prefix plus high-entropy suffix, and no overwrite of a changed demo password.

- [ ] **Step 2: Run seed tests and verify RED**

Run: `node --test tests/auth-seed.test.mjs`  
Expected: FAIL because seed support does not exist.

- [ ] **Step 3: Implement secure idempotent seeds and configuration documentation**

Use `AUTH_SEED_STUDENT_PASSWORD`, `AUTH_SEED_ENTERPRISE_PASSWORD`, `AUTH_SEED_ADMIN_KEY`, and `AUTH_PEPPER`. Create only missing credentials. Never reset an existing credential during normal requests. Document Resend variables without secret values.

- [ ] **Step 4: Run focused and full verification**

Run, in order:

```bash
node --test tests/auth-primitives.test.mjs tests/auth-schema.test.mjs tests/auth-account-api.test.mjs tests/password-reset.test.mjs tests/auth-pages.test.mjs tests/admin-key-auth.test.mjs tests/auth-authorization.test.mjs tests/auth-seed.test.mjs
npm run lint
npm run build
node --test tests/*.test.mjs
```

Expected: every command exits 0 with no test failures or lint errors.

- [ ] **Step 5: Verify migrations and security scan**

Apply all migrations to in-memory SQLite and require `PRAGMA integrity_check` output `ok`. Search application source, migrations, configuration examples, and logs for the exact demo plaintext passwords, the full JA seed key, ChatGPT sign-in links, fake reset-code responses, `TODO`, and `TBD`; expected result is no forbidden production occurrence. The approved design record may name the agreed demo credentials, but executable source and migrations must not.

- [ ] **Step 6: Commit validated source**

```bash
git add --all
git commit -m "feat: deliver native account and JA key authentication"
```

- [ ] **Step 7: Publish**

Configure production secrets through Sites environment variables, push the exact validated commit to the Sites source repository and GitHub, package the successful build, save a Sites version, deploy to the existing public access level after the user's already-given publication request, poll to success, and verify both the Sites URL and `https://ja-starlight.vercel.app` return the new auth routes.
