# 星光计划基础功能完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成登录页横向故事、品牌更名、公开成长档案、动态发布确认、正式数据初始化和安全管理员密钥六项基础改造。

**Architecture:** 保持现有 Vinext、D1、R2 与自建认证架构。新增独立的成长档案分享表和公开路由；正式数据通过幂等服务初始化；可见文案替换不改内部路由和数据标识。

**Tech Stack:** React 19、Vinext、TypeScript、Cloudflare D1/R2、Drizzle ORM、Node test runner、CSS scroll snap。

**Spec:** `docs/superpowers/specs/2026-08-31-foundation-hardening-design.md`

## Global Constraints

- 本轮不实现官网新动效和学生端新增建议。
- 用户可见品牌统一为“星光计划”，内部 `/ja-console` 等兼容标识不变。
- 公开成长档案不得暴露联系方式、私有简历和私密经历。
- 密钥明文不得进入 Git；数据库只保存哈希。
- 所有数据库初始化必须幂等且不得覆盖用户修改。

---

### Task 1: 学生登录页横向故事

**Files:**
- Modify: `app/auth/AuthShell.tsx`
- Modify: `app/auth/student/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/auth-pages.test.mjs`

**Interfaces:**
- Consumes: `AuthShell` 的现有标题、说明和子表单。
- Produces: `AuthShell` 可选 `stories` 属性和可触摸的 `.auth-story-track`。

- [ ] **Step 1: 写失败测试**：断言学生页传入多条故事，Shell 包含横向轨道、scroll-snap 与可访问标签，且页面容器无全页横向溢出。
- [ ] **Step 2: 运行 `node --test tests/auth-pages.test.mjs`**，确认因轨道不存在而失败。
- [ ] **Step 3: 最小实现**：添加可选故事数组、横向滚动容器、触摸和滚轮转换，企业页保持单画面。
- [ ] **Step 4: 重跑测试**，确认通过。

### Task 2: 可见品牌文案统一

**Files:**
- Modify: `app/**/*.tsx`, `lib/auth/mail.ts`, `db/runtime.ts`, `.env.example`, `README.md`
- Test: `tests/brand-copy.test.mjs`
- Modify: existing tests whose expected public copy changes

**Interfaces:**
- Consumes: 所有用户可见字符串。
- Produces: 用户界面统一的“星光计划”品牌；内部标识保持兼容。

- [ ] **Step 1: 写失败测试**：扫描产品源文件中的 JSX/元数据/邮件模板，禁止用户可见的旧品牌组合，并确认“星光计划认证”“星光计划运营后台”存在。
- [ ] **Step 2: 运行品牌测试**，确认旧文案导致失败。
- [ ] **Step 3: 最小替换**：逐个上下文修改可见文案，保留代码标识、路由名和公司字段中的合法内部兼容值。
- [ ] **Step 4: 重跑品牌及既有界面测试**。

### Task 3: 公开成长档案令牌与公开页

**Files:**
- Modify: `db/schema.ts`, `db/runtime.ts`
- Create: `drizzle/0008_student_profile_share.sql`
- Create: `lib/services/student-share.ts`
- Create: `app/api/student/share/route.ts`
- Create: `app/api/public/growth/[token]/route.ts`
- Create: `app/growth/share/[token]/page.tsx`
- Create: `app/growth/share/[token]/PublicGrowthProfile.tsx`
- Modify: `app/workspace/student/StudentProfile.tsx`
- Modify: `app/workspace/student/student-profile.css`
- Modify: `app/workspace/student/OpportunityBrowser.tsx`
- Modify: `app/opportunities/[id]/JobDetailView.tsx`
- Test: `tests/student-share.test.mjs`

**Interfaces:**
- Produces: `POST /api/student/share` `{ url, expiresAt }`，`GET /api/student/share` 当前状态，`DELETE /api/student/share` 撤销；公开页 `/growth/share/:token`。
- Public data: `{ profile, experiences }`，其中 experiences 只含 `is_public=1`。

- [ ] **Step 1: 写服务层失败测试**：令牌哈希、有效期和公开字段过滤。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 实现 schema、服务和迁移并运行 `npm run db:generate` 后检查 SQL**。
- [ ] **Step 4: 写路由与界面失败测试**：无登录公开路由、生成/复制/撤销按钮、邮件正文包含成长档案链接。
- [ ] **Step 5: 运行测试确认失败**。
- [ ] **Step 6: 实现 API、公开页、成长主页分享控制和投递邮件正文**。
- [ ] **Step 7: 重跑分享测试和学生端测试**。

### Task 4: 发布前确认动态状态

**Files:**
- Create: `lib/services/publish-readiness.ts`
- Modify: `app/workspace/PlatformApp.tsx`
- Modify: `app/workspace/enterprise/enterprise-workspace.css`
- Test: `tests/enterprise-publishing.test.mjs`

**Interfaces:**
- Produces: `buildPublishReadiness(kind, form, blocks)` 返回三项 `{ label, complete, detail }`。

- [ ] **Step 1: 写失败测试**：空字段返回未完成，补齐字段后独立变为完成，界面不再输出 1/2/3 状态符号。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 实现纯函数和统一图标渲染**。
- [ ] **Step 4: 重跑企业发布测试**。

### Task 5: 正式业务数据幂等初始化

**Files:**
- Create: `lib/platform/formal-seed-data.ts`
- Create: `lib/platform/ensure-formal-data.ts`
- Modify: `db/runtime.ts`
- Modify: `lib/auth/environment.ts`
- Test: `tests/formal-seed.test.mjs`

**Interfaces:**
- Produces: `ensureFormalPlatformData(db)`；固定 ID 的企业、学生、机会、活动、内容、经历与报名数据。

- [ ] **Step 1: 写失败测试**：数量下限、湖南范围、报名多状态、企业/星光计划发布归属和固定 ID。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 编写真实业务内容与幂等插入服务，不覆盖已存在记录**。
- [ ] **Step 4: 在核心环境初始化中调用并重跑种子测试及审核测试**。

### Task 6: 管理员密钥和完整性审计

**Files:**
- Create (ignored): `.dev.vars`
- Modify: `.env.example`, `README.md`
- Modify: affected source files found by audit
- Test: `tests/auth-seed.test.mjs`, `tests/product-completeness.test.mjs`

**Interfaces:**
- Consumes: `AUTH_PEPPER`, `AUTH_SEED_*`。
- Produces: 可落库的正式本地账号和管理密钥；产品界面无 Demo/内测占位。

- [ ] **Step 1: 写失败测试**：安全配置说明、非演示可见文案、无空 href/无动作按钮与无用户可见待实现提示。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 生成本地安全配置，调整正式账号标识与初始化文案，修复审计命中的闭环问题**。
- [ ] **Step 4: 运行认证和完整性测试并验证数据库存在用户与管理密钥哈希**。

### Task 7: 全量验证

**Files:**
- Modify: tests and source only for discovered regressions

- [ ] **Step 1: 运行 `npm test` 并修复失败**。
- [ ] **Step 2: 运行 `npm run lint` 并修复错误**。
- [ ] **Step 3: 运行 `npm run build` 并确认生产构建成功**。
- [ ] **Step 4: 对关键路由执行 HTTP 与浏览器交互检查，确认登录横滑、公开分享、邮件投递、发布确认、报名审核和管理登录可用**。
- [ ] **Step 5: 检查 `git diff`，确认没有密钥、构建产物或无关文件进入提交范围**。
