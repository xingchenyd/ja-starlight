# JA 星光计划设计系统与导航基础 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立统一的 JA 设计组件、动效令牌、工作台深链接导航和状态反馈，为后续逐模块精修提供稳定基础。

**Architecture:** 保留现有 Vinext/React 业务 API 和数据结构，在 `app/components` 新增可复用 UI 与 motion 组件，在 `lib/ui` 建立纯路由模型。学生、企业和 JA 工作台壳层先迁移到新基础，业务模块内容暂不重写；原有查询地址继续兼容，新导航使用可刷新、可前进后退的稳定路径。

**Tech Stack:** React 19、TypeScript 5.9、Vinext、原生 CSS/View Transition API、Node test runner、ESLint。

**Spec:** `docs/superpowers/specs/2026-08-30-product-experience-redesign.md`

## Global Constraints

- 本阶段不修改岗位、活动、内容、成长主页、报名和审核的业务规则。
- 不新增动画依赖；使用原生 CSS、React 和渐进增强的 View Transition API。
- 红色只用于错误、危险和删除；常规强调使用 JA 青、深蓝、绿色和黄色。
- 普通交互不超过 340ms；主页故事轮播不属于本阶段。
- 尊重 `prefers-reduced-motion`，关闭位移、缩放和持续动画后功能仍完整。
- 左侧导航和顶部栏在栏目切换时不重新渲染动画。
- 新组件不使用阻碍未来移动端适配的固定页面宽度。
- 旧 `/workspace?role=...&tab=...` 地址保持兼容。
- 每个任务先观察失败测试，再完成最小实现和回归。

---

### Task 1: 统一视觉与动效令牌

**Files:**
- Create: `app/design-system/tokens.css`
- Create: `app/design-system/motion.css`
- Modify: `app/globals.css`
- Test: `tests/design-system.test.mjs`

**Interfaces:**
- Produces CSS custom properties `--ja-*`、`--motion-duration-*`、`--motion-ease-*`、`--focus-ring`。
- Produces semantic classes `.motion-page-enter`、`.motion-stagger`、`.motion-pressable`、`.motion-panel-enter`。

- [ ] **Step 1: Write the failing token test**

```js
test("design system exposes semantic JA motion tokens", async () => {
  const tokens = await readFile("app/design-system/tokens.css", "utf8");
  const motion = await readFile("app/design-system/motion.css", "utf8");
  for (const name of ["--ja-deep", "--ja-aqua", "--ja-yellow", "--focus-ring"]) assert.match(tokens, new RegExp(name));
  for (const name of ["--motion-duration-micro", "--motion-duration-page", "--motion-ease-enter", "prefers-reduced-motion"]) assert.match(motion, new RegExp(name));
});
```

- [ ] **Step 2: Run the token test and verify RED**

Run: `node --test tests/design-system.test.mjs`  
Expected: FAIL because the two design-system CSS files do not exist.

- [ ] **Step 3: Implement exact semantic tokens**

```css
:root {
  --ja-deep: #24404d;
  --ja-aqua: #00b7c3;
  --ja-teal: #078b9b;
  --ja-ice: #c2edf0;
  --ja-green: #8ac53f;
  --ja-yellow: #e9e63f;
  --ja-danger: #f65f4e;
  --focus-ring: 0 0 0 3px rgba(0, 183, 195, 0.28);
  --motion-duration-micro: 90ms;
  --motion-duration-quick: 140ms;
  --motion-duration-standard: 220ms;
  --motion-duration-panel: 280ms;
  --motion-duration-page: 340ms;
  --motion-ease-enter: cubic-bezier(0, 0, 0.3, 1);
  --motion-ease-standard: cubic-bezier(0.2, 0, 0.38, 0.9);
  --motion-ease-exit: cubic-bezier(0.2, 0, 1, 0.9);
}
```

`motion.css` must animate only transform, opacity, color, background, border-color and box-shadow, and must replace motion with instant state changes under reduced motion.

- [ ] **Step 4: Import tokens before legacy CSS and verify GREEN**

Run: `node --test tests/design-system.test.mjs && npm run build`  
Expected: test and production build PASS.

- [ ] **Step 5: Commit**

```bash
git add app/design-system app/globals.css tests/design-system.test.mjs
git commit -m "feat: add JA design and motion tokens"
```

### Task 2: Button、反馈和状态基础组件

