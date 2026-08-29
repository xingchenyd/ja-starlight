/* eslint-disable @next/next/no-img-element, jsx-a11y/media-has-caption */
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RichBlock } from "../data";

type RecordItem = {
  id: string;
  ownerId?: string;
  kind: string;
  payload: Record<string, unknown>;
  updatedAt: string;
};
type Log = {
  id: number;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};
type Registration = {
  id: string;
  activityId: string;
  activityTitle: string;
  answers: Record<string, string>;
  status: string;
  createdAt: string;
  reviewNote?: string;
};
type ManagedComment = {
  id: string;
  contentId: string;
  contentTitle: string;
  authorName: string;
  body: string;
  replyBody?: string;
  repliedBy?: string;
  createdAt: string;
};
type Organization = { id: string; ownerId: string; name: string; creditCode: string; verificationStatus: string; verifiedAt?: string | null; createdAt: string; updatedAt: string };
type Field = { id: string; label: string; type: string; required: boolean };
const reviewable = ["activity", "content"];
const activityCategories = [
  "企业参访",
  "能力工作坊",
  "创新挑战",
  "职业市集",
  "导师对谈",
  "商业实践",
  "公益课堂",
  "赛事观摩",
];
const contentCategories = [
  "技能成长",
  "活动分享",
  "企业曝光",
  "职业探索",
  "简历面试",
  "公益实践",
];
const jobCategories = [
  "产品运营",
  "技术研发",
  "数据分析",
  "品牌内容",
  "智能制造",
  "金融与商业",
  "项目实践",
  "公益实践",
];
const kindName = (kind: string) =>
  kind === "job"
    ? "实习/项目"
    : kind === "activity"
      ? "成长活动"
      : kind === "content"
        ? "成长内容"
        : kind === "blacklist"
          ? "诚信记录"
          : "企业资料";
const stateName = (state: unknown) =>
  state === "approved" ? "已通过" : state === "rejected" ? "已退回" : "待审核";
const orderOf = (item: RecordItem) => Number(item.payload.sortOrder || 0) || 0;
const publisherOf = (item: RecordItem) =>
  String(item.payload.company || item.payload.publisher || "湖南平台");
const reviewLaneOf = (item: RecordItem) =>
  item.kind === "activity"
    ? String(item.ownerId || "").startsWith("ja:")
      ? "ja-activity"
      : "enterprise-activity"
    : "enterprise-content";
const reviewRiskOf = (item: RecordItem) => {
  const issues: string[] = [];
  const payload = item.payload;
  const blocks = (payload.bodyBlocks as RichBlock[] | undefined) || [];
  if (String(payload.summary || "").trim().length < 20)
    issues.push("简介过短");
  if (item.kind === "job") {
    if (!String(payload.logoUrl || payload.logo || "").trim()) issues.push("缺少企业 Logo");
    if (!String(payload.contactEmail || "").includes("@")) issues.push("投递邮箱需核验");
    if (!Array.isArray(payload.responsibilities) || payload.responsibilities.length < 2) issues.push("岗位职责不完整");
    if (!Array.isArray(payload.requirements) || payload.requirements.length < 2) issues.push("能力要求不完整");
  } else {
    if (!String(payload.cover || "").trim()) issues.push("缺少封面");
    if (!blocks.length) issues.push("缺少正文内容");
  }
  if (item.kind === "activity") {
    if (!String(payload.date || "").trim()) issues.push("未设置活动日期");
    if (!String(payload.place || "").trim()) issues.push("未设置活动地点");
    const fields = (payload.registrationFields as Field[] | undefined) || [];
    if (!fields.length) issues.push("未配置报名字段");
  }
  if (item.kind === "content" && !String(payload.category || "").trim())
    issues.push("未选择内容分类");
  const serialized = JSON.stringify(payload);
  if (/https?:\/\//i.test(serialized)) issues.push("包含外部链接，需核验");
  const age = Date.now() - new Date(item.updatedAt).getTime();
  if (Number.isFinite(age) && age > 7 * 86400000) issues.push("已等待超过 7 天");
  const level = issues.length >= 4 ? "high" : issues.length >= 2 ? "medium" : "low";
  return { issues, level, score: Math.max(20, 100 - issues.length * 18) };
};
function useDialogEscape(close: () => void) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);
}
const fieldOptions: Field[] = [
  { id: "name", label: "姓名", type: "text", required: true },
  { id: "phone", label: "联系电话", type: "tel", required: true },
  { id: "email", label: "常用邮箱", type: "email", required: true },
  { id: "school", label: "学校、专业与年级", type: "text", required: true },
  { id: "studentId", label: "学号", type: "text", required: false },
  {
    id: "expectation",
    label: "参加活动的期待",
    type: "textarea",
    required: false,
  },
];
const abilityOptions = [
  "表达沟通",
  "问题解决",
  "行业认知",
  "项目管理",
  "创新思维",
  "团队协作",
  "社会责任",
  "数据分析",
];
const adminStarterBlocks: Record<"activity" | "content", RichBlock[]> = {
  activity: [
    { id: "a1", type: "heading", title: "活动背景" },
    {
      id: "a2",
      type: "text",
      text: "说明活动面向谁、解决什么成长问题、学生需要完成什么任务。",
    },
    {
      id: "a3",
      type: "agenda",
      title: "09:00-09:30 签到｜09:30-11:00 主题体验｜11:00-12:00 复盘输出",
    },
  ],
  content: [
    { id: "c1", type: "heading", title: "学习目标" },
    {
      id: "c2",
      type: "text",
      text: "说明这篇内容/视频可以帮助学生解决什么问题。",
    },
    {
      id: "c3",
      type: "card",
      title: "关联活动或机会",
      text: "可写入关联活动、企业或实习项目，后续数据库阶段只保存对象 ID。",
    },
  ],
};

