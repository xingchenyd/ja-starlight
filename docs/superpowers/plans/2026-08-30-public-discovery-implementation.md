# JA 星光计划公共主页与公开目录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让匿名访客看到真实、可控制、可深链接的岗位、活动和成长内容，并消除主页演示式展开与混合假数据。

**Architecture:** 保留现有 `/api/catalog` 与静态兜底数据，建立纯函数统一目录排序、去重和公开时间判断。主页栏目只取前三条并跳转完整目录；故事轮播消费全部有效推荐记录并提供符合 WAI 的暂停控制。公开目录把筛选写入 URL，详情链接统一指向稳定学生端路径。

**Tech Stack:** React 19、TypeScript、Vinext、原生 History API、Node test runner、CSS motion tokens。

**Spec:** `docs/superpowers/specs/2026-08-30-product-experience-redesign.md`

## Global Constraints

- 有真实目录记录时不混入静态示例；无真实数据时才使用品牌兜底。
- 主页三个栏目各显示 3 条并使用“查看全部”链接。
- 轮播使用全部有效活动和成长内容，5 秒切换，600ms 动效，支持上一张、下一张、暂停/继续、悬停与键盘暂停。
- 关闭动态效果时不自动播放。
- 公开页面不显示 JA 后台入口，不增加岗位站内申请。
- 详情与学生端入口使用 canonical workspace URL。

---

### Task 1: 公共目录选择器

**Files:**
- Create: `lib/catalog/public-catalog.ts`
- Test: `tests/public-catalog.test.mjs`

**Interfaces:**
- Produces `isPublicNow(payload, now)`、`sortPublicRecords(records)`、`mergeCatalogRecords(live, fallback, kind)`。

- [ ] Write failing tests for scheduled, offline, sorted, deduplicated and fallback behavior.
- [ ] Run `node --experimental-strip-types --test tests/public-catalog.test.mjs` and observe RED.
- [ ] Implement the three pure functions without UI dependencies.
- [ ] Re-run the test and commit.

### Task 2: 主页三栏目

**Files:**
- Modify: `app/HomeSections.tsx`
- Modify: `app/opportunities/page.tsx`
- Modify: `app/content/page.tsx`
- Test: `tests/public-home.test.mjs`

**Interfaces:**
- Consumes `mergeCatalogRecords`.
- Produces three fixed three-card sections and canonical “查看全部” links.

- [ ] Write failing rendered-home assertions for exactly three records and real directory links.
- [ ] Replace inline expansion state with directory links; remove category button wall from the homepage.
- [ ] Update student-space links to canonical workspace routes.
- [ ] Run public-home and platform tests, then commit.

### Task 3: 可控制的全量故事轮播

**Files:**
- Modify: `app/HomeCarousel.tsx`
- Modify: `app/design-system/motion.css`
- Modify: `app/globals.css`
- Test: `tests/home-carousel.test.mjs`

**Interfaces:**
- Consumes `sortPublicRecords`, `useReducedMotion`.
- Produces previous/next/pause controls, current index label, focus-pause state and image fallback.

- [ ] Write failing carousel contract tests.
- [ ] Implement 5000ms auto advance, 600ms story transition and manual pause/resume.
- [ ] Use all live records when available; use fallback slides only when the catalog is empty.
- [ ] Verify reduced motion, keyboard focus and build, then commit.

### Task 4: 公开目录 URL 与详情入口

**Files:**
- Modify: `app/opportunities/OpportunityCatalog.tsx`
- Modify: `app/content/ContentCatalog.tsx`
- Modify: `app/activities/[id]/ActivityDetailView.tsx`
- Modify: `app/content/[id]/ContentDetailView.tsx`
- Test: `tests/public-navigation.test.mjs`

**Interfaces:**
- Produces search/category URL synchronization and canonical student item links.

- [ ] Write failing tests for URL serialization and canonical detail links.
- [ ] Update filters through `history.replaceState` without reload and restore from URL.
- [ ] Replace legacy workspace query links.
- [ ] Run public navigation, lint, build and the full suite, then commit.

## Completion Gate

Run `npm run lint`, `npm run build`, `node --experimental-strip-types --test tests/*.test.mjs`, then browser-check the homepage, all three directories, carousel keyboard controls, invalid detail states and 1024px overflow. Do not deploy in this phase.