**Files:**
- Create: `app/components/ui/Button.tsx`
- Create: `app/components/ui/Feedback.tsx`
- Create: `app/components/ui/Surface.tsx`
- Create: `app/components/ui/index.ts`
- Create: `app/design-system/components.css`
- Modify: `app/globals.css`
- Test: `tests/ui-primitives.test.mjs`

**Interfaces:**
- Produces `Button(props)` with variants `primary | secondary | tertiary | ghost | danger` and states `idle | loading | success | error`.
- Produces `IconButton({ label, ...buttonProps })` requiring an accessible label.
- Produces `ToastProvider`, `useToast()` and `ToastViewport` with `{ show(message, tone?) }`.
- Produces `Skeleton`, `EmptyState` and `InlineError`.

- [ ] **Step 1: Write failing component-contract tests**

```js
test("shared controls expose formal action and feedback states", async () => {
  const button = await readFile("app/components/ui/Button.tsx", "utf8");
  const feedback = await readFile("app/components/ui/Feedback.tsx", "utf8");
  assert.match(button, /primary.*secondary.*tertiary.*ghost.*danger/s);
  assert.match(button, /loading.*success.*error/s);
  assert.match(feedback, /ToastProvider/);
  assert.match(feedback, /aria-live/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/ui-primitives.test.mjs`  
Expected: FAIL because shared UI components do not exist.

- [ ] **Step 3: Implement Button and IconButton**

```tsx
export type ActionState = "idle" | "loading" | "success" | "error";
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";
export function Button({ variant = "primary", state = "idle", children, disabled, ...props }: ButtonProps) {
  return <button {...props} disabled={disabled || state === "loading"} data-variant={variant} data-state={state} className="ui-button motion-pressable">{state === "loading" ? <span className="ui-spinner" aria-hidden/> : null}<span>{state === "success" ? "已完成" : children}</span></button>;
}
```

Loading must preserve button width; success/error must be announced through a sibling live region, not only color.

- [ ] **Step 4: Implement feedback and surface components**

`ToastProvider` stores at most three notices, removes each after 2.6 seconds, pauses dismissal while hovered/focused, and exposes `role="status"` for normal messages and `role="alert"` for errors. `Skeleton`, `EmptyState` and `InlineError` share semantic component classes.

- [ ] **Step 5: Add component styles and verify GREEN**

