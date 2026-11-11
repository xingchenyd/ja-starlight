# 实施与迁移计划

保留 React / Vinext、现有邮箱密码认证、SQLite/D1 语句适配器以及媒体存储适配器。新增领域模块，不重建旧账号和报名库。

1. 新增 schools、school_memberships、business_grants、business_invitations、platform_owner 表及索引；旧用户及资料不迁移删除。
2. 基础登录角色增加 operator，公共注册仍仅允许学生/企业。独立激活流程创建校外人员账号。
3. 权限在 lib/campus/access.ts 中集中校验，每次请求查询有效任命，不信任前端身份和学校头。
4. 发布所有权采用 school:<school-id>；creatorId、submittedBy 由服务端写入，避免自己审自己。
5. 平台原发布、报名与竞赛接口按明确业务能力开放；不扩大 requireAdmin 的含义。
6. 唯一技术管理密钥通过服务端轮换；业务人员不能创建管理密钥。旧密钥不允许被种子配置重新激活。
7. 本地预览数据与线上数据分目录。新增功能只推独立分支，用户验收后再决定发布。

## 数据模型

- users.role: student / enterprise / operator；admin 身份来自唯一的管理密钥。
- platform_owner: 单行约束 id=1，指向唯一有效凭证。
- schools: 合作学校目录。
- school_memberships: 每位学生仅一条当前学校关系，pending → verified/rejected。
- business_grants: 带学校范围的伙伴授权；或不绑定学校的 reviewer/lead，保留撤销历史。
- business_invitations: 校外账号激活，哈希令牌、有效期、消费时间。
- student_experiences: source_type=campus-appointment，source_id=任命 ID；认证由任职状态驱动，默认不公开。
- workspace_records: 继续保存活动、内容和版本；学校所有权不依赖某一届伙伴。
- activity_registrations: 沿用 answers + form_snapshot，归实际发布方管理。

## 接口

- GET/POST /api/campus：学校目录、本人学籍、脱敏本校学生、任命、邀请。
- POST /api/campus/activate：一次性激活校外账号。
- GET/POST /api/campus/publications：范围内发布，草稿、重新提交与版本校验。
- GET /api/operations：按授权读取业务审核队列，不返回系统密钥、私密简历或非本方问卷。
- /api/admin：业务审核与下架沿用既有版本锁和顺延排序规则；学校与角色任命仍仅 owner 可操作。
- /api/registrations /api/challenges：新增 school 范围；平台官方活动授权 project_lead 管理。

## 发布边界

正式站只立即轮换了管理员密钥、撤销旧凭证和会话。校园功能、operator 登录与单人管理 API 收口等待本地验收后发布，不把分支预览冒充线上已生效功能。