export default function JAConsole({ operator }: { operator: string }) {
  const [tab, setTab] = useState("pulse"),
    [records, setRecords] = useState<RecordItem[]>([]),
    [logs, setLogs] = useState<Log[]>([]),
    [registrations, setRegistrations] = useState<Registration[]>([]),
    [organizations, setOrganizations] = useState<Organization[]>([]),
    [notice, setNotice] = useState(""),
    [selectedId, setSelectedId] = useState(""),
    [reason, setReason] = useState(""),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "后台数据读取失败");
      setRecords(data.records || []);
      setLogs(data.logs || []);
      setRegistrations(data.registrations || []);
      setOrganizations(data.organizations || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "后台数据读取失败");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    fetch("/api/admin")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "后台数据读取失败");
        return data;
      })
      .then((data) => {
        if (active) {
          setRecords(data.records || []);
          setLogs(data.logs || []);
          setRegistrations(data.registrations || []);
          setOrganizations(data.organizations || []);
          setLoadError("");
          setLoading(false);
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "后台数据读取失败");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const pending = useMemo(
    () =>
      records
        .filter(
          (r) =>
            reviewable.includes(r.kind) &&
            (!r.payload.reviewStatus || r.payload.reviewStatus === "pending"),
        )
        .sort(
          (a, b) =>
            orderOf(b) - orderOf(a) ||
            String(b.updatedAt).localeCompare(String(a.updatedAt)),
        ),
    [records],
  );
  const publicRecords = useMemo(
    () =>
      records
        .filter(
          (r) =>
            ["job", "activity", "content"].includes(r.kind) &&
            r.payload.reviewStatus === "approved",
        )
        .sort(
          (a, b) =>
            orderOf(b) - orderOf(a) ||
            String(b.updatedAt).localeCompare(String(a.updatedAt)),
        ),
    [records],
  );
  const reviewQueues = useMemo(
    () => [
      {
        key: "ja-activity",
        title: "JA 发起的活动",
        desc: "由 JA 后台创建的活动，内部确认后再进入学生端报名与展示。",
        items: pending.filter(
          (r) =>
            r.kind === "activity" && String(r.ownerId || "").startsWith("ja:"),
        ),
      },
      {
        key: "enterprise-activity",
        title: "企业发布的活动",
        desc: "企业提交的成长活动，由 JA 审核报名字段、封面、排序和公开范围。",
        items: pending.filter(
          (r) =>
            r.kind === "activity" && !String(r.ownerId || "").startsWith("ja:"),
        ),
      },
      {
        key: "enterprise-content",
        title: "企业发布的内容",
        desc: "企业提交的文章、视频与企业曝光内容，由 JA 审核后公开。",
        items: pending.filter(
          (r) =>
            r.kind === "content" && !String(r.ownerId || "").startsWith("ja:"),
        ),
      },
    ],
    [pending],
  );
  const blacklist = records.filter((r) => r.kind === "blacklist");
  const selected = records.find((r) => r.id === selectedId);
  const decide = async (
    decision: "approved" | "rejected",
    settings?: { sortOrder: number; category: string; featured: boolean },
  ) => {
    if (!selected) return;
    if (decision === "rejected" && !reason.trim()) {
      setNotice("退回时请填写具体修改意见");
      return;
    }
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        decision,
        reason: reason.trim(),
        ...settings,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setNotice(data.error || "审核失败");
      return;
    }
    setNotice(
      decision === "approved"
        ? "审核通过：该内容已按排序规则进入公开目录"
        : "已退回：企业端会显示修改意见",
    );
    setSelectedId("");
    setReason("");
    await load();
  };
  const decideMany = async (
    ids: string[],
    decision: "approved" | "rejected",
    batchReason: string,
  ) => {
    if (!ids.length) return { ok: false, message: "请先选择待审核内容" };
    if (decision === "rejected" && !batchReason.trim())
      return { ok: false, message: "批量退回时必须填写统一修改意见" };
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ids,
        decision,
        reason: batchReason.trim(),
      }),
    });
    const data = await response.json();
    if (!response.ok)
      return { ok: false, message: data.error || "批量审核失败" };
    setNotice(
      decision === "approved"
        ? `已批量通过 ${data.count || ids.length} 条内容`
        : `已批量退回 ${data.count || ids.length} 条内容`,
    );
    await load();
    return { ok: true, message: "" };
  };
  const configure = async (settings: {
    sortOrder: number;
    category: string;
    featured: boolean;
  }) => {
    if (!selected) return;
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: selected.id, action: "configure", ...settings }),
    });
    const data = await response.json();
    if (!response.ok) {
      setNotice(data.error || "展示设置保存失败");
      return;
    }
    setNotice("展示分类、排序和推荐位已更新");
    setSelectedId("");
    await load();
  };
  const title =
    tab === "pulse"
      ? "平台活力看板"
      : tab === "review"
        ? "分区审核"
        : tab === "organizations"
          ? "企业主体认证"
        : tab === "publish"
          ? "JA 内容发布"
          : tab === "records"
            ? "平台内容排序"
            : tab === "feedback"
              ? "互动管理"
            : tab === "integrity"
              ? "诚信管理"
              : tab === "keys"
                ? "密钥管理"
              : "审计日志";
  const description =
    tab === "pulse"
      ? "用真实发布、报名和审核数据说明 Star Plan 的平台活性。"
      : tab === "review"
        ? "只审核三类需要公开前确认的内容：JA 发起活动、企业发布活动、企业发布内容。"
        : tab === "organizations"
          ? "核验企业主体名称和统一社会信用代码，通过后企业才能正式发布。"
        : tab === "publish"
          ? "由 JA 创建活动、文章或视频；JA 活动会进入内部审核队列。"
          : tab === "records"
            ? "集中查看已提交和已发布内容的状态、分类、推荐和排序。"
            : tab === "feedback"
              ? "集中回应学生对成长内容的提问，并处理不适合公开的评论。"
            : tab === "integrity"
              ? "记录虚假信息、失约或其他诚信风险，后续可接入账号限制。"
              : tab === "keys"
                ? "创建、停用与撤销 JA 管理密钥；新密钥仅在创建时显示一次。"
              : "记录后台的重要操作，便于追踪审核与发布过程。";
  return (
    <main className="ja-console platform v2 ja-platform">
      <aside className="side">
        <Link href="/" className="side-brand official-side-brand">
          <img src="/media/ja-china-logo.jpg" alt="JA China" />
          <b>Star Plan</b>
        </Link>
        <nav>
          <button
            className={tab === "pulse" ? "active" : ""}
            onClick={() => setTab("pulse")}
          >
            <span>◈</span>数据看板
          </button>
          <button
            className={tab === "review" ? "active" : ""}
            onClick={() => setTab("review")}
          >
            <span>✓</span>分区审核 <i>{pending.length}</i>
          </button>
          <button className={tab === "organizations" ? "active" : ""} onClick={() => setTab("organizations")}>
            <span>◎</span>企业认证 <i>{organizations.filter((item) => item.verificationStatus === "pending").length}</i>
          </button>
          <button
            className={tab === "publish" ? "active" : ""}
            onClick={() => setTab("publish")}
          >
            <span>＋</span>内容发布
          </button>
          <button
            className={tab === "records" ? "active" : ""}
            onClick={() => setTab("records")}
          >
            <span>▱</span>平台内容
          </button>
          <button
            className={tab === "feedback" ? "active" : ""}
            onClick={() => setTab("feedback")}
          >
            <span>♡</span>互动管理
          </button>
          <button
            className={tab === "integrity" ? "active" : ""}
            onClick={() => setTab("integrity")}
          >
            <span>!</span>诚信管理
          </button>
          <button
            className={tab === "audit" ? "active" : ""}
            onClick={() => setTab("audit")}
          >
            <span>◷</span>审计日志
          </button>
          <button className={tab === "keys" ? "active" : ""} onClick={() => setTab("keys")}>
            <span>⌁</span>密钥管理
          </button>
        </nav>
        <div className="side-help"><b>安全后台</b><p>企业认证、内容审核和操作日志均按管理员身份记录。</p></div>
        <button className="back" onClick={async () => { await fetch("/api/admin-auth/logout", { method: "POST" }); location.assign("/"); }}>退出后台</button>
      </aside>
      <div className="work">
        <header className="topbar">
          <div className="workspace-context">
            <small>JA STAR PLAN OPERATIONS</small>
            <b>湖南运营后台</b>
            <span>内容审核、排序与成长数据</span>
          </div>
          <div className="top-actions">
            <span className="operator-name">{operator}</span>
            <div className="avatar">JA</div>
          </div>
        </header>
        <section className="workspace ja-workspace">
          <div className="page-title">
            <div>
              <small>JA HUNAN OPERATIONS</small>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </div>
          <div className="ja-view" key={tab}>
            {notice && <p className="admin-notice">{notice}</p>}
            {tab === "pulse" && (
              <AdminPulse records={records} registrations={registrations} logs={logs} />
            )}{" "}
            {tab === "review" && (
              <ReviewOperationsDesk
                queues={reviewQueues}
                loading={loading}
                error={loadError}
                refresh={load}
                onOpen={(id) => {
                  setSelectedId(id);
                  setReason("");
                }}
                onDecideMany={decideMany}
              />
            )}{" "}
            {tab === "organizations" && <OrganizationVerification items={organizations} onUpdated={load} onNotice={setNotice} />}
            {tab === "publish" && (
              <AdminPublisher
                onPublished={async (message) => {
                  setNotice(message);
                  await load();
                }}
              />
            )}
            {tab === "records" && (
              <div className="admin-records records-view">
                {publicRecords.map((r) => (
                  <RecordCard
                    key={r.id}
                    item={r}
                    onOpen={() => setSelectedId(r.id)}
                  />
                ))}
              </div>
            )}
            {tab === "feedback" && (
              <JAFeedbackDesk onNotice={setNotice} />
            )}
            {tab === "integrity" && (
              <IntegrityDesk
                items={blacklist}
                onSaved={async (message) => {
                  setNotice(message);
                  await load();
                }}
              />
            )}
            {tab === "audit" && (
              <AuditLogDesk logs={logs} />
            )}
            {tab === "keys" && <SecurityKeys onNotice={setNotice} />}
          </div>
        </section>
      </div>
      {selected && (
        <ReviewDrawer
          key={selected.id}
          selected={selected}
          reason={reason}
          setReason={setReason}
          decide={decide}
          configure={configure}
          close={() => {
            setSelectedId("");
            setReason("");
          }}
        />
      )}
    </main>
  );
}