Run: `node --test tests/ui-primitives.test.mjs && npm run build`  
Expected: tests and build PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/ui app/design-system/components.css app/globals.css tests/ui-primitives.test.mjs
git commit -m "feat: add shared action and feedback components"
```

### Task 3: Accessible Dialog、SidePanel 和页面过渡

**Files:**
- Create: `app/components/ui/Overlay.tsx`
- Create: `app/components/motion/Transition.tsx`
- Create: `app/components/motion/index.ts`
- Modify: `app/design-system/components.css`
- Test: `tests/overlay-motion.test.mjs`

**Interfaces:**
- Produces `Dialog({ open, title, dirty?, onClose, children })`.
- Produces `SidePanel({ open, title, dirty?, onClose, children })`.
- Produces `PageTransition({ identity, direction, children })`.
- Produces `runViewTransition(update: () => void): void` with no-op compatibility fallback.
- Produces `useReducedMotion(): boolean`.

- [ ] **Step 1: Write failing overlay and motion tests**

```js
test("overlays manage focus and motion has a compatibility fallback", async () => {
  const overlay = await readFile("app/components/ui/Overlay.tsx", "utf8");
  const transition = await readFile("app/components/motion/Transition.tsx", "utf8");
  assert.match(overlay, /role="dialog"/);
  assert.match(overlay, /aria-modal="true"/);
  assert.match(overlay, /Escape/);
  assert.match(transition, /startViewTransition/);
  assert.match(transition, /matchMedia/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/overlay-motion.test.mjs`  
Expected: FAIL because overlay and transition components do not exist.

- [ ] **Step 3: Implement overlay behavior**

On open, store `document.activeElement`, lock body scroll, focus the heading/first control, trap Tab within the overlay, close on Escape when not dirty, and restore the trigger focus on close. If `dirty` is true, call `window.confirm("尚有未保存内容，确认离开？")` before closing.

- [ ] **Step 4: Implement transition behavior**

```ts
export function runViewTransition(update: () => void) {
  const documentWithTransition = document as Document & { startViewTransition?: (callback: () => void) => void };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !documentWithTransition.startViewTransition) update();
  else documentWithTransition.startViewTransition(update);
}
```

`PageTransition` sets `data-direction="forward|back|none"`, changes its key by identity, and does not animate surrounding side/top navigation.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/overlay-motion.test.mjs && npm run lint && npm run build`  
Expected: all commands PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/ui/Overlay.tsx app/components/motion app/design-system/components.css tests/overlay-motion.test.mjs
git commit -m "feat: add accessible overlays and view transitions"
```

### Task 4: Stable workspace route model

**Files:**
- Create: `lib/ui/workspace-routes.ts`
- Create: `app/workspace/[role]/[tab]/page.tsx`
- Create: `app/workspace/WorkspaceRoute.tsx`
- Modify: `app/workspace/page.tsx`
- Modify: `app/auth/AuthPanel.tsx`
- Test: `tests/workspace-routes.test.mjs`

**Interfaces:**
- Produces `WORKSPACE_TABS`.
- Produces `normalizeWorkspaceRoute(role, tab)`.
- Produces `workspacePath(role, tab, item?)`.
- Produces a shared server-side `WorkspaceRoute` that validates account role and renders `PlatformApp`.
- Legacy query route redirects to the canonical path.

- [ ] **Step 1: Write failing pure route tests**

```js
test("workspace paths are canonical and reject cross-role tabs", async () => {
  const routes = await import("../lib/ui/workspace-routes.ts");
  assert.equal(routes.workspacePath("student", "activities"), "/workspace/student/activities");
  assert.equal(routes.workspacePath("enterprise", "registrations", "reg-1"), "/workspace/enterprise/registrations?item=reg-1");
  assert.deepEqual(routes.normalizeWorkspaceRoute("student", "registrations"), { role: "student", tab: "overview" });
});
```

- [ ] **Step 2: Run route tests and verify RED**

Run: `node --experimental-strip-types --test tests/workspace-routes.test.mjs`  
Expected: FAIL because route helpers do not exist.

- [ ] **Step 3: Implement route helpers**

```ts
export const WORKSPACE_TABS = {
  student: ["overview", "opportunities", "activities", "content", "profile"],
  enterprise: ["overview", "positions", "activities", "content", "feedback", "registrations", "profile"],
} as const;
export function workspacePath(role: WorkspaceRole, tab: string, item?: string) {
  const valid = normalizeWorkspaceRoute(role, tab);
  const query = item ? `?item=${encodeURIComponent(item)}` : "";
  return `/workspace/${valid.role}/${valid.tab}${query}`;
}
```

- [ ] **Step 4: Factor shared server gate and canonical pages**

`WorkspaceRoute` must reuse native account sessions, reject mismatched roles, preserve `item`, and render the existing `PlatformApp`. Legacy `/workspace?role=&tab=` must issue a server redirect to `workspacePath()`; anonymous visitors go to the matching auth route with a safe return path.

- [ ] **Step 5: Update auth destinations and verify GREEN**

Run: `node --experimental-strip-types --test tests/workspace-routes.test.mjs && npm run build`  
Expected: route tests and build PASS; `/workspace?role=student&tab=activities` resolves to `/workspace/student/activities`.

- [ ] **Step 6: Commit**

```bash
git add lib/ui/workspace-routes.ts app/workspace app/auth/AuthPanel.tsx tests/workspace-routes.test.mjs
git commit -m "feat: add canonical workspace routes"
```

### Task 5: Migrate student and enterprise workspace shells

**Files:**
- Modify: `app/workspace/PlatformApp.tsx`
- Modify: `app/design-system/components.css`
- Modify: `app/globals.css`
- Test: `tests/workspace-shell.test.mjs`
- Modify: `tests/platform.test.mjs`

**Interfaces:**
- Consumes `workspacePath`, `PageTransition`, `ToastProvider`, `useToast`, `Button` and `IconButton`.
- Produces canonical navigation without full reload, popstate synchronization, per-tab scroll restoration and a stable side/top shell.

- [ ] **Step 1: Write failing shell behavior tests**

```js
test("workspace shell uses canonical history and shared feedback", async () => {
  const source = await readFile("app/workspace/PlatformApp.tsx", "utf8");
  assert.match(source, /workspacePath/);
  assert.match(source, /pushState/);
  assert.match(source, /popstate/);
  assert.match(source, /PageTransition/);
  assert.match(source, /ToastProvider/);
  assert.doesNotMatch(source, /starlight-demo-id/);
});
```

- [ ] **Step 2: Run shell tests and verify RED**

Run: `node --test tests/workspace-shell.test.mjs`  
Expected: FAIL because the current shell uses local tab state, legacy toast, and demo storage naming.

- [ ] **Step 3: Implement canonical navigation**

Replace nav click handlers with `navigate(tab)`: save current tab scroll, call `runViewTransition(() => history.pushState(...))`, set the validated tab, reset/fetch scroll for the destination, and focus the new page heading after transition. Add a popstate listener that derives role/tab from `location.pathname`.

- [ ] **Step 4: Replace shell feedback and remove demo identity residue**

Remove `getDemoId`, `x-starlight-demo-id`, `x-starlight-role`, inline toast storage and old toast markup. Keep authenticated requests as ordinary same-origin fetches. Wrap the workspace in `ToastProvider`; adapt existing `flash(message)` calls through `useToast().show(message)` without changing business functions.

- [ ] **Step 5: Keep navigation fixed and transition content only**

Side and topbar remain outside `PageTransition`. Add `aria-current="page"` to the active navigation button, focus-visible styles to navigation and notification controls, and stop applying blur to page entry.

- [ ] **Step 6: Verify GREEN and regression**

Run: `node --test tests/workspace-shell.test.mjs tests/platform.test.mjs && npm run lint && npm run build`  
Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add app/workspace/PlatformApp.tsx app/design-system/components.css app/globals.css tests/workspace-shell.test.mjs tests/platform.test.mjs
git commit -m "refactor: unify workspace navigation and feedback"
```

### Task 6: Migrate JA shell and perform phase verification

**Files:**
- Create: `lib/ui/ja-routes.ts`
- Modify: `app/ja-console/JAConsole.tsx`
- Modify: `app/ja-console/page.tsx`
- Create: `app/ja-console/[tab]/page.tsx`
- Modify: `app/design-system/components.css`
- Test: `tests/ja-shell.test.mjs`
- Modify: `tests/platform.test.mjs`

**Interfaces:**
- Produces `JA_TABS`, `normalizeJATab(tab)` and `jaConsolePath(tab)`.
- Consumes shared transition, button, overlay and feedback components.
- Produces canonical JA module URLs and the same visual/interaction shell as student and enterprise workspaces.

- [ ] **Step 1: Write failing JA shell tests**

```js
test("JA console uses canonical modules and shared interaction primitives", async () => {
  const source = await readFile("app/ja-console/JAConsole.tsx", "utf8");
  assert.match(source, /jaConsolePath/);
  assert.match(source, /PageTransition/);
  assert.match(source, /ToastProvider/);
  assert.match(source, /aria-current/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/ja-shell.test.mjs`  
Expected: FAIL because the current JA shell has local-only navigation and bespoke notice/animation behavior.

- [ ] **Step 3: Implement JA route model and pages**

Allowed tabs are `pulse`, `review`, `organizations`, `publish`, `records`, `feedback`, `integrity`, `audit`, `keys`. `/ja-console` redirects to `/ja-console/pulse`; invalid tabs normalize to `pulse`. Server pages preserve the native JA key session gate.

- [ ] **Step 4: Migrate JA shell**

Use shared navigation, `PageTransition`, `ToastProvider`, buttons and overlays for the shell while leaving review/publish business content unchanged. Add browser history synchronization, focus restoration and per-tab scroll memory exactly as in the workspace shell.

- [ ] **Step 5: Run phase verification**

Run in order:

```bash
node --test tests/design-system.test.mjs tests/ui-primitives.test.mjs tests/overlay-motion.test.mjs
node --experimental-strip-types --test tests/workspace-routes.test.mjs
node --test tests/workspace-shell.test.mjs tests/ja-shell.test.mjs tests/platform.test.mjs
npm run lint
npm run build
node --experimental-strip-types --test tests/*.test.mjs
```

Expected: every command exits 0; no legacy route, authentication, publishing, registration or review test regresses.

- [ ] **Step 6: Inspect source and rendered behavior**

Check desktop public home, `/workspace/student/overview`, `/workspace/enterprise/overview`, and `/ja-console/pulse`. Verify fixed navigation, keyboard focus, back/forward, refresh recovery, reduced motion, loading/toast states, no content blur and no horizontal overflow at 1024px width.

- [ ] **Step 7: Commit validated phase**

```bash
git add lib/ui/ja-routes.ts app/ja-console app/design-system/components.css tests
git commit -m "refactor: unify JA console navigation shell"
```

## Phase Completion Gate

Do not begin the public-home or student business-module plan until all six tasks pass, the complete existing suite remains green, and the phase is reviewed against the approved specification. No GitHub push or public deployment occurs until the user asks for publication or the later full-platform deployment phase reaches its approved gate.
