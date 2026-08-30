# JA 星光计划学生端精细化 Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` and complete one task at a time. Each task starts with a failing test and ends with its own verification commit.

**Goal:** 将学生端从可演示页面升级为可恢复、可收藏、可报名、可互动、可沉淀成长档案的正式个人工作空间。

**Architecture:** 保留既有正式会话、公开目录和活动报名接口；新增学生私有收藏、活动日历和提醒数据服务。学生 UI 从巨型工作台中逐步抽离为 `app/workspace/student` 模块，所有详情继续使用稳定 workspace URL 与共享 SidePanel/Dialog。写操作由 API 完成权限校验并写审计，浏览器状态仅保存筛选和当前对象。

**Tech Stack:** React 19、TypeScript、Vinext、Cloudflare D1/R2、Node test runner、CSS motion tokens。

**Spec:** `docs/superpowers/specs/2026-08-30-product-experience-redesign.md` 第 7、10、11、15 节。

## Global Constraints

- 不增加站内岗位申请和私信；岗位仅提供招聘邮箱。
- 收藏、简历、报名和成长记录只对学生本人可见。
- 所有筛选和详情写入 URL；临时表单不写入 URL。
- 活动报名使用发布方配置的动态字段，报名后进入企业或 JA 对应审核队列。
- 自动认证经历不可删除或伪造；手动经历可编辑、排序和删除。
- 所有新增动效使用既有 motion tokens，并兼容减少动态效果。

### Task 1：学生私有数据服务

**Files:** `db/schema.ts`、`db/runtime.ts`、`drizzle/0003_student_experience.sql`、`app/api/student/route.ts`、`lib/services/student.ts`、`tests/student-data.test.mjs`

- [ ] 为收藏、活动日历和提醒建立兼容迁移、索引与纯函数规范化器。
- [ ] 实现仅学生本人可读写的 GET/POST/DELETE 接口，重复收藏和重复日历项保持幂等。
- [ ] 报名成功时自动写入日历；取消报名时更新日历状态，不物理删除历史。
- [ ] 写入收藏、提醒和手动成长经历时记录审计。

### Task 2：学生总览与收藏入口

**Files:** `app/workspace/student/StudentOverview.tsx`、`app/workspace/student/FavoritesPanel.tsx`、`app/workspace/PlatformApp.tsx`、`tests/student-overview.test.mjs`

- [ ] 最近 5 个机会、3 个活动、3 条内容使用真实排序并深链接准确对象。
- [ ] 成长时间轴预览显示日期、名称、产出和 JA 认证；移除抽象图表。
- [ ] 新增“我的收藏”入口和按三类分组的 SidePanel，不增加左侧一级导航。
- [ ] 增加骨架、空状态、失败重试和首次轻量分组进入。

### Task 3：机会筛选、收藏与邮箱动作

**Files:** `app/workspace/student/OpportunityBrowser.tsx`、`app/components/catalog/FavoriteButton.tsx`、`lib/catalog/student-opportunity-url.ts`、`tests/student-opportunities.test.mjs`

- [ ] 展开式类别、学历、行业和 0–500 元双端薪资筛选写入 URL并可恢复。
- [ ] 搜索使用防抖，激活筛选以标签单项清除，结果数量实时更新。
- [ ] 岗位卡完整展示 Logo、企业/岗位同级标题、元数据、邮箱、复制、写邮件、收藏和详情。
- [ ] 企业名称进入企业公开主页；详情 SidePanel 恢复焦点并支持准确深链接。

### Task 4：成长活动、报名与日历

**Files:** `app/workspace/student/ActivityExperience.tsx`、`app/workspace/student/ActivityCalendar.tsx`、`app/workspace/student/RegistrationPanel.tsx`、`tests/student-activities.test.mjs`

- [ ] 全量有效活动自动轮播，5 秒切换，可暂停且不展示报名字段摘要。
- [ ] 下方活动一行一条，按运营排序和发布时间排列，并可从 URL 打开详情。
- [ ] 报名 SidePanel 自动预填资料、渲染动态字段、逐项校验并展示完整状态。
- [ ] 报名成功加入月历和近期列表；截止前与活动前提醒可单项关闭。

### Task 5：成长内容与可靠互动

**Files:** `app/workspace/student/LearningCenter.tsx`、`app/workspace/student/ContentReader.tsx`、`tests/student-content.test.mjs`

- [ ] 图文与视频详情使用不同阅读布局，补齐章节、附件、发布方和阅读时长。
- [ ] 点赞使用乐观更新与失败回滚；评论提交防重复并显示发送状态。
- [ ] 学生仅可删除自己的评论，回复显示企业或 JA 身份。
- [ ] 内容支持收藏、筛选 URL 和准确详情深链接。

### Task 6：成长主页、私有简历与时间轴

**Files:** `app/workspace/student/StudentProfile.tsx`、`app/workspace/student/ResumePanel.tsx`、`app/workspace/student/GrowthTimeline.tsx`、`app/api/files/route.ts`、`tests/student-profile.test.mjs`

- [ ] 左侧固定资料卡，右侧时间轴独立滚动；不展示简历截图和重复项目列表。
- [ ] 简历限制为 PDF，展示大小和隐私说明，上传后先进入提取确认再写入资料。
- [ ] 查看完整简历使用私有临时访问路径；解析失败保留文件与手动编辑。
- [ ] 时间轴合并自动 JA 认证与手动经历；支持详情、公开控制、成果图片/链接、上下移动和删除。

### Task 7：学生端阶段验收

- [ ] 运行 lint、build 与全部测试。
- [ ] 浏览器验收五个稳定 URL、筛选刷新恢复、收藏、报名、日历、互动、简历和时间轴。
- [ ] 检查键盘焦点、减少动态、网络失败、空状态和 1024px 横向溢出。
- [ ] 不部署；通过后进入企业端阶段。