type AdminKeyItem = { id: string; label: string; key_prefix: string; status: string; last_used_at?: string | null; created_at: string };
function SecurityKeys({ onNotice }: { onNotice: (message: string) => void }) {
  const [items, setItems] = useState<AdminKeyItem[]>([]), [label, setLabel] = useState(""), [createdKey, setCreatedKey] = useState(""), [loading, setLoading] = useState(true);
  const loadKeys = async () => { setLoading(true); const response = await fetch("/api/admin-auth/keys"); const data = await response.json(); setLoading(false); if (response.ok) setItems(data.keys || []); else onNotice(data.error || "密钥列表读取失败"); };
  useEffect(() => {
    let active = true;
    fetch("/api/admin-auth/keys").then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => {
      if (!active) return;
      if (response.ok) setItems(data.keys || []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const create = async () => { const response = await fetch("/api/admin-auth/keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label }) }); const data = await response.json(); if (!response.ok) return onNotice(data.error || "密钥创建失败"); setCreatedKey(data.rawKey); setLabel(""); onNotice("新密钥已创建，请立即安全保存"); await loadKeys(); };
  const act = async (id: string, action: "disable" | "restore" | "revoke") => { const response = await fetch(`/api/admin-auth/keys/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }); const data = await response.json(); if (!response.ok) return onNotice(data.error || "密钥状态更新失败"); onNotice(action === "revoke" ? "密钥已永久撤销" : action === "disable" ? "密钥已停用" : "密钥已恢复"); await loadKeys(); };
  return <section className="admin-key-console"><div className="admin-key-create"><div><small>CREATE ADMIN CREDENTIAL</small><h2>创建管理密钥</h2><p>为每位管理员单独命名，便于追踪审核操作和停用权限。</p></div><label>密钥名称<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="例如：长沙项目负责人" maxLength={60}/></label><button onClick={create} disabled={label.trim().length < 2}>生成新密钥</button></div>{createdKey && <div className="admin-key-once" role="alert"><b>仅展示一次，请立即复制并保存</b><code>{createdKey}</code><button onClick={() => navigator.clipboard.writeText(createdKey)}>复制密钥</button></div>}<div className="admin-key-list"><header><b>现有密钥</b><span>{items.filter((item) => item.status === "active").length} 个有效</span></header>{loading ? <p>正在读取…</p> : items.map((item) => <article key={item.id}><div><span className={`key-state ${item.status}`}>{item.status === "active" ? "有效" : item.status === "disabled" ? "已停用" : "已撤销"}</span><h3>{item.label}</h3><code>{item.key_prefix}••••••</code><small>创建：{new Date(item.created_at).toLocaleString("zh-CN")} · 最近使用：{item.last_used_at ? new Date(item.last_used_at).toLocaleString("zh-CN") : "从未"}</small></div><div>{item.status === "active" && <button onClick={() => act(item.id, "disable")}>停用</button>}{item.status === "disabled" && <button onClick={() => act(item.id, "restore")}>恢复</button>}{item.status !== "revoked" && <button className="danger" onClick={() => confirm("撤销后无法恢复，确认继续？") && act(item.id, "revoke")}>撤销</button>}</div></article>)}</div></section>;
}

function OrganizationVerification({ items, onUpdated, onNotice }: { items: Organization[]; onUpdated: () => Promise<void>; onNotice: (message: string) => void }) {
  const [selected, setSelected] = useState<Organization | null>(null), [reason, setReason] = useState(""), [saving, setSaving] = useState(false), [filter, setFilter] = useState("pending");
  const shown = items.filter((item) => filter === "all" || item.verificationStatus === filter);
  const decide = async (decision: "approved" | "rejected") => {
    if (!selected || saving) return;
    if (decision === "rejected" && reason.trim().length < 4) return onNotice("退回企业认证时请填写具体原因");
    setSaving(true);
    const response = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "verify-organization", organizationId: selected.id, decision, reason: reason.trim() }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return onNotice(data.error || "企业认证处理失败");
    onNotice(decision === "approved" ? "企业主体认证已通过" : "企业认证已退回补充材料"); setSelected(null); setReason(""); await onUpdated();
  };
  return <>
    <section className="organization-summary"><div><small>ORGANIZATION VERIFICATION</small><h2>企业主体认证</h2><p>认证通过后，企业才可以提交公开岗位、活动和成长内容。</p></div><div><span><b>{items.filter((item) => item.verificationStatus === "pending").length}</b>待核验</span><span><b>{items.filter((item) => item.verificationStatus === "verified").length}</b>已认证</span></div></section>
    <div className="category-nav">{[["pending","待核验"],["verified","已认证"],["rejected","已退回"],["all","全部"]].map(([value,label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="organization-list">{shown.map((item) => <button key={item.id} onClick={() => { setSelected(item); setReason(""); }}><span className={`org-state ${item.verificationStatus}`}>{item.verificationStatus === "verified" ? "已认证" : item.verificationStatus === "rejected" ? "已退回" : "待核验"}</span><div><h3>{item.name}</h3><p>统一社会信用代码：{item.creditCode || "未填写"}</p><small>更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}</small></div><b>查看资料 →</b></button>)}</div>
    {!shown.length && <div className="admin-empty">当前分类暂无企业认证申请。</div>}
    {selected && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="dialog organization-dialog" role="dialog" aria-modal="true" aria-label={`${selected.name}企业认证`}><button className="dialog-close" aria-label="关闭企业认证" onClick={() => setSelected(null)}>×</button><small>ENTERPRISE DUE DILIGENCE</small><h1>{selected.name}</h1><div className="org-code"><span>统一社会信用代码</span><b>{selected.creditCode || "企业尚未填写"}</b></div><ul><li>核对企业主体名称与营业执照是否一致</li><li>核对联络人是否属于企业或获得正式授权</li><li>通过后，该企业发布的岗位可直接公开，活动与内容仍进入 JA 审核</li></ul><label>认证意见<textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="退回时必须说明需补充的材料" /></label><div className="drawer-actions"><button disabled={saving} onClick={() => decide("rejected")}>退回补充</button><button className="approve" disabled={saving || !selected.creditCode} onClick={() => decide("approved")}>确认通过</button></div></section></div>}
  </>;
}

type ReviewQueue = {
  key: string;
  title: string;
  desc: string;
  items: RecordItem[];
};

function ReviewOperationsDesk({
  queues,
  loading,
  error,
  refresh,
  onOpen,
  onDecideMany,
}: {
  queues: ReviewQueue[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  onOpen: (id: string) => void;
  onDecideMany: (
    ids: string[],
    decision: "approved" | "rejected",
    reason: string,
  ) => Promise<{ ok: boolean; message: string }>;
}) {
  const [query, setQuery] = useState(""),
    [lane, setLane] = useState("all"),
    [risk, setRisk] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [batchReason, setBatchReason] = useState(""),
    [batchError, setBatchError] = useState(""),
    [saving, setSaving] = useState(false);
  const allItems = useMemo(() => queues.flatMap((queue) => queue.items), [queues]);
  const visibleQueues = useMemo(
    () =>
      queues
        .filter((queue) => lane === "all" || queue.key === lane)
        .map((queue) => ({
          ...queue,
          items: queue.items.filter((item) => {
            const haystack = `${item.payload.title || ""} ${publisherOf(item)} ${item.payload.summary || ""}`.toLowerCase();
            const queryMatches = !query.trim() || haystack.includes(query.trim().toLowerCase());
            const riskMatches = risk === "all" || reviewRiskOf(item).level === risk;
            return queryMatches && riskMatches;
          }),
        })),
    [queues, lane, query, risk],
  );
  const visibleIds = visibleQueues.flatMap((queue) => queue.items.map((item) => item.id));
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const totalVisible = visibleIds.length;
  const highRisk = allItems.filter((item) => reviewRiskOf(item).level === "high").length;
  const toggle = (id: string) =>
    setSelected((value) =>
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
    );
  const submitBatch = async (decision: "approved" | "rejected") => {
    setSaving(true);
    setBatchError("");
    const result = await onDecideMany(selectedVisible, decision, batchReason);
    setSaving(false);
    if (!result.ok) {
      setBatchError(result.message);
      return;
    }
    setSelected([]);
    setBatchReason("");
  };
  return (
    <>
      <section className="review-operations-head">
        <div>
          <small>CONTENT GOVERNANCE</small>
          <h2>三类公开内容，分区审核</h2>
          <p>先核验事实与报名规则，再处理展示分类、推荐位和排序。</p>
        </div>
        <div className="review-operations-stats">
          <span><b>{allItems.length}</b>待处理</span>
          <span><b>{highRisk}</b>高风险</span>
          <button onClick={refresh} disabled={loading}>{loading ? "刷新中…" : "刷新队列"}</button>
        </div>
      </section>
      <section className="review-filterbar" aria-label="审核筛选">
        <label className="review-search">
          <span>搜索</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="标题、发布方或简介"
          />
        </label>
        <label>
          <span>审核分区</span>
          <select value={lane} onChange={(event) => setLane(event.target.value)}>
            <option value="all">全部分区</option>
            {queues.map((queue) => <option key={queue.key} value={queue.key}>{queue.title}</option>)}
          </select>
        </label>
        <label>
          <span>风险等级</span>
          <select value={risk} onChange={(event) => setRisk(event.target.value)}>
            <option value="all">全部风险</option>
            <option value="high">高风险</option>
            <option value="medium">需核验</option>
            <option value="low">信息较完整</option>
          </select>
        </label>
        <span className="review-filter-result">当前 {totalVisible} 条</span>
      </section>
      {selectedVisible.length > 0 && (
        <section className="review-batchbar">
          <div>
            <b>已选择 {selectedVisible.length} 条</b>
            <span>批量操作仅处理当前筛选范围内的内容</span>
          </div>
          <input
            value={batchReason}
            onChange={(event) => setBatchReason(event.target.value)}
            placeholder="统一审核意见；批量退回时必填"
          />
          <button disabled={saving} onClick={() => submitBatch("rejected")}>批量退回</button>
          <button className="approve" disabled={saving} onClick={() => submitBatch("approved")}>批量通过</button>
          <button className="clear" onClick={() => setSelected([])}>取消选择</button>
          {batchError && <p role="alert">{batchError}</p>}
        </section>
      )}
      {error ? (
        <section className="admin-empty admin-error-state">
          <b>审核数据加载失败</b><p>{error}</p><button onClick={refresh}>重新加载</button>
        </section>
      ) : loading ? (
        <div className="admin-empty">正在读取审核队列…</div>
      ) : allItems.length === 0 ? (
        <div className="admin-empty">当前三条审核队列均已处理完成。</div>
      ) : totalVisible === 0 ? (
        <div className="admin-empty">没有符合当前筛选条件的待审核内容。</div>
      ) : (
        <div className="admin-review-lanes">
          {visibleQueues.map((queue) => (
            <section className="admin-review-lane" key={queue.key}>
              <div className="lane-head">
                <div><small>{queue.key.toUpperCase()}</small><h2>{queue.title}</h2><p>{queue.desc}</p></div>
                <b>{queue.items.length}</b>
              </div>
              {queue.items.length ? queue.items.map((item) => (
                <div className={`review-select-card ${selected.includes(item.id) ? "selected" : ""}`} key={item.id}>
                  <label className="review-select-control">
                    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
                    <span>选择</span>
                  </label>
                  <RecordCard item={item} onOpen={() => onOpen(item.id)} />
                </div>
              )) : <p className="lane-empty">此分区暂无匹配内容</p>}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function RecordCard({
  item,
  onOpen,
}: {
  item: RecordItem;
  onOpen: () => void;
}) {
  const risk = reviewRiskOf(item);
  return (
    <article>
      <span className={`review-risk ${risk.level}`}>
        {risk.level === "high" ? "高风险" : risk.level === "medium" ? "需核验" : "较完整"}
      </span>
      <div>
        <small>
          {publisherOf(item)} · {kindName(item.kind)}{" "}
          · 排序 {orderOf(item)}
          {item.payload.featured ? " · 首页推荐" : ""}
        </small>
        <h2>{String(item.payload.title || "未命名内容")}</h2>
        <p>
          {stateName(item.payload.reviewStatus)} ·{" "}
          {String(item.payload.summary || "无简介")}
        </p>
        <em>
          完整度 {risk.score}% · 更新于 {new Date(String(item.updatedAt)).toLocaleString("zh-CN")}
        </em>
        {risk.issues.length > 0 && (
          <div className="review-issue-list">
            {risk.issues.slice(0, 3).map((issue) => <span key={issue}>{issue}</span>)}
          </div>
        )}
      </div>
      <button className="inspect" onClick={onOpen}>
        查看详情
      </button>
    </article>
  );
}

function AdminPulse({
  records,
  registrations,
  logs,
}: {
  records: RecordItem[];
  registrations: Registration[];
  logs: Log[];
}) {
  const jobs = records.filter(
      (r) => r.kind === "job" && r.payload.reviewStatus === "approved",
    ).length,
    acts = records.filter(
      (r) => r.kind === "activity" && r.payload.reviewStatus === "approved",
    ).length,
    cont = records.filter(
      (r) => r.kind === "content" && r.payload.reviewStatus === "approved",
    ).length,
    approved = registrations.filter((r) => r.status === "approved").length,
    pending = records.filter(
      (r) => reviewable.includes(r.kind) && (!r.payload.reviewStatus || r.payload.reviewStatus === "pending"),
    ).length,
    today = new Date().toISOString().slice(0, 10),
    processedToday = logs.filter(
      (log) => log.createdAt.slice(0, 10) === today && /approved|rejected|review/.test(log.action),
    ).length;
  return (
    <>
      <div className="metrics admin-pulse-metrics">
        <Metric
          label="待审核内容"
          value={String(pending)}
          note="三条审核队列合计"
        />
        <Metric
          label="今日处理"
          value={String(processedToday)}
          note="通过、退回与复核操作"
        />
        <Metric
          label="报名转化"
          value={`${registrations.length ? Math.round((approved / registrations.length) * 100) : 0}%`}
          note="企业确认通过比例"
        />
        <Metric
          label="成长内容"
          value={String(cont)}
          note="技能、分享与企业曝光"
        />
      </div>
      <section className="platform-map">
        <div>
          <small>LIVE VALUE MAP</small>
          <h2>平台从机会供给，到成长沉淀</h2>
          <p>所有数字均来自当前发布、报名和审核记录，用于判断供给、参与和转化是否顺畅。</p>
        </div>
        <ol>
          <li>
            <b>{jobs + acts}</b>
            <span>企业供给</span>
          </li>
          <li>
            <b>{registrations.length}</b>
            <span>学生参与</span>
          </li>
          <li>
            <b>{approved}</b>
            <span>确认通过</span>
          </li>
          <li>
            <b>{cont}</b>
            <span>公开内容</span>
          </li>
        </ol>
      </section>
      <section className="review-duty-strip">
        {[
          ["JA 发起的活动", "JA 内部确认后公开"],
          ["企业发布的活动", "JA 审核报名字段和活动信息"],
          ["企业发布的内容", "JA 审核文章、视频和企业曝光"],
        ].map(([name, text]) => (
          <article key={name}>
            <b>{name}</b>
            <span>{text}</span>
          </article>
        ))}
      </section>
    </>
  );
}
function AuditLogDesk({ logs }: { logs: Log[] }) {
  const [query, setQuery] = useState(""),
    [action, setAction] = useState("all");
  const actionName = (value: string) => {
    const labels: Record<string, string> = {
      approved: "审核通过",
      rejected: "审核退回",
      "batch-approved": "批量通过",
      "batch-rejected": "批量退回",
      "configure-publication": "调整展示设置",
      "submit-ja-activity-review": "提交 JA 活动审核",
      "direct-publish": "JA 直接发布",
      "comment-reply": "回复评论",
      "comment-delete": "删除评论",
    };
    return labels[value] || value.replaceAll("-", " ");
  };
  const actionGroup = (value: string) =>
    value.includes("approved") || value === "approved"
      ? "approved"
      : value.includes("rejected") || value === "rejected"
        ? "rejected"
        : value.includes("publish") || value.includes("configure")
          ? "publish"
          : "other";
  const shown = logs.filter((log) => {
    const text = `${actionName(log.action)} ${log.targetType} ${log.targetId} ${log.actorId}`.toLowerCase();
    return (action === "all" || actionGroup(log.action) === action) && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });
  const exportLogs = () => {
    const rows = [
      ["时间", "动作", "对象类型", "对象ID", "操作者"],
      ...shown.map((log) => [
        new Date(log.createdAt).toLocaleString("zh-CN"),
        actionName(log.action),
        log.targetType,
        log.targetId,
        log.actorId,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = `JA星光计划_审计日志_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  return (
    <>
      <section className="audit-summary-strip">
        <div><small>当前记录</small><b>{logs.length}</b></div>
        <div><small>审核通过</small><b>{logs.filter((log) => actionGroup(log.action) === "approved").length}</b></div>
        <div><small>审核退回</small><b>{logs.filter((log) => actionGroup(log.action) === "rejected").length}</b></div>
      </section>
      <section className="feedback-toolbar audit-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索动作、对象 ID 或操作者" />
        <select value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="all">全部动作</option><option value="approved">审核通过</option><option value="rejected">审核退回</option><option value="publish">发布与配置</option><option value="other">其他操作</option>
        </select>
        <button onClick={exportLogs} disabled={!shown.length}>导出当前结果</button>
      </section>
      <div className="admin-table audit-readable-table">
        <div><b>时间</b><b>动作</b><b>对象</b><b>操作者</b></div>
        {shown.map((log) => (
          <div key={log.id}>
            <span>{new Date(log.createdAt).toLocaleString("zh-CN")}</span>
            <span><i className={`audit-action ${actionGroup(log.action)}`}>{actionName(log.action)}</i></span>
            <span>{log.targetType}<small>{log.targetId}</small></span>
            <span>{log.actorId}</span>
          </div>
        ))}
      </div>
      {!shown.length && <div className="admin-empty">没有符合当前筛选条件的审计记录。</div>}
    </>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="metric aqua">
      <span>{label}</span>
      <b>{value}</b>
      <p>{note}</p>
    </article>
  );
}

function AdminBlockEditor({
  blocks,
  setBlocks,
}: {
  blocks: RichBlock[];
  setBlocks: (blocks: RichBlock[]) => void;
}) {
  const update = (id: string, patch: Partial<RichBlock>) =>
    setBlocks(
      blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    );
  const add = (type: RichBlock["type"]) =>
    setBlocks([
      ...blocks,
      {
        id: crypto.randomUUID(),
        type,
        title:
          type === "heading"
            ? "新小标题"
            : type === "agenda"
              ? "09:00-10:00 环节名称"
              : "",
        text:
          type === "text"
            ? "输入正文内容。"
            : type === "quote"
              ? "输入重点提示。"
              : "",
      },
    ]);
  const move = (id: string, offset: number) => {
    const index = blocks.findIndex((block) => block.id === id),
      next = index + offset;
    if (index < 0 || next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setBlocks(copy);
  };
  return (
    <section className="content-studio-editor admin-editor">
      <div className="editor-toolbar">
        <button onClick={() => add("heading")}>H2 小标题</button>
        <button onClick={() => add("text")}>正文段落</button>
        <button onClick={() => add("quote")}>重点提示</button>
        <button onClick={() => add("gallery")}>图集</button>
        <button onClick={() => add("agenda")}>议程</button>
        <button onClick={() => add("card")}>业务卡片</button>
        <button onClick={() => add("attachment")}>附件</button>
      </div>
      <div className="studio-block-list">
        {blocks.map((block, index) => (
          <article
            key={block.id}
            className={`studio-block block-${block.type}`}
          >
            <div className="block-head">
              <span>{block.type}</span>
              <nav>
                <button
                  onClick={() => move(block.id, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  onClick={() => move(block.id, 1)}
                  disabled={index === blocks.length - 1}
                >
                  ↓
                </button>
                <button
                  onClick={() =>
                    setBlocks(blocks.filter((x) => x.id !== block.id))
                  }
                >
                  删除
                </button>
              </nav>
            </div>
            {block.type === "text" || block.type === "quote" ? (
              <textarea
                rows={block.type === "text" ? 4 : 2}
                value={block.text || ""}
                onChange={(e) => update(block.id, { text: e.target.value })}
              />
            ) : (
              <input
                value={block.title || ""}
                onChange={(e) => update(block.id, { title: e.target.value })}
                placeholder="标题、议程或附件名称"
              />
            )}
            {block.type === "gallery" && (
              <textarea
                rows={3}
                value={(block.items || []).join("\n")}
                onChange={(e) =>
                  update(block.id, {
                    items: e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="每行一张图片链接"
              />
            )}
            {(block.type === "image" ||
              block.type === "video" ||
              block.type === "attachment") && (
              <input
                value={block.url || ""}
                onChange={(e) => update(block.id, { url: e.target.value })}
                placeholder="媒体或附件链接"
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminPreview({
  item,
}: {
  item: {
    title: string;
    summary: string;
    cover: string;
    coverType?: string;
    category?: string;
    date?: string;
    place?: string;
    bodyBlocks: RichBlock[];
    abilityTags?: string[];
    registrationFields?: Field[];
  };
}) {
  return (
    <article className="content-renderer admin-content-preview">
      {item.coverType === "video" ? (
        <video src={item.cover} controls />
      ) : (
        <img src={item.cover} alt={item.title} />
      )}
      <small>{item.category || "Star Plan"}</small>
      <h1>{item.title || "未命名内容"}</h1>
      <p className="lead">
        {item.summary || "摘要会展示在学生端列表和详情页。"}
      </p>
      {item.date && (
        <div className="render-meta">
          <span>{item.date}</span>
          <span>{item.place}</span>
        </div>
      )}
      {item.abilityTags?.length ? (
        <div className="ability-chip-row">
          {item.abilityTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
      <div className="render-blocks">
        {item.bodyBlocks.map((block) => (
          <section
            key={block.id}
            className={`render-block render-${block.type}`}
          >
            {block.type === "heading" && <h2>{block.title}</h2>}
            {block.type === "text" && <p>{block.text}</p>}
            {block.type === "quote" && <blockquote>{block.text}</blockquote>}
            {block.type === "agenda" && (
              <ol className="render-agenda">
                {String(block.title || "")
                  .split("｜")
                  .map((line) => (
                    <li key={line}>{line}</li>
                  ))}
              </ol>
            )}
            {block.type === "card" && (
              <div className="render-card">
                <b>{block.title}</b>
                <p>{block.text}</p>
              </div>
            )}
            {block.type === "gallery" && (
              <div className="render-gallery">
                {(
                  block.items || [
                    "/media/ja-career-fair.jpg",
                    "/media/ja-competition.jpg",
                  ]
                ).map((url) => (
                  <img key={url} src={url} alt="图集图片" />
                ))}
              </div>
            )}
            {block.type === "attachment" && (
              <a className="render-attachment" href={block.url || "#"}>
                📎 {block.title || "附件"}
              </a>
            )}
          </section>
        ))}
      </div>
      {item.registrationFields?.length ? (
        <section className="render-extra">
          <h2>报名字段</h2>
          {item.registrationFields.map((field) => (
            <span key={field.id}>
              {field.label}
              {field.required ? " *" : ""}
            </span>
          ))}
        </section>
      ) : null}
    </article>
  );
}

function AdminPublisher({
  onPublished,
}: {
  onPublished: (message: string) => Promise<void>;
}) {
  const [kind, setKind] = useState<"activity" | "content">("activity"),
    [saving, setSaving] = useState(false),
    [fields, setFields] = useState(["name", "phone", "school"]),
    [custom, setCustom] = useState(""),
    [step, setStep] = useState("基础信息"),
    [abilities, setAbilities] = useState(["表达沟通", "行业认知"]),
    [blocks, setBlocks] = useState<RichBlock[]>(adminStarterBlocks.activity),
    [form, setForm] = useState({
      title: "",
      summary: "",
      place: "湖南 · 长沙",
      date: "",
      capacity: "100",
      category: "技能成长",
      duration: "10 分钟",
      mediaType: "article",
      cover: "/media/ja-career-fair.jpg",
      coverType: "image",
      sortOrder: "0",
      featured: false,
      agenda: "09:00-09:30 签到\n09:30-11:00 主题体验\n11:00-12:00 复盘输出",
    });
  const change = (key: string, value: string | boolean) =>
    setForm((v) => ({ ...v, [key]: value }));
  const switchKind = (next: "activity" | "content") => {
    setKind(next);
    setStep("基础信息");
    setBlocks(adminStarterBlocks[next]);
    setForm((v) => ({
      ...v,
      category: next === "activity" ? "企业参访" : "技能成长",
    }));
  };
  const media = async (file?: File) => {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    data.append("purpose", "media");
    const response = await fetch("/api/files", { method: "POST", body: data });
    const result = await response.json();
    if (response.ok && result.url)
      setForm((v) => ({
        ...v,
        cover: result.url,
        coverType: String(result.type).startsWith("video/") ? "video" : "image",
        mediaType: String(result.type).startsWith("video/")
          ? "video"
          : v.mediaType,
      }));
  };
  const publish = async () => {
    if (!form.title.trim() || !form.summary.trim()) return;
    setSaving(true);
    const registrationFields = [
      ...fieldOptions.filter((x) => fields.includes(x.id)),
      ...custom
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((label, index) => ({
          id: `custom_${index + 1}`,
          label,
          type: "textarea",
          required: false,
        })),
    ];
    const base = {
      title: form.title,
      summary: form.summary,
      category: form.category,
      cover: form.cover,
      coverType: form.coverType,
      bodyBlocks: blocks,
      abilityTags: abilities,
      sortOrder: Number(form.sortOrder) || 0,
      featured: form.featured,
      plainText: [
        form.title,
        form.summary,
        ...blocks.map((block) => `${block.title || ""} ${block.text || ""}`),
      ].join("\n"),
    };
    const payload =
      kind === "activity"
        ? {
            ...base,
            place: form.place.includes("湖南")
              ? form.place
              : `湖南 · ${form.place}`,
            date: form.date || "待定",
            capacity: Number(form.capacity) || 100,
            registered: 0,
            status: "已发布",
            registrationFields,
            agenda: form.agenda
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
            publisher: "JA China",
          }
        : {
            ...base,
            duration: form.duration,
            level: "入门",
            mediaType: form.mediaType,
            tags: abilities,
            publisher: "JA China",
          };
    const response = await fetch("/api/admin", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      await onPublished(result.error || "发布失败");
      return;
    }
    setForm((v) => ({ ...v, title: "", summary: "" }));
    await onPublished(
      kind === "activity"
        ? "JA 活动已进入内部审核队列，通过后学生端可见"
        : "JA 内容已直接发布，学生端刷新后即可看到",
    );
  };
  const registrationFields = [
    ...fieldOptions.filter((x) => fields.includes(x.id)),
    ...custom
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((label, index) => ({
        id: `custom_${index + 1}`,
        label,
        type: "textarea",
        required: false,
      })),
  ];
  return (
    <section className="admin-publisher studio-admin-publisher">
      <div className="admin-publisher-intro">
        <small>DIRECT PUBLISH · CONTENT STUDIO</small>
        <h2>由 JA 直接发布活动或成长内容</h2>
        <p>
          JA 可用结构化字段 +
          富媒体内容块发布活动、文章或视频。活动可设置报名表、议程、能力目标和首页推荐。
        </p>
      </div>
      <div className="publish-kind">
        <button
          className={kind === "activity" ? "active" : ""}
          onClick={() => switchKind("activity")}
        >
          成长活动
        </button>
        <button
          className={kind === "content" ? "active" : ""}
          onClick={() => switchKind("content")}
        >
          文章 / 视频
        </button>
      </div>
      <nav className="studio-steps">
        {(kind === "activity"
          ? ["基础信息", "活动详情", "报名设置", "成长设计", "预览"]
          : ["基础信息", "正文排版", "预览"]
        ).map((name) => (
          <button
            key={name}
            className={step === name ? "active" : ""}
            onClick={() => setStep(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="admin-studio-grid">
        <div className="admin-publisher-fields">
          {step === "基础信息" && (
            <>
              <label>
                标题
                <input
                  value={form.title}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder={kind === "activity" ? "活动名称" : "内容标题"}
                />
              </label>
              <label>
                分类
                <select
                  value={form.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {(kind === "activity"
                    ? activityCategories
                    : contentCategories
                  ).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                排序数字
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => change("sortOrder", e.target.value)}
                  placeholder="数字越大越靠前"
                />
              </label>
              <label className="switch-line">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => change("featured", e.target.checked)}
                />
                <span>首页推荐展示</span>
              </label>
              <label className="full">
                摘要
                <textarea
                  rows={4}
                  value={form.summary}
                  onChange={(e) => change("summary", e.target.value)}
                  placeholder="请清晰说明活动或内容的价值"
                />
              </label>
              {kind === "activity" ? (
                <>
                  <label>
                    活动地点
                    <input
                      value={form.place}
                      onChange={(e) => change("place", e.target.value)}
                    />
                  </label>
                  <label>
                    活动日期
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => change("date", e.target.value)}
                    />
                  </label>
                  <label>
                    人数上限
                    <input
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(e) => change("capacity", e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    阅读 / 观看时长
                    <input
                      value={form.duration}
                      onChange={(e) => change("duration", e.target.value)}
                    />
                  </label>
                  <label>
                    内容形式
                    <select
                      value={form.mediaType}
                      onChange={(e) => change("mediaType", e.target.value)}
                    >
                      <option value="article">图文文章</option>
                      <option value="video">视频</option>
                    </select>
                  </label>
                </>
              )}
              <label className="media-upload full">
                封面图片或视频
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  onChange={(e) => media(e.target.files?.[0])}
                />
                <span>{form.cover ? "✓ 已设置封面" : "选择文件"}</span>
              </label>
            </>
          )}
          {(step === "活动详情" || step === "正文排版") && (
            <AdminBlockEditor blocks={blocks} setBlocks={setBlocks} />
          )}{" "}
          {step === "报名设置" && (
            <fieldset className="registration-config full">
              <legend>报名表需要学生填写</legend>
              <div>
                {fieldOptions.map((field) => (
                  <label key={field.id}>
                    <input
                      type="checkbox"
                      checked={fields.includes(field.id)}
                      onChange={() =>
                        setFields((v) =>
                          v.includes(field.id)
                            ? v.filter((x) => x !== field.id)
                            : [...v, field.id],
                        )
                      }
                    />
                    <span>{field.label}</span>
                    <small>{field.required ? "必填" : "选填"}</small>
                  </label>
                ))}
              </div>
              <label>
                自定义问题（每行一个）
                <textarea
                  rows={3}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </label>
            </fieldset>
          )}{" "}
          {step === "成长设计" && (
            <>
              <label className="full">
                活动议程（每行一个环节）
                <textarea
                  rows={5}
                  value={form.agenda}
                  onChange={(e) => change("agenda", e.target.value)}
                />
              </label>
              <fieldset className="ability-picker full">
                <legend>预期培养维度</legend>
                {abilityOptions.map((tag) => (
                  <label key={tag}>
                    <input
                      type="checkbox"
                      checked={abilities.includes(tag)}
                      onChange={() =>
                        setAbilities((v) =>
                          v.includes(tag)
                            ? v.filter((x) => x !== tag)
                            : [...v, tag],
                        )
                      }
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}{" "}
          {step === "预览" && (
            <AdminPreview
              item={{
                ...form,
                bodyBlocks: blocks,
                abilityTags: abilities,
                registrationFields,
              }}
            />
          )}
        </div>
        <aside className="studio-preview">
          <b>学生端实时预览</b>
          <AdminPreview
            item={{
              ...form,
              bodyBlocks: blocks,
              abilityTags: abilities,
              registrationFields,
            }}
          />
        </aside>
      </div>
      <button
        className="admin-publish-button"
        disabled={saving}
        onClick={publish}
      >
        {saving
          ? "正在发布…"
          : kind === "activity"
            ? "提交 JA 内部审核 →"
            : "立即发布到学生端 →"}
      </button>
    </section>
  );
}

function JAFeedbackDesk({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const [comments, setComments] = useState<ManagedComment[]>([]),
    [selected, setSelected] = useState<ManagedComment | null>(null),
    [reply, setReply] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("pending"),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selected]);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/social?scope=ja");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "互动数据读取失败");
      setComments(data.comments || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "互动数据读取失败");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    fetch("/api/social?scope=ja")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "互动数据读取失败");
        if (active) setComments(data.comments || []);
      })
      .catch((loadError) => {
        if (active)
          setError(loadError instanceof Error ? loadError.message : "互动数据读取失败");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  const shown = comments.filter((comment) => {
    const matchesStatus =
      status === "all" ||
      (status === "pending" ? !comment.replyBody : Boolean(comment.replyBody));
    const text = `${comment.contentTitle} ${comment.authorName} ${comment.body}`.toLowerCase();
    return matchesStatus && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });
  const act = async (action: "reply" | "delete") => {
    if (!selected || saving) return;
    if (action === "reply" && reply.trim().length < 2) {
      onNotice("请填写至少 2 个字的回复");
      return;
    }
    if (action === "delete" && !window.confirm("确定删除该评论吗？此操作会留下审计记录。")) return;
    setSaving(true);
    const response = await fetch("/api/social", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        commentId: selected.id,
        action,
        reply: reply.trim(),
        scope: "ja",
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      onNotice(data.error || "处理失败");
      return;
    }
    onNotice(action === "reply" ? "JA 回复已同步到学生端" : "评论已删除");
    setSelected(null);
    setReply("");
    await load();
  };
  return (
    <>
      <section className="feedback-summary ja-feedback-summary">
        <div><small>待回复</small><b>{comments.filter((item) => !item.replyBody).length}</b></div>
        <div><small>已回复</small><b>{comments.filter((item) => item.replyBody).length}</b></div>
        <div><small>全部评论</small><b>{comments.length}</b></div>
      </section>
      <section className="feedback-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索内容、学生或评论" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="pending">待回复</option><option value="replied">已回复</option><option value="all">全部评论</option>
        </select>
        <button onClick={load}>刷新</button>
      </section>
      {loading ? <div className="admin-empty">正在读取互动数据…</div> : error ? (
        <div className="admin-empty"><b>读取失败</b><p>{error}</p><button onClick={load}>重试</button></div>
      ) : shown.length === 0 ? (
        <div className="admin-empty"><b>当前没有需要处理的评论</b><p>企业或 JA 发布内容下的学生留言会集中到这里。</p></div>
      ) : (
        <div className="feedback-list">
          {shown.map((comment) => (
            <button key={comment.id} onClick={() => { setSelected(comment); setReply(comment.replyBody || ""); }}>
              <span><b>{comment.contentTitle}</b><small>{new Date(comment.createdAt).toLocaleString("zh-CN")}</small></span>
              <p><strong>{comment.authorName}</strong>{comment.body}</p><em>{comment.replyBody ? "已回复" : "待回复"}</em>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className="dialog feedback-dialog" role="dialog" aria-modal="true" aria-label="JA 评论处理">
            <button className="dialog-close" aria-label="关闭评论处理" onClick={() => setSelected(null)}>×</button>
            <small>JA COMMENT OPERATIONS</small><h1>{selected.contentTitle}</h1>
            <article><b>{selected.authorName}</b><p>{selected.body}</p><small>{new Date(selected.createdAt).toLocaleString("zh-CN")}</small></article>
            <label>JA 项目团队回复<textarea rows={5} value={reply} onChange={(event) => setReply(event.target.value)} /></label>
            <div className="dialog-actions"><button className="danger-text-btn" onClick={() => act("delete")}>删除评论</button><button className="primary-btn" disabled={saving || reply.trim().length < 2} onClick={() => act("reply")}>{saving ? "正在处理…" : "发布回复"}</button></div>
          </section>
        </div>
      )}
    </>
  );
}

function IntegrityDesk({
  items,
  onSaved,
}: {
  items: RecordItem[];
  onSaved: (message: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
      target: "",
      type: "学生",
      summary: "",
      level: "观察",
      incidentDate: new Date().toISOString().slice(0, 10),
      handling: "",
      evidence: "",
      expiresAt: "",
    }),
    [saving, setSaving] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("active");
  const change = (key: string, value: string) =>
    setForm((v) => ({ ...v, [key]: value }));
  const save = async () => {
    if (!form.target.trim() || !form.summary.trim()) {
      await onSaved("请填写对象名称和事实说明");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/admin", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "blacklist",
        payload: {
          title: `${form.type}诚信记录：${form.target}`,
          summary: form.summary,
          target: form.target,
          type: form.type,
          level: form.level,
          incidentDate: form.incidentDate,
          handling: form.handling,
          evidence: form.evidence,
          expiresAt: form.expiresAt,
          state: "active",
        },
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      await onSaved(result.error || "记录失败");
      return;
    }
    setForm({
      target: "",
      type: "学生",
      summary: "",
      level: "观察",
      incidentDate: new Date().toISOString().slice(0, 10),
      handling: "",
      evidence: "",
      expiresAt: "",
    });
    await onSaved("诚信记录已保存");
  };
  const resolve = async (item: RecordItem) => {
    if (!window.confirm("确认将该诚信记录标记为已解除吗？记录仍会保留在审计中。")) return;
    const response = await fetch("/api/admin", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        kind: "blacklist",
        payload: {
          ...item.payload,
          state: "resolved",
          resolvedAt: new Date().toISOString(),
        },
      }),
    });
    const data = await response.json();
    await onSaved(response.ok ? "诚信记录已标记为解除" : data.error || "更新失败");
  };
  const shown = items.filter((item) => {
    const state = String(item.payload.state || "active");
    const text = `${item.payload.target || ""} ${item.payload.summary || ""} ${item.payload.type || ""}`.toLowerCase();
    return (status === "all" || state === status) && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });
  return (
    <section className="integrity-desk">
      <div className="integrity-form">
        <small>HONESTY PRINCIPLE</small>
        <h2>诚信记录</h2>
        <p>
          用于测试阶段记录虚假信息、失约、恶意提交等情况。正式上线后可接入学生或企业账号限制。
        </p>
        <label>
          对象名称
          <input
            value={form.target}
            onChange={(e) => change("target", e.target.value)}
            placeholder="学生姓名 / 企业名称"
          />
        </label>
        <label>
          对象类型
          <select
            value={form.type}
            onChange={(e) => change("type", e.target.value)}
          >
            <option>学生</option>
            <option>企业</option>
          </select>
        </label>
        <label>
          处理等级
          <select
            value={form.level}
            onChange={(e) => change("level", e.target.value)}
          >
            <option>观察</option>
            <option>限制操作</option>
            <option>黑名单永久保留</option>
          </select>
        </label>
        <label>
          记录原因
          <textarea
            rows={4}
            value={form.summary}
            onChange={(e) => change("summary", e.target.value)}
          />
        </label>
        <label>
          发生日期
          <input type="date" value={form.incidentDate} onChange={(e) => change("incidentDate", e.target.value)} />
        </label>
        <label>
          已采取措施
          <textarea rows={3} value={form.handling} onChange={(e) => change("handling", e.target.value)} placeholder="例如：电话核实、书面提醒或限制报名" />
        </label>
        <label>
          证据或工单编号
          <input value={form.evidence} onChange={(e) => change("evidence", e.target.value)} placeholder="只记录内部编号，不粘贴敏感原文" />
        </label>
        <label>
          限制到期日（选填）
          <input type="date" value={form.expiresAt} onChange={(e) => change("expiresAt", e.target.value)} />
        </label>
        <button disabled={saving} onClick={save}>
          {saving ? "正在保存…" : "保存诚信记录"}
        </button>
      </div>
      <div className="integrity-list">
        <div className="integrity-list-toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索对象或事实说明" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">生效中</option><option value="resolved">已解除</option><option value="all">全部记录</option></select>
        </div>
        {shown.length === 0 ? (
          <p>暂无诚信记录。</p>
        ) : (
          shown.map((item) => (
            <article key={item.id}>
              <header><b>{String(item.payload.target || item.payload.title)}</b><em>{String(item.payload.state || "active") === "resolved" ? "已解除" : "生效中"}</em></header>
              <span>
                {String(item.payload.type)} · {String(item.payload.level)}
              </span>
              <p>{String(item.payload.summary)}</p>
              {item.payload.handling && <small>处理：{String(item.payload.handling)}</small>}
              {item.payload.evidence && <small>凭证：{String(item.payload.evidence)}</small>}
              {String(item.payload.state || "active") !== "resolved" && <button onClick={() => resolve(item)}>标记为已解除</button>}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ReviewDrawer({
  selected,
  reason,
  setReason,
  decide,
  configure,
  close,
}: {
  selected: RecordItem;
  reason: string;
  setReason: (value: string) => void;
  decide: (
    decision: "approved" | "rejected",
    settings?: { sortOrder: number; category: string; featured: boolean },
  ) => void;
  configure: (settings: {
    sortOrder: number;
    category: string;
    featured: boolean;
  }) => void;
  close: () => void;
}) {
  useDialogEscape(close);
  const risk = reviewRiskOf(selected);
  const isJaActivity = reviewLaneOf(selected) === "ja-activity";
  const [sortOrder, setSortOrder] = useState(
      String(selected.payload.sortOrder || 0),
    ),
    [category, setCategory] = useState(
      String(
        selected.kind === "job"
          ? selected.payload.jobCategory || jobCategories[0]
          : selected.payload.category || contentCategories[0],
      ),
    ),
    [featured, setFeatured] = useState(Boolean(selected.payload.featured));
  const choices =
    selected.kind === "job"
      ? jobCategories
      : selected.kind === "activity"
        ? activityCategories
        : contentCategories;
  const blocks = (selected.payload.bodyBlocks as RichBlock[] | undefined) || [];
  return (
    <div className="admin-review-drawer">
      <button className="drawer-close" aria-label="关闭审核详情" onClick={close}>
        ×
      </button>
      <small>{kindName(selected.kind)}审核详情</small>
      <h1>{String(selected.payload.title || "未命名")}</h1>
      <div className="review-drawer-summary">
        <span className={`review-risk ${risk.level}`}>
          {risk.level === "high" ? "高风险" : risk.level === "medium" ? "需核验" : "信息较完整"}
        </span>
        <span>{isJaActivity ? "JA 内部审核" : "企业公开内容审核"}</span>
        <span>信息完整度 {risk.score}%</span>
      </div>
      <div className="review-meta">
        <span>
          <b>发布方</b>
          {String(
            selected.payload.company ||
              selected.payload.publisher ||
              "湖南平台",
          )}
        </span>
        <span>
          <b>提交时间</b>
          {new Date(String(selected.payload.submittedAt || selected.updatedAt)).toLocaleString("zh-CN")}
        </span>
        {selected.kind === "job" && (
          <>
            <span>
              <b>岗位类别</b>
              {String(selected.payload.jobCategory || "未选择")}
            </span>
            <span>
              <b>区域</b>
              {String(
                selected.payload.region || selected.payload.city || "湖南",
              )}
            </span>
            <span>
              <b>招聘邮箱</b>
              {String(selected.payload.contactEmail || "未填写")}
            </span>
          </>
        )}
      </div>
      <section className="review-evidence">
        <div className="review-evidence-head">
          <div><small>PRE-PUBLISH CHECK</small><h3>公开前核验清单</h3></div>
          <b>{risk.issues.length ? `${risk.issues.length} 项需确认` : "基础检查通过"}</b>
        </div>
        <ul>
          {[
            ["发布主体", publisherOf(selected) !== "湖南平台", "发布方名称明确"],
            ["封面素材", Boolean(selected.payload.cover), "已提供可公开展示的封面"],
            ["内容摘要", String(selected.payload.summary || "").trim().length >= 20, "摘要不少于 20 字"],
            ["正文结构", ((selected.payload.bodyBlocks as RichBlock[] | undefined) || []).length > 0, "正文包含有效内容区块"],
            ...(selected.kind === "activity"
              ? [
                  ["活动要素", Boolean(selected.payload.date && selected.payload.place), "日期与地点完整"],
                  ["报名规则", ((selected.payload.registrationFields as Field[] | undefined) || []).length > 0, "报名字段已配置"],
                ]
              : [["内容分类", Boolean(selected.payload.category), "内容分类已选择"]]),
          ].map(([name, passed, text]) => (
            <li className={passed ? "passed" : "attention"} key={String(name)}>
              <span>{passed ? "✓" : "!"}</span><div><b>{String(name)}</b><p>{String(text)}</p></div>
            </li>
          ))}
        </ul>
        {risk.issues.includes("包含外部链接，需核验") && (
          <p className="review-link-warning">检测到外部链接，请确认链接归属、有效性和隐私说明后再公开。</p>
        )}
      </section>
      {selected.payload.cover && (
        <img src={String(selected.payload.cover)} alt="发布方上传的审核素材" />
      )}
      <div className="review-settings">
        <label>
          分类
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {choices.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          排序数字
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </label>
        <label className="switch-line">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          <span>首页推荐</span>
        </label>
      </div>
      <h3>简介</h3>
      <p>{String(selected.payload.summary || "无")}</p>
      {blocks.length > 0 && (
        <AdminPreview
          item={{
            title: String(selected.payload.title || ""),
            summary: String(selected.payload.summary || ""),
            cover: String(
              selected.payload.cover || "/media/ja-career-fair.jpg",
            ),
            coverType: String(selected.payload.coverType || "image"),
            category: String(
              selected.kind === "job"
                ? selected.payload.jobCategory || ""
                : selected.payload.category || "",
            ),
            date: String(selected.payload.date || ""),
            place: String(
              selected.payload.place || selected.payload.city || "",
            ),
            bodyBlocks: blocks,
            abilityTags: selected.payload.abilityTags as string[] | undefined,
            registrationFields: selected.payload.registrationFields as
              | Field[]
              | undefined,
          }}
        />
      )}
      {Array.isArray(selected.payload.agenda) && (
        <>
          <h3>活动议程</h3>
          <ul>
            {(selected.payload.agenda as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </>
      )}
      {Array.isArray(selected.payload.registrationFields) && (
        <>
          <h3>活动报名字段</h3>
          <ul>
            {(selected.payload.registrationFields as Field[]).map((field) => (
              <li key={field.id}>
                {field.label} · {field.required ? "必填" : "选填"}
              </li>
            ))}
          </ul>
        </>
      )}
      {Array.isArray(selected.payload.responsibilities) && (
        <>
          <h3>岗位职责</h3>
          <ul>
            {selected.payload.responsibilities.map((x) => (
              <li key={String(x)}>{String(x)}</li>
            ))}
          </ul>
        </>
      )}
      {Array.isArray(selected.payload.requirements) && (
        <>
          <h3>能力要求</h3>
          <ul>
            {selected.payload.requirements.map((x) => (
              <li key={String(x)}>{String(x)}</li>
            ))}
          </ul>
        </>
      )}
      <label>
        JA 审核意见
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="通过时可填写确认意见；退回时必须说明修改内容"
        />
      </label>
      {!selected.payload.reviewStatus ||
      selected.payload.reviewStatus === "pending" ? (
        <div className="drawer-actions">
          <button
            onClick={() =>
              decide("rejected", {
                sortOrder: Number(sortOrder) || 0,
                category,
                featured,
              })
            }
          >
            {isJaActivity ? "退回 JA 发布人员" : "退回企业修改"}
          </button>
          <button
            className="approve"
            onClick={() =>
              decide("approved", {
                sortOrder: Number(sortOrder) || 0,
                category,
                featured,
              })
            }
          >
            审核通过并公开
          </button>
        </div>
      ) : (
        <>
          <p className="review-result">
            当前状态：{stateName(selected.payload.reviewStatus)}
            <br />
            {String(selected.payload.reviewNote || "")}
          </p>
          {selected.payload.reviewStatus === "approved" && (
            <button
              className="save-display-settings"
              onClick={() =>
                configure({
                  sortOrder: Number(sortOrder) || 0,
                  category,
                  featured,
                })
              }
            >
              保存展示设置
            </button>
          )}
        </>
      )}
    </div>
  );
}
