/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages, jsx-a11y/media-has-caption, @typescript-eslint/no-unused-vars */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PageTransition, runViewTransition, type TransitionDirection } from "../components/motion";
import { ToastProvider, useToast } from "../components/ui";
import {
  normalizeWorkspaceRoute,
  workspaceLocation,
  workspacePath,
} from "../../lib/ui/workspace-routes";
import {
  activities,
  contents,
  jobs,
  type Activity,
  type ContentItem,
  type Job,
  type RegistrationField,
  type RichBlock,
} from "../data";

type Role = "student" | "enterprise";
type StoredRecord = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  version?: number;
  updatedAt?: string;
};
const nav: Record<Role, [string, string, string][]> = {
  student: [
    ["overview", "总览", "⌂"],
    ["opportunities", "实习项目机会", "⌕"],
    ["activities", "成长活动", "◇"],
    ["content", "成长内容", "▱"],
    ["profile", "成长主页", "○"],
  ],
  enterprise: [
    ["overview", "工作台", "⌂"],
    ["positions", "机会发布", "▣"],
    ["activities", "活动发布", "◇"],
    ["content", "内容发布", "▱"],
    ["feedback", "互动管理", "♡"],
    ["registrations", "报名数据", "☷"],
    ["profile", "企业画像", "○"],
  ],
};
const jobCategories = [
  "全部类别",
  "产品运营",
  "技术研发",
  "数据分析",
  "品牌内容",
  "智能制造",
  "金融与商业",
  "项目实践",
  "公益实践",
];
const degreeOptions = ["全部学历", "高中", "大专", "本科", "硕士", "博士"];
const industryOptions = [
  "全部行业",
  "互联网AI",
  "电子通信半导体",
  "服务业",
  "消费批发零售",
  "房地产建筑",
  "教育培训",
  "广告传媒文化体育",
  "制造业",
  "专业服务",
  "医疗",
  "汽车",
  "交通运输物流",
  "能源化工环保",
  "金融",
  "政府公益",
];
const contentCategories = [
  "全部内容",
  "技能成长",
  "活动分享",
  "企业曝光",
  "职业探索",
  "简历面试",
  "公益实践",
];
const activityCategories = [
  "企业参访",
  "职业体验",
  "主题工作坊",
  "赛事路演",
  "志愿公益",
  "校园活动",
];
const registrationOptions: RegistrationField[] = [
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
const starterBlocks: Record<"content" | "activity", RichBlock[]> = {
  content: [
    { id: "b1", type: "heading", title: "学习目标" },
    {
      id: "b2",
      type: "text",
      text: "说明学生读完或看完后能够获得什么。支持分段、图片、视频和附件搭配。",
    },
    { id: "b3", type: "heading", title: "核心内容" },
    {
      id: "b4",
      type: "card",
      title: "关联机会 / 企业 / 活动",
      text: "可在这里写入关联对象，后续正式数据库阶段只保存对象 ID。",
    },
  ],
  activity: [
    { id: "b1", type: "heading", title: "活动背景" },
    {
      id: "b2",
      type: "text",
      text: "介绍活动为什么举办、面向谁、希望学生完成什么真实任务。",
    },
    {
      id: "b3",
      type: "agenda",
      title: "09:00-09:30 签到｜09:30-11:00 企业参访｜11:00-12:00 小组任务",
    },
    { id: "b4", type: "heading", title: "你将获得" },
    {
      id: "b5",
      type: "text",
      text: "活动结束后可根据完成情况形成 JA 认证经历、能力证据和项目成果。",
    },
  ],
};

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  // Local preview pages have no persisted account session. The runtime accepts
  // this role hint only for localhost; deployed environments always use the
  // signed account session and ignore it.
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    headers.set(
      "x-starlight-role",
      workspaceLocation(window.location.pathname, window.location.search).role,
    );
  }
  return fetch(path, {
    ...init,
    headers,
  });
}
function useDialogEscape(close: () => void) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);
}

export default function PlatformApp({
  ...props
}: {
  initialRole: Role;
  initialTab?: string;
  initialItem?: string;
}) {
  return (
    <ToastProvider>
      <PlatformWorkspace {...props} />
    </ToastProvider>
  );
}

function PlatformWorkspace({
  initialRole,
  initialTab,
  initialItem,
}: {
  initialRole: Role;
  initialTab?: string;
  initialItem?: string;
}) {
  const { show } = useToast();
  const [role] = useState<Role>(initialRole),
    [tab, setActiveTab] = useState(
      () => normalizeWorkspaceRoute(initialRole, initialTab).tab,
    ),
    [direction, setDirection] = useState<TransitionDirection>("none"),
    [records, setRecords] = useState<StoredRecord[]>([]),
    [catalog, setCatalog] = useState<StoredRecord[]>([]),
    [ready, setReady] = useState(false);
  const scrollPositions = useRef(new Map<string, number>());
  const navigationPending = useRef(false);
  const tabOrder = useMemo(() => nav[role].map(([id]) => id), [role]);
  const directionFor = useCallback(
    (current: string, next: string): TransitionDirection =>
      tabOrder.indexOf(next) >= tabOrder.indexOf(current) ? "forward" : "back",
    [tabOrder],
  );
  const navigate = useCallback(
    (nextTab: string) => {
      const next = normalizeWorkspaceRoute(role, nextTab).tab;
      if (next === tab) return;
      scrollPositions.current.set(tab, window.scrollY);
      navigationPending.current = true;
      setDirection(directionFor(tab, next));
      runViewTransition(() => {
        window.history.pushState({ role, tab: next }, "", workspacePath(role, next));
        setActiveTab(next);
      });
    },
    [directionFor, role, tab],
  );
  useEffect(() => {
    const onPopState = () => {
      const next = workspaceLocation(window.location.pathname, window.location.search);
      if (next.role !== role || next.tab === tab) return;
      scrollPositions.current.set(tab, window.scrollY);
      navigationPending.current = true;
      setDirection(directionFor(tab, next.tab));
      runViewTransition(() => setActiveTab(next.tab));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [directionFor, role, tab]);
  useEffect(() => {
    if (!navigationPending.current) return;
    navigationPending.current = false;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPositions.current.get(tab) || 0, behavior: "instant" });
      document.querySelector<HTMLElement>("[data-page-heading]")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab]);
  useEffect(() => {
    Promise.all([
      api("/api/platform").then((r) => r.json()),
      fetch("/api/catalog").then((r) => r.json()),
    ])
      .then(([mine, publicData]) => {
        setRecords(mine.records || []);
        setCatalog(publicData.records || []);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);
  const flash = useCallback(
    (message: string) =>
      show(message, /失败|错误|无权|请填写|请先/.test(message) ? "error" : "success"),
    [show],
  );
  const save = async (
    kind: string,
    payload: Record<string, unknown>,
    id?: string,
  ) => {
    const response = await api("/api/platform", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: id || String(payload.id || ""),
        kind,
        payload,
        version: id ? records.find((record) => record.id === id)?.version : undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      flash(data.error || "保存失败");
      return null;
    }
    const record = {
      id: data.id,
      kind,
      payload: { ...payload, id: data.id },
      version: Number(data.version || 1),
      updatedAt: new Date().toISOString(),
    };
    setRecords((v) => [record, ...v.filter((x) => x.id !== data.id)]);
    flash(
      payload.reviewStatus === "draft"
        ? "草稿已安全保存"
        : payload.reviewStatus === "approved"
          ? "已发布并同步到学生端"
          : "已提交审核，可在发布中心查看进度",
    );
    return data.id as string;
  };
  const remove = async (id: string) => {
    await api(`/api/platform?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setRecords((v) => v.filter((x) => x.id !== id));
    flash("已删除");
  };
  const upload = async (file: File, purpose = "media") => {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);
    const response = await api("/api/files", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      flash(data.error || "上传失败");
      return null;
    }
    flash(purpose === "resume" ? "简历上传成功，仅你自己可见" : "媒体上传成功");
    return data as {
      url: string | null;
      key: string;
      name: string;
      type: string;
    };
  };
  const studentName = String(
    records.find((r) => r.kind === "student-profile")?.payload.name || "张晨",
  );
  const enterpriseName = String(
    records.find((r) => r.kind === "enterprise-profile")?.payload.name ||
      "企业工作台",
  );
  return (
    <div className="platform v2">
      <aside className="side">
        <a href="/" className="side-brand official-side-brand">
          <img src="/media/ja-china-logo.jpg" alt="JA China" />
          <b>Star Plan</b>
        </a>
        <nav>
          {nav[role].map(([id, label, glyph]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <span>{glyph}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="side-help contact-only">
          <a href="mailto:support@jachina.org">联系项目团队 →</a>
        </div>
        <button className="back" onClick={async () => { await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) }); location.assign("/"); }}>退出登录</button>
      </aside>
      <div className="work">
        <header className="topbar fixed-workspace-title">
          <div className="workspace-context">
            <b>
              {role === "student"
                ? `你好，${studentName}`
                : `你好，${enterpriseName}`}
            </b>
          </div>
          <NotificationCenter />
          <div
            className="sync-dot"
            aria-label={ready ? "已同步" : "正在载入"}
          />
        </header>
        <main className="workspace">
          <PageTransition
            identity={`${role}-${tab}`}
            direction={direction}
            className="workspace-view page-transition"
          >
            {role === "student" ? (
              <StudentSpace
                tab={tab}
                initialItem={initialItem}
                setTab={navigate}
                records={records}
                catalog={catalog}
                save={save}
                upload={upload}
                flash={flash}
              />
            ) : (
              <EnterpriseSpace
                tab={tab}
                setTab={navigate}
                records={records}
                save={save}
                remove={remove}
                upload={upload}
                flash={flash}
              />
            )}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

type Notice = { id: string; title: string; body: string; targetUrl?: string; readAt?: string | null; createdAt: string };
function NotificationCenter() {
  const [items, setItems] = useState<Notice[]>([]), [unread, setUnread] = useState(0), [open, setOpen] = useState(false);
  const load = useCallback(() => api("/api/notifications").then(async (response) => {
    if (!response.ok) return;
    const data = await response.json(); setItems(data.notifications || []); setUnread(Number(data.unread || 0));
  }).catch(() => {}), []);
  useEffect(() => { load(); const timer = window.setInterval(load, 60000); return () => window.clearInterval(timer); }, [load]);
  const readAll = async () => { await api("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) }); setItems((value) => value.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))); setUnread(0); };
  return <div className="notification-center">
    <button className="notification-trigger" aria-label={`通知${unread ? `，${unread} 条未读` : ""}`} onClick={() => setOpen((value) => !value)}>♢{unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}</button>
    {open && <section className="notification-panel" aria-label="通知中心">
      <header><div><small>NOTIFICATIONS</small><h2>通知中心</h2></div><button disabled={!unread} onClick={readAll}>全部已读</button></header>
      {items.length ? items.map((item) => <a className={item.readAt ? "" : "unread"} key={item.id} href={item.targetUrl || "/workspace"}><b>{item.title}</b><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString("zh-CN")}</small></a>) : <p className="notification-empty">暂无通知</p>}
    </section>}
  </div>;
}

function Title({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title" data-page-heading tabIndex={-1}>
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {action}
    </div>
  );
}
function Metric({
  label,
  value,
  note,
  tone = "aqua",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <b>{value}</b>
      <p>{note}</p>
    </article>
  );
}
function Logo({
  job,
  size = "normal",
}: {
  job: Job;
  size?: "normal" | "large";
}) {
  return (
    <div
      className={`real-logo ${size}`}
      style={{ background: job.logoUrl ? "white" : job.color }}
    >
      {job.logoUrl ? (
        <img src={job.logoUrl} alt={`${job.company} logo`} />
      ) : (
        job.logo
      )}
    </div>
  );
}

function StudentSpace({
  tab,
  initialItem,
  setTab,
  records,
  catalog,
  save,
  upload,
  flash,
}: {
  tab: string;
  initialItem?: string;
  setTab: (s: string) => void;
  records: StoredRecord[];
  catalog: StoredRecord[];
  save: (
    k: string,
    p: Record<string, unknown>,
    i?: string,
  ) => Promise<string | null>;
  upload: (
    f: File,
    p?: string,
  ) => Promise<{
    url: string | null;
    key: string;
    name: string;
    type: string;
  } | null>;
  flash: (s: string) => void;
}) {
  const customJobs = catalog
    .filter((r) => r.kind === "job")
    .map((r) => ({ ...r.payload, id: r.id }) as unknown as Job);
  const customActivities = catalog
    .filter((r) => r.kind === "activity")
    .map((r) => ({ ...r.payload, id: r.id }) as unknown as Activity);
  const customContents = catalog
    .filter((r) => r.kind === "content")
    .map((r) => ({ ...r.payload, id: r.id }) as unknown as ContentItem);
  const allJobs = [...customJobs, ...jobs];
  const allActivities = [...customActivities, ...activities];
  const allContents = [...customContents, ...contents];
  if (tab === "overview")
    return (
      <StudentOverview
        setTab={setTab}
        allJobs={allJobs}
        allActivities={allActivities}
        allContents={allContents}
        profile={records.find((record) => record.kind === "student-profile")}
      />
    );
  if (tab === "opportunities")
    return <OpportunityBrowser allJobs={allJobs} flash={flash} />;
  if (tab === "activities")
    return <ActivityExperience custom={customActivities} flash={flash} initialItem={initialItem} />;
  if (tab === "content")
    return <LearningCenter custom={customContents} flash={flash} initialItem={initialItem} />;
  return (
    <StudentProfile
      record={records.find((r) => r.kind === "student-profile")}
      save={save}
      upload={upload}
    />
  );
}

function StudentOverview({
  setTab,
  allJobs,
  allActivities,
  allContents,
  profile,
}: {
  setTab: (s: string) => void;
  allJobs: Job[];
  allActivities: Activity[];
  allContents: ContentItem[];
  profile?: StoredRecord;
}) {
  const sortedJobs = [...allJobs].sort((a, b) =>
    String(b.publishedAt).localeCompare(String(a.publishedAt)),
  );
  const sortedActivities = [...allActivities].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );
  const sortedContents = [...allContents].sort(
    (a, b) =>
      Number((b as unknown as { sortOrder?: number }).sortOrder || 0) -
      Number((a as unknown as { sortOrder?: number }).sortOrder || 0),
  );
  return (
    <>
      <Title eyebrow="OVERVIEW" title="总览" desc="" />
      <section className="student-overview-grid">
        <article className="overview-panel large">
          <div className="panel-head">
            <div>
              <small>OPPORTUNITIES</small>
              <h2>最新实习项目机会</h2>
            </div>
            <button onClick={() => setTab("opportunities")}>查看全部 →</button>
          </div>
          <div className="overview-job-stack">
            {sortedJobs.slice(0, 5).map((j) => (
              <button key={j.id} onClick={() => setTab("opportunities")}>
                <Logo job={j} />
                <span>
                  <b>{j.company}</b>
                  <strong>{j.title}</strong>
                  <em>
                    {j.city} · {j.duration} · {j.salary || "薪资面议"}
                  </em>
                </span>
                <i>{j.jobCategory}</i>
              </button>
            ))}
          </div>
        </article>
        <article className="overview-panel">
          <div className="panel-head">
            <div>
              <small>ACTIVITIES</small>
              <h2>成长活动</h2>
            </div>
            <button onClick={() => setTab("activities")}>查看全部 →</button>
          </div>
          {sortedActivities.slice(0, 3).map((a) => (
            <button
              className="overview-media-line"
              key={a.id}
              onClick={() => setTab("activities")}
            >
              <img src={a.cover} alt={a.title} />
              <span>
                <b>{a.title}</b>
                <em>
                  {a.publisher || "JA China"} · {a.date}
                </em>
              </span>
            </button>
          ))}
        </article>
        <article className="overview-panel">
          <div className="panel-head">
            <div>
              <small>CONTENTS</small>
              <h2>成长内容</h2>
            </div>
            <button onClick={() => setTab("content")}>查看全部 →</button>
          </div>
          {sortedContents.slice(0, 3).map((c) => (
            <button
              className="overview-media-line"
              key={c.id}
              onClick={() => setTab("content")}
            >
              <img src={c.cover} alt={c.title} />
              <span>
                <b>{c.title}</b>
                <em>{c.duration}</em>
              </span>
            </button>
          ))}
        </article>
        <GrowthTimelinePreview profile={profile} onOpen={() => setTab("profile")} />
      </section>
    </>
  );
}

function GrowthTimelinePreview({
  profile,
  onOpen,
}: {
  profile?: StoredRecord;
  onOpen: () => void;
}) {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  useEffect(() => {
    api("/api/registrations")
      .then((response) => response.json())
      .then((data) => setRegistrations(data.registrations || []))
      .catch(() => setRegistrations([]));
  }, []);
  const manual = String(profile?.payload.timelineItems || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [date, , title, , result] = line.split("｜");
      return [date || "待补充", title || "未命名经历", result || "待补充成果"];
    });
  const certified = registrations
    .filter((item) => item.status === "approved")
    .map((item) => [
      new Date(item.reviewedAt || item.createdAt).toLocaleDateString("zh-CN").replaceAll("/", "."),
      item.activityTitle,
      item.reviewNote || "活动参与已由发布方确认",
    ]);
  const items = [...certified, ...manual]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .slice(0, 3);
  return (
    <section className="overview-panel growth-timeline-preview">
      <div className="panel-head">
        <div>
          <small>GROWTH TIMELINE</small>
          <h2>个人成长主页</h2>
        </div>
        <button onClick={onOpen}>查看完整时间轴 →</button>
      </div>
      <div>
        {items.map(([date, title, result]) => (
          <button key={title} onClick={onOpen}>
            <time>{date}</time>
            <span>
              <b>{title}</b>
              <em>{result}</em>
            </span>
          </button>
        ))}
        {items.length === 0 && (
          <button className="timeline-preview-empty" onClick={onOpen}>
            <span><b>开始建立成长时间轴</b><em>参加活动或手动添加经历后，会在这里形成真实记录。</em></span>
          </button>
        )}
      </div>
    </section>
  );
}

function GrowthMap({ onOpen }: { onOpen?: () => void }) {
  const nodes = [
    ["技能", "简历表达、数据分析、内容策划", "86%"],
    ["思维", "问题拆解、商业判断、复盘意识", "72%"],
    ["格局", "公益实践、团队协作、社会责任", "64%"],
    ["成果", "项目作品、活动反馈、JA 认证", "78%"],
  ];
  return (
    <section className="growth-map panel">
      <div className="panel-head">
        <div>
          <small>GROWTH PROFILE</small>
          <h2>个人成长主页</h2>
        </div>
        {onOpen && <button onClick={onOpen}>查看主页 →</button>}
      </div>
      <div className="growth-tree">
        {nodes.map(([name, desc, score]) => (
          <article key={name}>
            <i style={{ height: score }} />
            <b>{name}</b>
            <p>{desc}</p>
            <span>{score}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function OpportunityBrowser({
  allJobs,
  flash,
}: {
  allJobs: Job[];
  flash: (s: string) => void;
}) {
  const [q, setQ] = useState(""),
    [category, setCategory] = useState("全部类别"),
    [degree, setDegree] = useState("全部学历"),
    [industry, setIndustry] = useState("全部行业"),
    [salaryMin, setSalaryMin] = useState(0),
    [salaryMax, setSalaryMax] = useState(500),
    [sort, setSort] = useState("latest"),
    [open, setOpen] = useState("岗位类别"),
    [selected, setSelected] = useState<Job | null>(null),
    [company, setCompany] = useState<string | null>(null);
  const shown = useMemo(
    () =>
      allJobs
        .filter(
          (j) =>
            (category === "全部类别" || j.jobCategory === category) &&
            (degree === "全部学历" || j.degree === degree) &&
            (industry === "全部行业" || j.industry === industry) &&
            Number(j.salaryMax || 500) >= salaryMin &&
            Number(j.salaryMin || 0) <= salaryMax &&
            (j.company + j.title + j.jobCategory + j.tags.join(""))
              .toLowerCase()
              .includes(q.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "salary-high"
            ? Number(b.salaryMax || 0) - Number(a.salaryMax || 0)
            : sort === "salary-low"
              ? Number(a.salaryMin || 0) - Number(b.salaryMin || 0)
              : String(b.publishedAt).localeCompare(String(a.publishedAt)),
        ),
    [allJobs, q, category, degree, industry, salaryMin, salaryMax, sort],
  );
  const resetFilters = () => {
    setQ("");
    setCategory("全部类别");
    setDegree("全部学历");
    setIndustry("全部行业");
    setSalaryMin(0);
    setSalaryMax(500);
    setSort("latest");
    setOpen("");
  };
  const copy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const area = document.createElement("textarea");
      area.value = email;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    flash(`招聘邮箱已复制：${email}`);
  };
  const mail = (j: Job) => {
    window.location.href = `mailto:${j.contactEmail}?subject=${encodeURIComponent(`应聘${j.title}｜来自 JA 星光计划`)}&body=${encodeURIComponent(`您好，我希望申请贵公司的「${j.title}」岗位，简历见附件。\n\n姓名：\n学校：\n联系电话：`)}`;
  };
  const group = (name: string, summary: string, children: React.ReactNode) => (
    <section className={`filter-dropdown ${open === name ? "open" : ""}`}>
      <button
        className="filter-trigger"
        onClick={() => setOpen(open === name ? "" : name)}
      >
        <span>
          <b>{name}</b>
          <em>{summary}</em>
        </span>
        <i>{open === name ? "−" : "+"}</i>
      </button>
      <div className="filter-panel">{children}</div>
    </section>
  );
  const companyJobs = company
    ? allJobs.filter((j) => j.company === company)
    : [];
  return (
    <>
      <Title eyebrow="OPPORTUNITIES" title="实习项目机会" desc="" />
      <section className="opportunity-filter-system compact">
        <label className="search-field">
          ⌕
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索企业、岗位或技能"
          />
        </label>
        {group(
          "岗位类别",
          category,
          <nav>
            {jobCategories.map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </nav>,
        )}
        {group(
          "学历要求",
          degree,
          <nav>
            {degreeOptions.map((item) => (
              <button
                key={item}
                className={degree === item ? "active" : ""}
                onClick={() => setDegree(item)}
              >
                {item}
              </button>
            ))}
          </nav>,
        )}
        {group(
          "薪资待遇",
          `${salaryMin} - ${salaryMax} 元/天`,
          <div
            className="dual-salary salary-dual-slider"
            style={
              {
                "--from": `${salaryMin / 5}%`,
                "--to": `${salaryMax / 5}%`,
              } as CSSProperties
            }
          >
            <div className="salary-range-values">
              <span>下限 {salaryMin} 元/天</span>
              <span>上限 {salaryMax} 元/天</span>
            </div>
            <div className="double-range">
              <input
                aria-label="薪资下限"
                type="range"
                min="0"
                max="500"
                step="1"
                value={salaryMin}
                onChange={(e) =>
                  setSalaryMin(Math.min(Number(e.target.value), salaryMax))
                }
              />
              <input
                aria-label="薪资上限"
                type="range"
                min="0"
                max="500"
                step="1"
                value={salaryMax}
                onChange={(e) =>
                  setSalaryMax(Math.max(Number(e.target.value), salaryMin))
                }
              />
            </div>
            <div className="salary-range-labels">
              <span>0</span>
              <span>500 元/天</span>
            </div>
          </div>,
        )}
        {group(
          "行业分类",
          industry,
          <nav>
            {industryOptions.map((item) => (
              <button
                key={item}
                className={industry === item ? "active" : ""}
                onClick={() => setIndustry(item)}
              >
                {item}
              </button>
            ))}
          </nav>,
        )}
      </section>
      <div className="opportunity-resultbar">
        <div><b>{shown.length}</b><span>个机会符合当前条件</span></div>
        <label>
          排序
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="latest">最新发布</option>
            <option value="salary-high">最高薪资优先</option>
            <option value="salary-low">最低门槛优先</option>
          </select>
        </label>
        <button onClick={resetFilters}>清空筛选</button>
      </div>
      <div className="student-job-list">
        {shown.map((j) => (
          <article key={j.id}>
            <div className="student-job-main">
              <Logo job={j} size="large" />
              <div>
                <button
                  className="company-name-link"
                  onClick={() => setCompany(j.company)}
                >
                  {j.company}
                </button>
                <h3>{j.title}</h3>
                <p>{j.summary}</p>
                <small>
                  {j.city || "湖南"} · {j.duration} · 发布于 {j.publishedAt} ·{" "}
                  {j.salary || "薪资面议"}
                </small>
              </div>
              <span
                className={j.status === "即将截止" ? "status warn" : "status"}
              >
                {j.status}
              </span>
            </div>
            <div className="student-job-tags">
              <span>{j.jobCategory}</span>
              <span>{j.degree || "学历不限"}</span>
              <span>{j.industry || "行业不限"}</span>
            </div>
            <div className="email-strip">
              <div>
                <small>简历投递邮箱</small>
                <a href={`mailto:${j.contactEmail}`}>{j.contactEmail}</a>
              </div>
              <button onClick={() => copy(j.contactEmail)}>复制邮箱</button>
              <button className="primary-btn" onClick={() => mail(j)}>
                写邮件
              </button>
            </div>
            <button className="detail-link" onClick={() => setSelected(j)}>
              查看职责、要求与项目说明 →
            </button>
          </article>
        ))}
        {shown.length === 0 && (
          <section className="opportunity-empty">
            <b>暂时没有匹配的机会</b>
            <p>可以放宽薪资区间或清空部分分类条件后再查看。</p>
            <button className="primary-btn" onClick={resetFilters}>查看全部机会</button>
          </section>
        )}
      </div>
      {selected && (
        <JobDialog
          job={selected}
          onClose={() => setSelected(null)}
          onMail={() => mail(selected)}
          onCopy={() => copy(selected.contactEmail)}
        />
      )}{" "}
      {company && (
        <CompanyJobsDialog
          company={company}
          jobs={companyJobs}
          onClose={() => setCompany(null)}
          onSelect={(job) => {
            setCompany(null);
            setSelected(job);
          }}
        />
      )}
    </>
  );
}

function JobDialog({
  job,
  onClose,
  onMail,
  onCopy,
}: {
  job: Job;
  onClose: () => void;
  onMail: () => void;
  onCopy: () => void;
}) {
  useDialogEscape(onClose);
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="dialog job-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${job.company} ${job.title}`}
      >
        <button className="dialog-close" aria-label="关闭弹窗" onClick={onClose}>
          ×
        </button>
        <header>
          <Logo job={job} size="large" />
          <div>
            <span>{job.status}</span>
            <h2>{job.company}</h2>
            <h1>{job.title}</h1>
            <p>
              {job.city} · {job.mode} · {job.duration}
            </p>
          </div>
        </header>
        <div className="dialog-body">
          <div>
            <h3>岗位简介</h3>
            <p>{job.summary}</p>
            <h3>岗位职责</h3>
            <ol>
              {job.responsibilities.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
            <h3>能力要求</h3>
            <ul>
              {job.requirements.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <h3>你将获得</h3>
            <div className="benefits">
              {job.benefits.map((x) => (
                <span key={x}>✓ {x}</span>
              ))}
            </div>
          </div>
          <aside>
            <small>简历投递邮箱</small>
            <a href={`mailto:${job.contactEmail}`}>{job.contactEmail}</a>
            <button className="primary-btn" onClick={onMail}>
              打开邮箱写信
            </button>
            <button className="outline-btn" onClick={onCopy}>
              复制邮箱地址
            </button>
            <p>
              请在邮件中附上 PDF/DOCX 简历。平台不会读取你的邮件或代为投递。
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}

function CompanyJobsDialog({
  company,
  jobs,
  onClose,
  onSelect,
}: {
  company: string;
  jobs: Job[];
  onClose: () => void;
  onSelect: (job: Job) => void;
}) {
  useDialogEscape(onClose);
  const first = jobs[0];
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="dialog company-jobs-dialog"
        role="dialog"
        aria-modal="true"
      >
        <button className="dialog-close" aria-label="关闭弹窗" onClick={onClose}>
          ×
        </button>
        <header>
          {first && <Logo job={first} size="large" />}
          <div>
            <small>COMPANY OPPORTUNITIES</small>
            <h1>{company}</h1>
            <p>该企业当前公开的全部实习项目机会</p>
          </div>
        </header>
        <div className="company-job-stack">
          {jobs.map((job) => (
            <button key={job.id} onClick={() => onSelect(job)}>
              <span>
                <b>{job.title}</b>
                <em>
                  {job.city} · {job.duration} · {job.salary || "薪资面议"}
                </em>
              </span>
              <i>{job.jobCategory}</i>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

type RegistrationItem = {
  id: string;
  activityId: string;
  activityTitle: string;
  answers: Record<string, string>;
  status: "pending" | "approved" | "rejected" | string;
  reviewNote?: string;
  reviewedAt?: string | null;
  createdAt: string;
};

function ActivityExperience({
  custom,
  flash,
  initialItem,
}: {
  custom: Activity[];
  flash: (s: string) => void;
  initialItem?: string;
}) {
  const list = [...custom, ...activities].sort(
    (a, b) =>
      Number((b as unknown as { sortOrder?: number }).sortOrder || 0) -
        Number((a as unknown as { sortOrder?: number }).sortOrder || 0) ||
      String(b.date).localeCompare(String(a.date)),
  );
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]),
    [selectedId, setSelectedId] = useState(initialItem || ""),
    [activeIndex, setActiveIndex] = useState(0),
    [registrationLoading, setRegistrationLoading] = useState(true);
  useEffect(() => {
    api("/api/registrations")
      .then((r) => r.json())
      .then((data) => setRegistrations(data.registrations || []))
      .catch(() => setRegistrations([]))
      .finally(() => setRegistrationLoading(false));
  }, []);
  useEffect(() => {
    if (list.length < 2) return;
    const timer = window.setInterval(
      () => setActiveIndex((index) => (index + 1) % list.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [list.length]);
  const existing = (id: string) =>
    registrations.find((r) => r.activityId === id);
  const submitted = async (
    activity: Activity,
    answers: Record<string, string>,
  ) => {
    const response = await api("/api/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        activityId: activity.id,
        activityTitle: activity.title,
        activityDate: activity.date,
        answers,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      flash(data.error || "报名失败");
      return;
    }
    const refreshed = await api("/api/registrations").then((r) => r.json());
    setRegistrations(refreshed.registrations || []);
    setSelectedId("");
    flash("报名已提交，正在等待企业确认");
  };
  const cancelRegistration = async (activity: Activity) => {
    const response = await api(
      `/api/registrations?activityId=${encodeURIComponent(activity.id)}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    if (!response.ok) return flash(data.error || "取消报名失败");
    setRegistrations((value) => value.filter((item) => item.activityId !== activity.id));
    setSelectedId("");
    flash("已取消本次活动报名");
  };
  const stateText = (activity: Activity) => {
    const current = existing(activity.id);
    return !current
      ? "填写信息并报名"
      : current.status === "approved"
        ? "已通过 · 查看信息"
        : current.status === "rejected"
          ? "已退回 · 修改后重提"
          : "确认中 · 查看或修改";
  };
  const displayIndex = activeIndex % Math.max(1, list.length);
  const active = list[displayIndex] || list[0];
  const selected = list.find((activity) => activity.id === selectedId) || null;
  const activeRegistration = active ? existing(active.id) : undefined;
  return (
    <>
      <Title eyebrow="ACTIVITIES" title="成长活动" desc="" />
      {registrationLoading && <p className="activity-sync-state">正在同步我的报名状态…</p>}
      {active && (
        <section className="activity-showcase auto-showcase">
          <div className="activity-horizontal">
            <div
              className="activity-scroll-row auto-track"
              style={{ transform: `translateX(-${displayIndex * 100}%)` }}
            >
              {list.map((activity, index) => (
                <button
                  key={activity.id}
                  className={index === displayIndex ? "active" : ""}
                  onClick={() => setActiveIndex(index)}
                >
                  {activity.coverType === "video" ? (
                    <video src={activity.cover} muted playsInline />
                  ) : (
                    <img src={activity.cover} alt={activity.title} />
                  )}
                  <span>{activity.category}</span>
                  <b>{activity.title}</b>
                  <small>
                    {activity.publisher || "JA China"} · {activity.date}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <aside className="activity-detail-side">
            <small>
              {active.publisher || "JA China"} · {active.date}
            </small>
            <h2>{active.title}</h2>
            <p>{active.summary}</p>
            <div className="activity-meta">
              <span>{active.place}</span>
              <span>
                {active.registered} / {active.capacity} 人
              </span>
              <span>{active.status}</span>
            </div>
            {active.abilityTags?.length ? (
              <div className="ability-chip-row compact-ability">
                {active.abilityTags.slice(0, 4).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}
            {activeRegistration && (
              <p
                className={`registration-hint status-${activeRegistration.status}`}
              >
                <b>
                  {activeRegistration.status === "approved"
                    ? "企业已确认通过"
                    : activeRegistration.status === "rejected"
                      ? "企业已退回"
                      : "企业确认中"}
                </b>
                {activeRegistration.reviewNote
                  ? ` · ${activeRegistration.reviewNote}`
                  : ""}
              </p>
            )}
            <button
              className={
                activeRegistration?.status === "approved" ||
                activeRegistration?.status === "pending"
                  ? "outline-btn"
                  : "primary-btn"
              }
              onClick={() => setSelectedId(active.id)}
            >
              {stateText(active)}
            </button>
          </aside>
        </section>
      )}
      <h2 className="subsection-title">全部活动</h2>
      <div className="activity-feed compact-feed">
        {list.map((activity) => {
          const current = existing(activity.id);
          return (
            <article key={activity.id}>
              <div className="activity-cover">
                {activity.coverType === "video" ? (
                  <video src={activity.cover} muted playsInline />
                ) : (
                  <img src={activity.cover} alt={activity.title} />
                )}
                <span>{activity.category}</span>
              </div>
              <div className="activity-info">
                <h2>{activity.title}</h2>
                <small>
                  {activity.publisher || "JA China"} · {activity.date}
                </small>
                <p>{activity.summary}</p>
                <div className="activity-meta">
                  <span>{activity.place}</span>
                  <span>
                    {activity.registered} / {activity.capacity} 人
                  </span>
                  <span>{activity.status}</span>
                </div>
              </div>
              <button
                className={
                  current?.status === "approved" ||
                  current?.status === "pending"
                    ? "outline-btn"
                    : "primary-btn"
                }
                onClick={() => setSelectedId(activity.id)}
              >
                {stateText(activity)}
              </button>
            </article>
          );
        })}
      </div>
      {selected && (
        <ActivityRegistrationDialog
          activity={selected}
          previous={existing(selected.id)?.answers}
          registration={existing(selected.id)}
          onClose={() => setSelectedId("")}
          onSubmit={(answers) => submitted(selected, answers)}
          onCancel={() => cancelRegistration(selected)}
        />
      )}
    </>
  );
}

function ActivityRegistrationDialog({
  activity,
  previous,
  registration,
  onClose,
  onSubmit,
  onCancel,
}: {
  activity: Activity;
  previous?: Record<string, string>;
  registration?: RegistrationItem;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => Promise<void>;
  onCancel: () => Promise<void>;
}) {
  useDialogEscape(onClose);
  const fields = activity.registrationFields?.length
    ? activity.registrationFields
    : ([
        { id: "name", label: "姓名", type: "text", required: true },
        { id: "phone", label: "联系电话", type: "tel", required: true },
        { id: "school", label: "学校与专业", type: "text", required: true },
      ] as RegistrationField[]);
  const readOnly = registration?.status === "approved";
  const [answers, setAnswers] = useState<Record<string, string>>(
      previous || {},
    ),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const submit = async () => {
    const missing = fields.find(
      (f) => f.required && !String(answers[f.id] || "").trim(),
    );
    if (missing) {
      setError(`请填写：${missing.label}`);
      return;
    }
    setSaving(true);
    await onSubmit(answers);
    setSaving(false);
  };
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="dialog registration-dialog rich-registration-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${activity.title}报名`}
      >
        <button className="dialog-close" aria-label="关闭弹窗" onClick={onClose}>
          ×
        </button>
        <div className="registration-layout">
          <div className="registration-reader">
            <ContentRenderer item={{ ...activity, mediaType: "article" }} />
          </div>
          <aside className="registration-form-panel">
            <small>ACTIVITY REGISTRATION</small>
            <h1>填写报名信息</h1>
            <p className="registration-lead">
              请按活动发布方要求填写。标有“必填”的项目必须完成，提交后企业活动负责人和
              JA 后台均可查看。
            </p>
            <div className="registration-progress" aria-label="报名处理进度">
              <span className="done"><b>1</b>填写信息</span>
              <i />
              <span className={registration ? "done" : "active"}><b>2</b>企业确认</span>
              <i />
              <span className={registration?.status === "approved" ? "done" : ""}><b>3</b>报名结果</span>
            </div>
            {registration && (
              <div className={`registration-result-card status-${registration.status}`}>
                <b>
                  {registration.status === "approved"
                    ? "报名已通过"
                    : registration.status === "rejected"
                      ? "报名已退回，可修改后重新提交"
                      : "报名已提交，等待企业确认"}
                </b>
                {registration.reviewNote && <p>{registration.reviewNote}</p>}
                <small>提交于 {new Date(registration.createdAt).toLocaleString("zh-CN")}</small>
              </div>
            )}
            <div className="registration-fields">
              {fields.map((field) => (
                <label key={field.id}>
                  <span>
                    {field.label}
                    {field.required && <b>必填</b>}
                  </span>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={4}
                      value={answers[field.id] || ""}
                      disabled={readOnly}
                      onChange={(e) =>
                        setAnswers((v) => ({
                          ...v,
                          [field.id]: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={answers[field.id] || ""}
                      disabled={readOnly}
                      onChange={(e) =>
                        setAnswers((v) => ({
                          ...v,
                          [field.id]: e.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="registration-privacy">
              <b>信息使用说明</b>
              <p>
                仅用于本次活动组织、联络和统计，不会在学生主页公开，也不会提供给无关企业。
              </p>
            </div>
            <div className="dialog-actions">
              <button className="outline-btn" onClick={onClose}>关闭</button>
              {registration && registration.status !== "approved" && (
                <button className="danger-text-btn" disabled={saving} onClick={onCancel}>取消报名</button>
              )}
              {!readOnly && (
                <button className="primary-btn" disabled={saving} onClick={submit}>
                  {saving ? "正在保存…" : previous ? "保存修改并重新提交" : "确认报名"}
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

type ContentComment = {
  id: string;
  author: string;
  text: string;
  reply?: string;
  repliedBy?: string;
  createdAt?: string;
  mine?: boolean;
};

function LearningCenter({
  custom,
  flash,
  initialItem,
}: {
  custom: ContentItem[];
  flash: (s: string) => void;
  initialItem?: string;
}) {
  const list = [...custom, ...contents].sort(
    (a, b) =>
      Number((b as unknown as { sortOrder?: number }).sortOrder || 0) -
      Number((a as unknown as { sortOrder?: number }).sortOrder || 0),
  );
  const [selectedId, setSelectedId] = useState(initialItem || ""),
    [category, setCategory] = useState("全部内容"),
    [liked, setLiked] = useState(false),
    [likeCount, setLikeCount] = useState(0),
    [comments, setComments] = useState<ContentComment[]>([]),
    [socialLoading, setSocialLoading] = useState(false),
    [socialSaving, setSocialSaving] = useState(false),
    [draft, setDraft] = useState("");
  const selected = list.find((content) => content.id === selectedId) || null;
  const shown = list.filter(
    (c) => category === "全部内容" || c.category === category,
  );
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelectedId("");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    api(`/api/social?contentId=${encodeURIComponent(selected.id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "互动数据加载失败");
        if (active) {
          setLiked(Boolean(data.liked));
          setLikeCount(Number(data.likeCount || 0));
          setComments(data.comments || []);
        }
      })
      .catch(() => active && flash("互动数据暂时无法加载"))
      .finally(() => active && setSocialLoading(false));
    return () => {
      active = false;
    };
  }, [selected, flash]);
  const toggleLike = async () => {
    if (!selected || socialSaving) return;
    setSocialSaving(true);
    const response = await api("/api/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "toggle-like", contentId: selected.id }),
    });
    const data = await response.json();
    setSocialSaving(false);
    if (!response.ok) return flash(data.error || "点赞失败");
    setLiked(Boolean(data.liked));
    setLikeCount(Number(data.likeCount || 0));
  };
  const addComment = async () => {
    if (!selected || !draft.trim() || socialSaving) return;
    setSocialSaving(true);
    const response = await api("/api/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "add-comment",
        contentId: selected.id,
        text: draft.trim(),
      }),
    });
    const data = await response.json();
    setSocialSaving(false);
    if (!response.ok) return flash(data.error || "评论发布失败");
    setComments((value) => [data.comment, ...value]);
    setDraft("");
    flash("评论已发布");
  };
  const removeComment = async (id: string) => {
    const response = await api(
      `/api/social?commentId=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    if (!response.ok) return flash(data.error || "评论删除失败");
    setComments((value) => value.filter((comment) => comment.id !== id));
    flash("评论已删除");
  };
  return (
    <>
      <Title eyebrow="CONTENTS" title="成长内容" desc="" />
      <div
        className="category-nav content-category-nav"
        aria-label="成长内容分类"
      >
        {contentCategories.map((item) => (
          <button
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="media-content-grid refined-content-grid">
        {shown.map((c, i) => (
          <article key={`${c.id}-${i}`}>
            <div>
              {c.coverType === "video" ? (
                <video src={c.cover} muted playsInline />
              ) : (
                <img src={c.cover} alt={c.title} />
              )}
              <span>{c.mediaType === "video" ? "视频" : "文章"}</span>
            </div>
            <small>
              {c.publisher || "JA China"} · {c.category}
            </small>
            <h2>{c.title}</h2>
            <p>{c.summary}</p>
            <footer>
              <small>{c.duration}</small>
              {c.tags?.slice(0, 2).map((tag) => (
                <i key={tag}>{tag}</i>
              ))}
            </footer>
            <button onClick={() => { setSocialLoading(true); setSelectedId(c.id); }}>打开内容 →</button>
          </article>
        ))}
      </div>
      {selected && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId("");
          }}
        >
          <section
            className="dialog reader rich-reader"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
          >
            <button className="dialog-close" aria-label="关闭内容" onClick={() => setSelectedId("")}>
              ×
            </button>
            <ContentRenderer item={selected} />
            <div className="content-social">
              <button
                className={liked ? "active" : ""}
                onClick={toggleLike}
                disabled={socialSaving}
              >
                ♥ {liked ? "已点赞" : "点赞"} · {likeCount}
              </button>
              <label>
                评论
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="写下你的问题或想法"
                />
              </label>
              <button
                className="primary-btn"
                onClick={addComment}
                disabled={socialSaving || draft.trim().length < 2}
              >
                {socialSaving ? "正在发布…" : "发布评论"}
              </button>
              {socialLoading && <p className="social-empty">正在读取评论…</p>}
              {!socialLoading && comments.length === 0 && (
                <p className="social-empty">还没有评论，欢迎提出第一个问题。</p>
              )}
              {comments.map((c) => (
                <div className="comment-item" key={c.id}>
                  <b>{c.author}</b>
                  {c.createdAt && (
                    <small>{new Date(c.createdAt).toLocaleString("zh-CN")}</small>
                  )}
                  <p>{c.text}</p>
                  {c.reply && (
                    <em><b>{c.repliedBy || "发布方"}回复：</b>{c.reply}</em>
                  )}
                  {c.mine && (
                    <span><button onClick={() => removeComment(c.id)}>删除我的评论</button></span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function StudentProfile({
  record,
  save,
  upload,
}: {
  record?: StoredRecord;
  save: (
    k: string,
    p: Record<string, unknown>,
    i?: string,
  ) => Promise<string | null>;
  upload: (
    f: File,
    p?: string,
  ) => Promise<{
    url: string | null;
    key: string;
    name: string;
    type: string;
  } | null>;
}) {
  const initial = record?.payload || {};
  const [form, setForm] = useState({
    name: String(initial.name || "张晨"),
    school: String(initial.school || "湖南大学"),
    major: String(initial.major || "工商管理"),
    grade: String(initial.grade || "2027届"),
    headline: String(initial.headline || "关注产品运营、公益实践与青年发展"),
    bio: String(
      initial.bio ||
        "擅长把复杂问题整理为清晰行动方案，期待在真实项目中学习用户理解、协作和复盘。",
    ),
    skills: String(initial.skills || "内容策划,用户研究,项目协作,数据整理"),
    awards: String(
      initial.awards || "JA 简历工作坊优秀作品；校级创新挑战赛入围",
    ),
    resumeName: String(initial.resumeName || ""),
    resumeKey: String(initial.resumeKey || ""),
    resumeType: String(initial.resumeType || ""),
    timelineItems: String(
      initial.timelineItems ||
        "2026.10.08｜学生项目｜校园可持续议题调研｜完成访谈、问卷整理与问题定义。｜形成项目报告、路演页和行动建议。",
    ),
  });
  const [editing, setEditing] = useState(false),
    [notice, setNotice] = useState(""),
    [active, setActive] = useState("tl-1"),
    [registrations, setRegistrations] = useState<RegistrationItem[]>([]),
    [draft, setDraft] = useState({
      date: "",
      type: "学生项目",
      title: "",
      action: "",
      output: "",
      evidenceUrl: "",
    });
  useEffect(() => {
    api("/api/registrations")
      .then((r) => r.json())
      .then((data) => setRegistrations(data.registrations || []))
      .catch(() => setRegistrations([]));
  }, []);
  const update = (key: string, value: string) =>
    setForm((v) => ({ ...v, [key]: value }));
  const onResume = async (file?: File) => {
    if (!file) return;
    const result = await upload(file, "resume");
    if (result) {
      const next = {
        ...form,
        resumeName: result.name,
        resumeKey: result.key,
        resumeType: result.type,
      };
      setForm(next);
      await save("student-profile", next, record?.id);
      setNotice(
        "简历已安全保存，仅你本人可查看；成长主页仍由你决定公开内容。",
      );
    }
  };
  const viewResume = async () => {
    if (!form.resumeKey) {
      setNotice(form.resumeName ? "请重新上传一次简历以启用安全查看" : "请先上传完整简历");
      return;
    }
    setNotice("正在安全读取简历…");
    const response = await api(
      `/api/files?key=${encodeURIComponent(form.resumeKey)}`,
    );
    if (!response.ok) {
      const message = await response.text();
      setNotice(message || "简历读取失败，请重新上传");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (form.resumeType.includes("pdf")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = form.resumeName || "我的简历.docx";
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    setNotice("完整简历已通过私有通道打开");
  };
  const skills = form.skills
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const certified = [
    {
      id: "tl-1",
      date: "2026.09.12",
      type: "JA认证",
      title: "未来职场开放日 · 智能制造专场",
      action: "完成企业参访、职业观察访谈和现场记录。",
      output: "输出《智能制造岗位观察卡》与 3 条岗位兴趣判断。",
    },
    {
      id: "tl-2",
      date: "2026.09.19",
      type: "JA认证",
      title: "第一份简历工作坊",
      action: "将校园经历拆解为任务、行动和结果。",
      output: "产出一版可投递简历，并获得导师反馈。",
    },
  ];
  const approved = registrations
    .filter((item) => item.status === "approved")
    .map((item, index) => ({
      id: `reg-${item.id}`,
      date: new Date(item.reviewedAt || item.createdAt)
        .toLocaleDateString("zh-CN")
        .replaceAll("/", "."),
      type: "JA认证",
      title: item.activityTitle,
      action: "通过平台报名并完成活动参与确认。",
      output:
        item.reviewNote || "活动记录已进入成长履历，等待 JA 补充认证评语。",
    }));
  const manual = form.timelineItems
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [date, type, title, action, output] = line.split("｜");
      return {
        id: `manual-${index}`,
        manualIndex: index,
        date: date || "待补充",
        type: type || "学生项目",
        title: title || "未命名成长记录",
        action: action || "补充做了什么。",
        output: output || "补充最终产出。",
      };
    });
  const timeline = [
    ...certified,
    ...approved.filter(
      (item) => !certified.some((base) => base.title === item.title),
    ),
    ...manual,
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const activeItem = timeline.find((item) => item.id === active) || timeline[0];
  const addTimelineItem = () => {
    if (!draft.title.trim()) return;
    const output = [
      draft.output.trim() || "补充项目成果或作品说明。",
      draft.evidenceUrl.trim() ? `成果链接：${draft.evidenceUrl.trim()}` : "",
    ].filter(Boolean).join(" ");
    const line = `${draft.date || new Date().toLocaleDateString("zh-CN").replaceAll("/", ".")}｜${draft.type}｜${draft.title.trim()}｜${draft.action.trim() || "补充项目过程与承担工作。"}｜${output}`;
    const next = form.timelineItems
      ? [form.timelineItems, line].join("\n")
      : line;
    update("timelineItems", next);
    setDraft({ date: "", type: "学生项目", title: "", action: "", output: "", evidenceUrl: "" });
    setActive(`manual-${manual.length}`);
  };
  const updateManualOrder = (manualIndex: number, direction: -1 | 1) => {
    const lines = form.timelineItems.split("\n").filter((line) => line.trim());
    const target = manualIndex + direction;
    if (target < 0 || target >= lines.length) return;
    [lines[manualIndex], lines[target]] = [lines[target], lines[manualIndex]];
    update("timelineItems", lines.join("\n"));
    setActive(`manual-${target}`);
  };
  const removeManualItem = (manualIndex: number) => {
    const lines = form.timelineItems.split("\n").filter((line) => line.trim());
    lines.splice(manualIndex, 1);
    update("timelineItems", lines.join("\n"));
    setActive(timeline[0]?.id || "");
  };
  return (
    <>
      <Title
        eyebrow="PROFILE"
        title="成长主页"
        desc=""
        action={
          <button
            className="primary-btn"
            onClick={async () => {
              if (editing) {
                await save("student-profile", form, record?.id);
              }
              setEditing(!editing);
            }}
          >
            {editing ? "保存主页" : "编辑主页"}
          </button>
        }
      />
      <div className="growth-profile-layout renewed timeline-only fixed-left-profile">
        <aside className="profile-left-rail">
          <section className="resume-mini-card calm-resume-card">
            <span className="big-avatar">{form.name.slice(0, 1)}</span>
            <h2>{form.name}</h2>
            <p>
              {form.school} · {form.major} · {form.grade}
            </p>
            <div className="mini-skill-tags">
              {skills.slice(0, 4).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
            <div className="resume-upload-row vertical">
              <label>
                {form.resumeName ? "替换简历" : "上传简历"}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.docx"
                  onChange={(e) => onResume(e.target.files?.[0])}
                />
              </label>
              <button
                className="outline-btn"
                onClick={viewResume}
              >
                查看完整简历
              </button>
            </div>
            {notice && <p className="profile-notice">{notice}</p>}
          </section>
        </aside>
        <main className="growth-record-board timeline-board-only profile-scroll-pane">
          <section className="full-growth-timeline enhanced-timeline">
            <div className="panel-head">
              <div>
                <small>TIMELINE</small>
                <h2>完整成长时间轴</h2>
              </div>
              <span>JA 认证高亮展示</span>
            </div>
            {timeline.map((item) => (
              <button
                key={item.id}
                className={`${active === item.id ? "active" : ""} ${item.type.includes("JA认证") ? "certified" : ""}`}
                onClick={() => setActive(item.id)}
              >
                <time>{item.date}</time>
                <span>
                  <em>{item.type}</em>
                  <b>{item.title}</b>
                  <p>{item.action}</p>
                  <strong>{item.output}</strong>
                </span>
              </button>
            ))}
            {activeItem && (
              <article className={`timeline-detail-card ${activeItem.type.includes("JA认证") ? "certified" : ""}`}>
                <div>
                  <small>{activeItem.type.includes("JA认证") ? "JA VERIFIED EXPERIENCE" : "PERSONAL EXPERIENCE"}</small>
                  <h3>{activeItem.title}</h3>
                  <p>{activeItem.action}</p>
                  <strong>{activeItem.output}</strong>
                </div>
                {"manualIndex" in activeItem && editing && (
                  <div className="timeline-item-actions">
                    <button onClick={() => updateManualOrder(Number(activeItem.manualIndex), -1)}>上移</button>
                    <button onClick={() => updateManualOrder(Number(activeItem.manualIndex), 1)}>下移</button>
                    <button className="danger" onClick={() => removeManualItem(Number(activeItem.manualIndex))}>删除经历</button>
                  </div>
                )}
              </article>
            )}
          </section>
          <section className="manual-timeline-entry">
            <div>
              <small>ADD TO TIMELINE</small>
              <h2>手动添加成长经历</h2>
            </div>
            <div className="manual-entry-grid">
              <label>
                日期
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, date: e.target.value }))
                  }
                  disabled={!editing}
                />
              </label>
              <label>
                经历类型
                <select
                  value={draft.type}
                  onChange={(e) => setDraft((v) => ({ ...v, type: e.target.value }))}
                  disabled={!editing}
                >
                  <option>学生项目</option>
                  <option>实习实践</option>
                  <option>竞赛经历</option>
                  <option>志愿公益</option>
                  <option>校园活动</option>
                </select>
              </label>
              <label>
                标题
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, title: e.target.value }))
                  }
                  disabled={!editing}
                  placeholder="例如：校园可持续项目"
                />
              </label>
              <label className="full">
                做了什么
                <textarea
                  rows={2}
                  value={draft.action}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, action: e.target.value }))
                  }
                  disabled={!editing}
                />
              </label>
              <label className="full">
                产出是什么
                <textarea
                  rows={2}
                  value={draft.output}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, output: e.target.value }))
                  }
                  disabled={!editing}
                />
              </label>
              <label className="full">
                成果链接（选填）
                <input
                  type="url"
                  value={draft.evidenceUrl}
                  onChange={(e) => setDraft((v) => ({ ...v, evidenceUrl: e.target.value }))}
                  disabled={!editing}
                  placeholder="https:// 作品、报告或演示链接"
                />
              </label>
              <button
                className="primary-btn"
                disabled={!editing || !draft.title.trim()}
                onClick={addTimelineItem}
              >
                添加到时间轴
              </button>
            </div>
          </section>
          <section
            className={`profile-form profile-form-wide polished-profile-form ${editing ? "" : "disabled"}`}
          >
            <h2>编辑资料</h2>
            <label>
              姓名
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                disabled={!editing}
              />
            </label>
            <label>
              学校
              <input
                value={form.school}
                onChange={(e) => update("school", e.target.value)}
                disabled={!editing}
              />
            </label>
            <label>
              专业
              <input
                value={form.major}
                onChange={(e) => update("major", e.target.value)}
                disabled={!editing}
              />
            </label>
            <label>
              年级
              <input
                value={form.grade}
                onChange={(e) => update("grade", e.target.value)}
                disabled={!editing}
              />
            </label>
            <label>
              一句话介绍
              <input
                value={form.headline}
                onChange={(e) => update("headline", e.target.value)}
                disabled={!editing}
              />
            </label>
            <label>
              能力标签（逗号分隔）
              <input
                value={form.skills}
                onChange={(e) => update("skills", e.target.value)}
                disabled={!editing}
              />
            </label>
            <label className="full">
              自我介绍
              <textarea
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                disabled={!editing}
                rows={4}
              />
            </label>
            <label className="full">
              奖项
              <textarea
                value={form.awards}
                onChange={(e) => update("awards", e.target.value)}
                disabled={!editing}
                rows={2}
              />
            </label>
          </section>
        </main>
      </div>
    </>
  );
}

function EnterpriseSpace({
  tab,
  setTab,
  records,
  save,
  remove,
  upload,
  flash,
}: {
  tab: string;
  setTab: (s: string) => void;
  records: StoredRecord[];
  save: (
    k: string,
    p: Record<string, unknown>,
    i?: string,
  ) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
  upload: (
    f: File,
    p?: string,
  ) => Promise<{
    url: string | null;
    key: string;
    name: string;
    type: string;
  } | null>;
  flash: (s: string) => void;
}) {
  const positions = records.filter((r) => r.kind === "job");
  if (tab === "overview")
    return <EnterpriseOverview records={records} setTab={setTab} />;
  if (tab === "positions")
    return (
      <EnterprisePublisher
        kind="job"
        title="实习项目机会"
        desc="创建、编辑和管理企业面向学生公开的实习与项目机会。"
        records={positions}
        save={save}
        remove={remove}
        upload={upload}
        flash={flash}
      />
    );
  if (tab === "activities")
    return (
      <EnterprisePublisher
        kind="activity"
        title="成长活动"
        desc="配置活动详情，明确报名所需字段和成长认证信息，提交后由 JA 审核。"
        records={records.filter((r) => r.kind === "activity")}
        save={save}
        remove={remove}
        upload={upload}
        flash={flash}
      />
    );
  if (tab === "content")
    return (
      <EnterprisePublisher
        kind="content"
        title="成长内容"
        desc="使用模块化编辑器发布文章或视频，提交后由 JA 审核。"
        records={records.filter((r) => r.kind === "content")}
        save={save}
        remove={remove}
        upload={upload}
        flash={flash}
      />
    );
  if (tab === "feedback") return <PublisherFeedbackDesk flash={flash} />;
  if (tab === "registrations") return <EnterpriseRegistrations />;
  return (
    <EnterpriseProfile
      record={records.find((r) => r.kind === "enterprise-profile")}
      save={save}
      upload={upload}
    />
  );
}

type ManagedComment = {
  id: string;
  contentId: string;
  contentTitle: string;
  authorName: string;
  body: string;
  replyBody?: string;
  repliedBy?: string;
  repliedAt?: string | null;
  createdAt: string;
};

function PublisherFeedbackDesk({ flash }: { flash: (message: string) => void }) {
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
      const response = await api("/api/social?scope=publisher");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "评论读取失败");
      setComments(data.comments || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "评论读取失败");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    api("/api/social?scope=publisher")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "评论读取失败");
        if (active) setComments(data.comments || []);
      })
      .catch((loadError) => {
        if (active)
          setError(loadError instanceof Error ? loadError.message : "评论读取失败");
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
    if (action === "reply" && reply.trim().length < 2)
      return flash("请填写至少 2 个字的回复");
    if (action === "delete" && !window.confirm("确定删除这条评论吗？删除后学生端将不再显示。"))
      return;
    setSaving(true);
    const response = await api("/api/social", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        commentId: selected.id,
        action,
        reply: reply.trim(),
        scope: "publisher",
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return flash(data.error || "处理失败");
    flash(action === "reply" ? "回复已同步到学生端" : "评论已删除");
    setSelected(null);
    setReply("");
    await load();
  };
  return (
    <>
      <Title eyebrow="CONTENT FEEDBACK" title="互动管理" desc="" />
      <section className="feedback-summary">
        <div><small>待回复</small><b>{comments.filter((comment) => !comment.replyBody).length}</b></div>
        <div><small>已回复</small><b>{comments.filter((comment) => comment.replyBody).length}</b></div>
        <div><small>全部评论</small><b>{comments.length}</b></div>
      </section>
      <section className="feedback-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索内容、学生或评论" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="pending">待回复</option>
          <option value="replied">已回复</option>
          <option value="all">全部评论</option>
        </select>
        <button onClick={load}>刷新</button>
      </section>
      {loading ? (
        <div className="admin-empty">正在读取互动数据…</div>
      ) : error ? (
        <div className="admin-empty"><b>读取失败</b><p>{error}</p><button onClick={load}>重试</button></div>
      ) : shown.length === 0 ? (
        <div className="admin-empty"><b>当前没有需要处理的评论</b><p>学生在企业发布的成长内容下留言后，会出现在这里。</p></div>
      ) : (
        <div className="feedback-list">
          {shown.map((comment) => (
            <button key={comment.id} onClick={() => { setSelected(comment); setReply(comment.replyBody || ""); }}>
              <span><b>{comment.contentTitle}</b><small>{new Date(comment.createdAt).toLocaleString("zh-CN")}</small></span>
              <p><strong>{comment.authorName}</strong>{comment.body}</p>
              <em>{comment.replyBody ? "已回复" : "待回复"}</em>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className="dialog feedback-dialog" role="dialog" aria-modal="true" aria-label="评论处理">
            <button className="dialog-close" aria-label="关闭评论处理" onClick={() => setSelected(null)}>×</button>
            <small>COMMENT MANAGEMENT</small>
            <h1>{selected.contentTitle}</h1>
            <article><b>{selected.authorName}</b><p>{selected.body}</p><small>{new Date(selected.createdAt).toLocaleString("zh-CN")}</small></article>
            <label>发布方回复<textarea rows={5} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="回应问题、补充说明或给出下一步指引" /></label>
            <div className="dialog-actions">
              <button className="danger-text-btn" disabled={saving} onClick={() => act("delete")}>删除评论</button>
              <button className="primary-btn" disabled={saving || reply.trim().length < 2} onClick={() => act("reply")}>{saving ? "正在处理…" : "发布回复"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function EnterpriseOverview({
  records,
  setTab,
}: {
  records: StoredRecord[];
  setTab: (tab: string) => void;
}) {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]),
    [registrationReady, setRegistrationReady] = useState(false);
  useEffect(() => {
    api("/api/registrations?scope=publisher")
      .then((response) => response.json())
      .then((data) => setRegistrations(data.registrations || []))
      .catch(() => setRegistrations([]))
      .finally(() => setRegistrationReady(true));
  }, []);

  const publicRecords = records.filter((record) =>
      ["job", "activity", "content"].includes(record.kind),
    ),
    pending = publicRecords.filter(
      (record) =>
        String(record.payload.reviewStatus || "pending") === "pending",
    ),
    approved = publicRecords.filter(
      (record) => record.payload.reviewStatus === "approved",
    ),
    rejected = publicRecords.filter(
      (record) => record.payload.reviewStatus === "rejected",
    ),
    pendingRegistrations = registrations.filter((item) =>
      ["pending", "registered"].includes(item.status),
    ),
    profile = records.find((record) => record.kind === "enterprise-profile"),
    profileFields = ["name", "industry", "city", "intro", "website", "logo"],
    completedProfileFields = profileFields.filter((field) =>
      String(profile?.payload[field] || "").trim(),
    ).length,
    profileCompleteness = Math.round(
      (completedProfileFields / profileFields.length) * 100,
    ),
    latest = [...publicRecords]
      .sort((a, b) =>
        String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
      )
      .slice(0, 5),
    totalTasks =
      pendingRegistrations.length +
      rejected.length +
      (profileCompleteness < 100 ? 1 : 0);

  const kindName = (kind: string) =>
    kind === "job" ? "机会" : kind === "activity" ? "活动" : "内容";
  const statusMeta = (status: unknown) => {
    if (status === "approved")
      return { label: "已公开", className: "approved" };
    if (status === "rejected")
      return { label: "需修改", className: "rejected" };
    return { label: "审核中", className: "pending" };
  };
  const openRecord = (record: StoredRecord) =>
    setTab(
      record.kind === "job"
        ? "positions"
        : record.kind === "activity"
          ? "activities"
          : "content",
    );

  return (
    <>
      <Title
        eyebrow="ENTERPRISE WORKBENCH"
        title="工作台"
        desc="集中查看发布进度、报名待办与企业资料状态。"
        action={
          <div className="workbench-primary-actions">
            <button
              className="outline-btn"
              onClick={() => setTab("registrations")}
            >
              查看报名
            </button>
            <button className="primary-btn" onClick={() => setTab("positions")}>
              ＋ 发布机会
            </button>
          </div>
        }
      />

      <section className="workbench-welcome">
        <div>
          <span className="workbench-kicker">今日工作概览</span>
          <h2>
            {totalTasks
              ? `有 ${totalTasks} 项工作需要处理`
              : "当前工作均已处理"}
          </h2>
          <p>
            {pendingRegistrations.length
              ? `${pendingRegistrations.length} 份活动报名等待审核，请优先处理。`
              : "暂无待审核报名，可继续发布新的机会、活动或成长内容。"}
          </p>
        </div>
        <div className="workbench-welcome-art" aria-hidden="true">
          <span>JA</span>
          <i />
          <b>STAR PLAN</b>
        </div>
      </section>

      <section className="workbench-metrics" aria-label="企业运营概览">
        <button onClick={() => setTab("positions")}>
          <span>已提交内容</span>
          <b>{publicRecords.length}</b>
          <small>机会、活动与内容</small>
          <i>查看发布管理 →</i>
        </button>
        <button onClick={() => setTab("registrations")}>
          <span>待审核报名</span>
          <b>{registrationReady ? pendingRegistrations.length : "—"}</b>
          <small>需要企业确认结果</small>
          <i>进入报名审核 →</i>
        </button>
        <button onClick={() => setTab("activities")}>
          <span>审核中</span>
          <b>{pending.length}</b>
          <small>等待平台审核</small>
          <i>查看审核进度 →</i>
        </button>
        <button onClick={() => setTab("profile")}>
          <span>资料完整度</span>
          <b>{profileCompleteness}%</b>
          <small>
            {profileCompleteness === 100
              ? "企业资料已完善"
              : "完善后提升品牌展示"}
          </small>
          <i>维护企业资料 →</i>
        </button>
      </section>

      <div className="workbench-main-grid">
        <section className="workbench-card task-center">
          <div className="workbench-card-head">
            <div>
              <small>ACTION CENTER</small>
              <h2>待办事项</h2>
            </div>
            <span>{totalTasks} 项</span>
          </div>
          <div className="task-list">
            {pendingRegistrations.length > 0 && (
              <button onClick={() => setTab("registrations")}>
                <i className="task-icon urgent">审</i>
                <span>
                  <b>审核学生报名</b>
                  <small>{pendingRegistrations.length} 份报名等待确认</small>
                </span>
                <em>立即处理 →</em>
              </button>
            )}
            {rejected.length > 0 && (
              <button onClick={() => openRecord(rejected[0])}>
                <i className="task-icon warning">改</i>
                <span>
                  <b>修改退回内容</b>
                  <small>
                    {rejected.length} 条发布内容需要根据审核意见调整
                  </small>
                </span>
                <em>查看意见 →</em>
              </button>
            )}
            {profileCompleteness < 100 && (
              <button onClick={() => setTab("profile")}>
                <i className="task-icon profile">企</i>
                <span>
                  <b>完善企业资料</b>
                  <small>
                    当前完成 {profileCompleteness}%，补充品牌信息与企业介绍
                  </small>
                </span>
                <em>继续完善 →</em>
              </button>
            )}
            {totalTasks === 0 && (
              <div className="task-empty">
                <b>✓</b>
                <span>暂无待办事项</span>
                <small>新的报名或审核反馈会出现在这里。</small>
              </div>
            )}
          </div>
        </section>

        <section className="workbench-card publish-overview">
          <div className="workbench-card-head">
            <div>
              <small>PUBLISHING STATUS</small>
              <h2>发布状态</h2>
            </div>
            <button onClick={() => setTab("content")}>发布内容</button>
          </div>
          <div className="status-summary">
            <article>
              <span className="status-dot approved" />
              <b>{approved.length}</b>
              <small>已公开</small>
            </article>
            <article>
              <span className="status-dot pending" />
              <b>{pending.length}</b>
              <small>审核中</small>
            </article>
            <article>
              <span className="status-dot rejected" />
              <b>{rejected.length}</b>
              <small>需修改</small>
            </article>
          </div>
          <div
            className="status-progress"
            aria-label={`已公开 ${approved.length} 条，共 ${publicRecords.length} 条`}
          >
            <span
              style={{
                width: `${publicRecords.length ? Math.round((approved.length / publicRecords.length) * 100) : 0}%`,
              }}
            />
          </div>
          <p>审核通过的内容会自动进入学生端对应栏目。</p>
        </section>
      </div>

      <section className="workbench-card recent-publishing">
        <div className="workbench-card-head">
          <div>
            <small>RECENT UPDATES</small>
            <h2>最近发布</h2>
          </div>
          <button onClick={() => setTab("positions")}>查看全部</button>
        </div>
        {latest.length ? (
          <div className="recent-publishing-table">
            <div className="recent-publishing-row head" aria-hidden="true">
              <span>名称</span>
              <span>类型</span>
              <span>更新时间</span>
              <span>状态</span>
              <span />
            </div>
            {latest.map((record) => {
              const status = statusMeta(record.payload.reviewStatus);
              return (
                <button
                  className="recent-publishing-row"
                  key={record.id}
                  onClick={() => openRecord(record)}
                >
                  <strong>
                    {String(record.payload.title || "未命名内容")}
                  </strong>
                  <span>{kindName(record.kind)}</span>
                  <span>
                    {record.updatedAt
                      ? new Date(record.updatedAt).toLocaleDateString("zh-CN")
                      : "刚刚"}
                  </span>
                  <span className={`workbench-status ${status.className}`}>
                    {status.label}
                  </span>
                  <em>查看 →</em>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="workbench-empty">
            <b>开始建立企业在星光计划中的内容资产</b>
            <p>发布第一条实习机会、成长活动或专业内容。</p>
            <button className="primary-btn" onClick={() => setTab("positions")}>
              发布第一条机会
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function EnterpriseContribution({ records }: { records: StoredRecord[] }) {
  const jobs = records.filter((r) => r.kind === "job").length,
    activitiesCount = records.filter((r) => r.kind === "activity").length,
    contentsCount = records.filter((r) => r.kind === "content").length,
    approved = records.filter(
      (r) => r.payload.reviewStatus === "approved",
    ).length;
  return (
    <section className="enterprise-contribution panel">
      <div className="panel-head">
        <div>
          <small>COMPANY CREDIT</small>
          <h2>企业贡献画像</h2>
        </div>
        <span className="verified">客观数据生成</span>
      </div>
      <div className="contribution-grid">
        <article>
          <b>{jobs}</b>
          <span>实习 / 项目机会</span>
        </article>
        <article>
          <b>{activitiesCount}</b>
          <span>成长活动</span>
        </article>
        <article>
          <b>{contentsCount}</b>
          <span>内容分享</span>
        </article>
        <article>
          <b>{approved}</b>
          <span>已通过公开</span>
        </article>
      </div>
      <div className="responsibility-line">
        <span style={{ width: `${Math.min(92, 46 + approved * 12)}%` }} />
        <b>社会责任展示</b>
        <p>后续可接入活动反馈、志愿参与度和录用后回传，形成企业商誉展示。</p>
      </div>
    </section>
  );
}

function EnterpriseRegistrations() {
  const [items, setItems] = useState<RegistrationItem[]>([]),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<RegistrationItem | null>(null),
    [notice, setNotice] = useState(""),
    [loadError, setLoadError] = useState(""),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState("all"),
    [activityFilter, setActivityFilter] = useState("all"),
    [sortOrder, setSortOrder] = useState("newest"),
    [selectedIds, setSelectedIds] = useState<string[]>([]),
    [bulkNote, setBulkNote] = useState(""),
    [bulkSaving, setBulkSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await api("/api/registrations?scope=publisher");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取失败");
      setItems(data.registrations || []);
      setSelectedIds([]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "报名数据读取失败");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    api("/api/registrations?scope=publisher")
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setItems(data.registrations || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError("报名数据读取失败，请刷新重试");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const review = async (
    ids: string[],
    decision: "approved" | "rejected",
    note: string,
  ) => {
    const response = await api("/api/registrations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registrationIds: ids, decision, note }),
    });
    const data = await response.json();
    if (!response.ok) {
      setNotice(data.error || "审核失败");
      return false;
    }
    setNotice(
      decision === "approved"
        ? `已通过 ${ids.length} 份报名`
        : `已退回 ${ids.length} 份报名`,
    );
    setItems((current) =>
      current.map((item) =>
        ids.includes(item.id)
          ? {
              ...item,
              status: decision,
              reviewNote:
                note.trim() ||
                (decision === "approved" ? "企业确认报名通过" : ""),
              reviewedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setSelected(null);
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    return true;
  };
  const decide = async (
    item: RegistrationItem,
    decision: "approved" | "rejected",
    note: string,
  ) => {
    await review([item.id], decision, note);
  };
  const pending = items.filter(
      (item) => item.status === "pending" || item.status === "registered",
    ).length,
    approved = items.filter((item) => item.status === "approved").length,
    rejected = items.filter((item) => item.status === "rejected").length,
    activityCount = new Set(items.map((item) => item.activityTitle)).size,
    approvalRate = items.length
      ? Math.round((approved / items.length) * 100)
      : 0,
    latest = items.slice(0, 3),
    activityStats = Object.entries(
      items.reduce(
        (acc, item) => {
          acc[item.activityTitle] = (acc[item.activityTitle] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).sort((a, b) => b[1] - a[1]),
    activityNames = activityStats.map(([title]) => title);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter(
        (item) =>
          statusFilter === "all" ||
          (statusFilter === "pending"
            ? item.status === "pending" || item.status === "registered"
            : item.status === statusFilter),
      )
      .filter(
        (item) =>
          activityFilter === "all" || item.activityTitle === activityFilter,
      )
      .filter((item) =>
        `${item.answers.name || ""} ${item.answers.school || ""} ${item.answers.phone || ""} ${item.answers.email || ""}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .sort((a, b) =>
        sortOrder === "oldest"
          ? String(a.createdAt).localeCompare(String(b.createdAt))
          : String(b.createdAt).localeCompare(String(a.createdAt)),
      );
  }, [activityFilter, items, query, sortOrder, statusFilter]);
  const selectableIds = filteredItems
    .filter((item) => item.status === "pending" || item.status === "registered")
    .map((item) => item.id);
  const allSelectableChecked =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));
  const toggleAll = () =>
    setSelectedIds((current) =>
      allSelectableChecked
        ? current.filter((id) => !selectableIds.includes(id))
        : [...new Set([...current, ...selectableIds])],
    );
  const batchReview = async (decision: "approved" | "rejected") => {
    if (!selectedIds.length) return;
    if (decision === "rejected" && !bulkNote.trim()) {
      setNotice("批量退回时请填写统一原因");
      return;
    }
    setBulkSaving(true);
    const ok = await review(selectedIds, decision, bulkNote);
    if (ok) setBulkNote("");
    setBulkSaving(false);
  };
  const exportCsv = () => {
    if (!filteredItems.length) {
      setNotice("当前没有可导出的报名数据");
      return;
    }
    const headers = [
      "活动",
      "姓名",
      "联系电话",
      "邮箱",
      "学校/专业",
      "报名状态",
      "审核意见",
      "提交时间",
      "完整报名信息",
    ];
    const csvEscape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = filteredItems.map((item) =>
      [
        item.activityTitle,
        item.answers.name || "",
        item.answers.phone || "",
        item.answers.email || "",
        item.answers.school || "",
        item.status === "approved"
          ? "已通过"
          : item.status === "rejected"
            ? "已退回"
            : "待确认",
        item.reviewNote || "",
        new Date(item.createdAt).toLocaleString("zh-CN"),
        Object.entries(item.answers)
          .map(([key, value]) => `${registrationLabel(key)}：${value}`)
          .join("；"),
      ]
        .map(csvEscape)
        .join(","),
    );
    const blob = new Blob(
      [`\uFEFF${[headers.join(","), ...rows].join("\n")}`],
      {
        type: "text/csv;charset=utf-8",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `JA星光计划_活动报名数据_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`已导出当前筛选结果，共 ${filteredItems.length} 条报名`);
  };
  return (
    <>
      <Title
        eyebrow="REGISTRATION DATA"
        title="活动报名审核"
        desc="查看当前企业活动的学生报名，完成筛选、审核、结果记录与数据导出。"
        action={
          <div className="registration-toolbar">
            <button className="outline-btn" onClick={load}>
              刷新数据
            </button>
            <button className="primary-btn" onClick={exportCsv}>
              导出筛选结果
            </button>
          </div>
        }
      />
      <section className="registration-filterbar" aria-label="报名筛选条件">
        <label className="registration-search">
          <span>搜索学生</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="姓名、学校、电话或邮箱"
          />
        </label>
        <label>
          <span>活动</span>
          <select
            value={activityFilter}
            onChange={(event) => setActivityFilter(event.target.value)}
          >
            <option value="all">全部活动</option>
            {activityNames.map((name) => (
              <option value={name} key={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>状态</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="pending">待确认</option>
            <option value="approved">已通过</option>
            <option value="rejected">已退回</option>
          </select>
        </label>
        <label>
          <span>排序</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          >
            <option value="newest">最新报名优先</option>
            <option value="oldest">最早报名优先</option>
          </select>
        </label>
        <b>当前显示 {filteredItems.length} 条</b>
      </section>
      <section className="registration-analytics">
        <div className="registration-summary visual-summary">
          <span>
            <small>总报名</small>
            <b>{items.length}</b>
          </span>
          <span>
            <small>待确认</small>
            <b>{pending}</b>
          </span>
          <span>
            <small>已通过</small>
            <b>{approved}</b>
          </span>
          <span>
            <small>已退回</small>
            <b>{rejected}</b>
          </span>
          <span>
            <small>通过率</small>
            <b>{approvalRate}%</b>
          </span>
          <span>
            <small>活动数</small>
            <b>{activityCount}</b>
          </span>
        </div>
        <div className="registration-visual-grid">
          <article className="registration-chart-card">
            <div>
              <small>报名可视化</small>
              <h2>报名来源分布</h2>
            </div>
            {activityStats.length ? (
              activityStats.slice(0, 5).map(([title, count]) => (
                <p key={title}>
                  <span>{title}</span>
                  <i>
                    <em
                      style={{
                        width: `${Math.max(12, (count / Math.max(1, items.length)) * 100)}%`,
                      }}
                    />
                  </i>
                  <b>{count}</b>
                </p>
              ))
            ) : (
              <p className="empty-line">等待学生提交报名后生成分布图</p>
            )}
          </article>
          <article className="registration-latest-card">
            <div>
              <small>LATEST</small>
              <h2>最新报名</h2>
            </div>
            {latest.length ? (
              latest.map((item) => (
                <button key={item.id} onClick={() => setSelected(item)}>
                  <b>{item.answers.name || "未填写姓名"}</b>
                  <span>{item.activityTitle}</span>
                  <em>
                    {item.status === "approved"
                      ? "已通过"
                      : item.status === "rejected"
                        ? "已退回"
                        : "待确认"}
                  </em>
                </button>
              ))
            ) : (
              <p className="empty-line">暂无最新报名</p>
            )}
          </article>
        </div>
      </section>
      {notice && <p className="admin-notice">{notice}</p>}
      {loadError && (
        <div className="registration-load-error" role="alert">
          <span>{loadError}</span>
          <button onClick={load}>重新加载</button>
        </div>
      )}
      {selectedIds.length > 0 && (
        <section className="registration-bulkbar">
          <div>
            <b>已选择 {selectedIds.length} 份待审核报名</b>
            <button onClick={() => setSelectedIds([])}>取消选择</button>
          </div>
          <label>
            <span>统一审核意见</span>
            <input
              value={bulkNote}
              onChange={(event) => setBulkNote(event.target.value)}
              placeholder="通过时选填，退回时必填"
            />
          </label>
          <button
            className="bulk-reject"
            disabled={bulkSaving}
            onClick={() => batchReview("rejected")}
          >
            批量退回
          </button>
          <button
            className="bulk-approve"
            disabled={bulkSaving}
            onClick={() => batchReview("approved")}
          >
            批量通过
          </button>
        </section>
      )}
      {loading ? (
        <div className="admin-empty">正在读取报名数据…</div>
      ) : items.length === 0 ? (
        <div className="empty-publisher">
          <b>☷</b>
          <h2>还没有学生报名</h2>
          <p>
            学生完成任一活动报名表后，会出现在这里供活动发布方审核。
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="publisher-no-results">
          <b>没有符合当前筛选条件的报名</b>
          <p>可清除关键词，或切换活动和审核状态。</p>
          <button
            onClick={() => {
              setQuery("");
              setActivityFilter("all");
              setStatusFilter("all");
            }}
          >
            清除筛选
          </button>
        </div>
      ) : (
        <div className="registration-table enterprise-registration-table">
          <div className="registration-row head">
            <label aria-label="选择当前页面全部待审核报名">
              <input
                type="checkbox"
                checked={allSelectableChecked}
                onChange={toggleAll}
              />
            </label>
            <b>活动</b>
            <b>学生</b>
            <b>学校 / 联系方式</b>
            <b>提交时间</b>
            <b>报名状态</b>
            <b>审核</b>
          </div>
          {filteredItems.map((item) => (
            <div className="registration-row" key={item.id}>
              <label
                aria-label={`选择 ${item.answers.name || "该学生"} 的报名`}
              >
                {(item.status === "pending" ||
                  item.status === "registered") && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() =>
                      setSelectedIds((current) =>
                        current.includes(item.id)
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id],
                      )
                    }
                  />
                )}
              </label>
              <strong>{item.activityTitle}</strong>
              <span className="registration-student-name">
                <b>{item.answers.name || "未填写姓名"}</b>
                <small>{item.answers.email || "未填写邮箱"}</small>
              </span>
              <span className="registration-contact">
                <b>{item.answers.school || "未填写学校"}</b>
                <small>{item.answers.phone || "未填写电话"}</small>
              </span>
              <span className="registration-created-at">
                {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                <small>
                  {new Date(item.createdAt).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </span>
              <span className={`registration-state ${item.status}`}>
                {item.status === "approved"
                  ? "已通过"
                  : item.status === "rejected"
                    ? "已退回"
                    : "待确认"}
              </span>
              <button onClick={() => setSelected(item)}>
                {item.status === "pending" || item.status === "registered"
                  ? "查看并审核"
                  : "查看结果"}
              </button>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <RegistrationDetail
          item={selected}
          onClose={() => setSelected(null)}
          onDecision={(decision, note) => decide(selected, decision, note)}
        />
      )}
    </>
  );
}

function RegistrationDetail({
  item,
  onClose,
  onDecision,
}: {
  item: RegistrationItem;
  onClose: () => void;
  onDecision?: (
    decision: "approved" | "rejected",
    note: string,
  ) => Promise<void>;
}) {
  useDialogEscape(onClose);
  const [note, setNote] = useState(item.reviewNote || ""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const decide = async (decision: "approved" | "rejected") => {
    if (decision === "rejected" && !note.trim()) {
      setError("退回时请填写原因");
      return;
    }
    setSaving(true);
    await onDecision?.(decision, note);
    setSaving(false);
  };
  const pending = item.status === "pending" || item.status === "registered";
  return (
    <div className="dialog-backdrop">
      <section className="dialog registration-detail">
        <button className="dialog-close" aria-label="关闭报名详情" onClick={onClose}>
          ×
        </button>
        <header className="registration-detail-header">
          <span>{String(item.answers.name || "学生").slice(0, 1)}</span>
          <div>
            <small>REGISTRATION REVIEW</small>
            <h1>{item.answers.name || "未填写姓名"}</h1>
            <p>{item.activityTitle}</p>
          </div>
          <b className={`registration-state ${item.status}`}>
            {pending
              ? "待确认"
              : item.status === "approved"
                ? "已通过"
                : "已退回"}
          </b>
        </header>
        <section className="registration-detail-meta">
          <p>
            <small>提交时间</small>
            <b>{new Date(item.createdAt).toLocaleString("zh-CN")}</b>
          </p>
          <p>
            <small>学校与专业</small>
            <b>{item.answers.school || "未填写"}</b>
          </p>
          <p>
            <small>联系方式</small>
            <b>{item.answers.phone || item.answers.email || "未填写"}</b>
          </p>
        </section>
        <div className="registration-answer-grid">
          {Object.entries(item.answers).map(([key, value]) => (
            <p key={key}>
              <b>{registrationLabel(key)}</b>
              <span>{value || "未填写"}</span>
            </p>
          ))}
        </div>
        {pending && onDecision ? (
          <section className="registration-decision-panel">
            <label className="registration-review-note">
              <span>企业审核意见</span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setError("");
                }}
                placeholder="通过时可填写提醒；退回时必须说明原因"
              />
            </label>
            <div className="review-note-templates">
              <span>快捷填写：</span>
              <button
                onClick={() => setNote("报名信息完整，请留意后续活动通知。")}
              >
                信息完整
              </button>
              <button
                onClick={() =>
                  setNote("请补充学校、专业和年级信息后重新提交。")
                }
              >
                补充学业信息
              </button>
              <button
                onClick={() =>
                  setNote("请检查联系电话或邮箱，确保活动团队可以联系到你。")
                }
              >
                检查联系方式
              </button>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="registration-review-actions">
              <button disabled={saving} onClick={() => decide("rejected")}>
                退回修改
              </button>
              <button
                disabled={saving}
                className="approve"
                onClick={() => decide("approved")}
              >
                确认通过
              </button>
            </div>
          </section>
        ) : (
          <p className={`registration-result ${item.status}`}>
            <b>{item.status === "approved" ? "报名已通过" : "报名已退回"}</b>
            {item.reviewNote && <span>{item.reviewNote}</span>}
            {item.reviewedAt && (
              <small>
                审核时间：{new Date(item.reviewedAt).toLocaleString("zh-CN")}
              </small>
            )}
          </p>
        )}
      </section>
    </div>
  );
}
function registrationLabel(key: string) {
  return (
    (
      {
        name: "姓名",
        phone: "联系电话",
        email: "常用邮箱",
        school: "学校与专业",
        expectation: "活动期待",
        experience: "相关经历",
      } as Record<string, string>
    )[key] || key
  );
}

function EnterprisePublisher({
  kind,
  title,
  desc,
  records,
  save,
  remove,
  upload,
}: {
  kind: "job" | "activity" | "content";
  title: string;
  desc: string;
  records: StoredRecord[];
  save: (
    k: string,
    p: Record<string, unknown>,
    i?: string,
  ) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
  upload: (
    f: File,
    p?: string,
  ) => Promise<{
    url: string | null;
    key: string;
    name: string;
    type: string;
  } | null>;
  flash: (s: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [edit, setEdit] = useState<StoredRecord | undefined>(),
    [status, setStatus] = useState("全部状态"),
    [query, setQuery] = useState("");
  const start = (r?: StoredRecord) => {
    setEdit(r);
    setOpen(true);
  };
  const statusCounts = {
    all: records.length,
    draft: records.filter((r) => r.payload.reviewStatus === "draft").length,
    pending: records.filter(
      (r) => String(r.payload.reviewStatus || "pending") === "pending",
    ).length,
    approved: records.filter((r) => r.payload.reviewStatus === "approved")
      .length,
    rejected: records.filter((r) => r.payload.reviewStatus === "rejected")
      .length,
  };
  const sorted = records
    .filter(
      (r) =>
        status === "全部状态" ||
        String(r.payload.reviewStatus || "pending") === status,
    )
    .filter((r) =>
      `${String(r.payload.title || "")} ${String(r.payload.summary || "")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.payload.sortOrder || 0) - Number(a.payload.sortOrder || 0) ||
        String(b.updatedAt).localeCompare(String(a.updatedAt)),
    );
  const safeRemove = async (record: StoredRecord) => {
    if (
      !window.confirm(
        `确认删除“${String(record.payload.title || "未命名内容")}”？删除后无法恢复。`,
      )
    )
      return;
    await remove(record.id);
  };
  const objectName =
    kind === "job" ? "机会" : kind === "activity" ? "活动" : "内容";
  return (
    <>
      <Title
        eyebrow="PUBLISHING CENTER"
        title={title}
        desc={desc}
        action={
          <button className="primary-btn" onClick={() => start()}>
            ＋ 新建{objectName}
          </button>
        }
      />
      <section className="publisher-summary" aria-label="发布内容统计">
        <button
          className={status === "全部状态" ? "active" : ""}
          onClick={() => setStatus("全部状态")}
        >
          <span>全部</span>
          <b>{statusCounts.all}</b>
        </button>
        <button
          className={status === "draft" ? "active" : ""}
          onClick={() => setStatus("draft")}
        >
          <span>草稿</span>
          <b>{statusCounts.draft}</b>
        </button>
        <button
          className={status === "pending" ? "active" : ""}
          onClick={() => setStatus("pending")}
        >
          <span>审核中</span>
          <b>{statusCounts.pending}</b>
        </button>
        <button
          className={status === "approved" ? "active" : ""}
          onClick={() => setStatus("approved")}
        >
          <span>已公开</span>
          <b>{statusCounts.approved}</b>
        </button>
        <button
          className={status === "rejected" ? "active" : ""}
          onClick={() => setStatus("rejected")}
        >
          <span>需修改</span>
          <b>{statusCounts.rejected}</b>
        </button>
      </section>
      <div className="publisher-controlbar">
        <label>
          <span>搜索{objectName}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`输入${objectName}名称或摘要`}
          />
        </label>
        <p>
          {kind === "job"
            ? "机会完成校验后直接公开，学生通过企业邮箱投递简历。"
            : "提交后进入 JA 审核，审核意见和公开状态会实时同步。"}
        </p>
      </div>
      {records.length === 0 ? (
        <div className="empty-publisher">
          <b>{kind === "job" ? "▣" : kind === "activity" ? "◇" : "▱"}</b>
          <h2>还没有创建{objectName}</h2>
          <p>
            {kind === "job"
              ? "创建后可直接进入学生端，发布前会检查岗位信息和投递邮箱。"
              : "可以先保存草稿，确认无误后再提交 JA 审核。"}
          </p>
          <button onClick={() => start()}>开始创建</button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="publisher-no-results">
          <b>没有找到符合条件的{objectName}</b>
          <p>尝试更换状态，或清除搜索关键词。</p>
          <button
            onClick={() => {
              setStatus("全部状态");
              setQuery("");
            }}
          >
            清除筛选
          </button>
        </div>
      ) : (
        <div className="published-list">
          {sorted.map((r) => {
            const statusText =
              r.payload.reviewStatus === "approved"
                ? "已公开"
                : r.payload.reviewStatus === "rejected"
                  ? "需修改"
                  : r.payload.reviewStatus === "draft"
                    ? "草稿"
                    : "审核中";
            return (
              <article
                key={r.id}
                className={`review-${String(r.payload.reviewStatus || "pending")}`}
              >
                {r.payload.cover ? (
                  r.payload.coverType === "video" ? (
                    <video src={String(r.payload.cover)} muted />
                  ) : (
                    <img src={String(r.payload.cover)} alt={String(r.payload.title || "发布内容封面")} />
                  )
                ) : (
                  <div className="record-symbol">
                    {kind === "job"
                      ? "JOB"
                      : kind === "activity"
                        ? "EVENT"
                        : "STORY"}
                  </div>
                )}
                <div>
                  <small>
                    {kind === "job"
                      ? `${String(r.payload.company || "湖南企业")} · ${String(r.payload.jobCategory || "其他类别")}`
                      : `${String(r.payload.publisher || "湖南企业")} · ${String(r.payload.category || "成长内容")}`}
                    {r.payload.featured ? " · 首页推荐" : ""}
                  </small>
                  <h2>{String(r.payload.title || "未命名")}</h2>
                  <p>{String(r.payload.summary || "尚未填写简介")}</p>
                  <span className="review-state">
                    {statusText} ·{" "}
                    {r.updatedAt
                      ? new Date(r.updatedAt).toLocaleDateString("zh-CN")
                      : "刚刚提交"}
                  </span>
                  {r.payload.reviewNote && (
                    <p className="review-note">
                      <b>JA 审核意见：</b>
                      {String(r.payload.reviewNote)}
                    </p>
                  )}
                </div>
                <button onClick={() => start(r)}>
                  {r.payload.reviewStatus === "rejected"
                    ? "修改并重提"
                    : r.payload.reviewStatus === "draft"
                      ? "继续编辑"
                      : "查看与编辑"}
                </button>
                <button className="danger-link" onClick={() => safeRemove(r)}>
                  删除
                </button>
              </article>
            );
          })}
        </div>
      )}
      {open && (
        <PublishDialog
          kind={kind}
          record={edit}
          save={save}
          upload={upload}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ContentBlockEditor({
  blocks,
  setBlocks,
  upload,
}: {
  blocks: RichBlock[];
  setBlocks: (blocks: RichBlock[]) => void;
  upload: (
    f: File,
    p?: string,
  ) => Promise<{
    url: string | null;
    key: string;
    name: string;
    type: string;
  } | null>;
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
              : type === "attachment"
                ? "附件名称"
                : "",
        text:
          type === "text"
            ? "输入正文内容。"
            : type === "quote"
              ? "输入重点提示或引用。"
              : "",
        items:
          type === "gallery"
            ? ["/media/ja-career-fair.jpg", "/media/ja-competition.jpg"]
            : undefined,
      },
    ]);
  const remove = (id: string) =>
    setBlocks(blocks.filter((block) => block.id !== id));
  const move = (id: string, offset: number) => {
    const index = blocks.findIndex((block) => block.id === id);
    const next = index + offset;
    if (index < 0 || next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setBlocks(copy);
  };
  const insertMedia = async (
    file: File | undefined,
    type: "image" | "video" | "attachment",
  ) => {
    if (!file) return;
    const result = await upload(file);
    if (!result?.url) return;
    setBlocks([
      ...blocks,
      {
        id: crypto.randomUUID(),
        type,
        url: result.url,
        title: file.name,
        caption: type === "image" ? "图片说明，可在这里补充现场信息。" : "",
      },
    ]);
  };
  return (
    <section className="content-studio-editor">
      <div className="editor-toolbar">
        <button onClick={() => add("heading")}>H2 小标题</button>
        <button onClick={() => add("text")}>正文段落</button>
        <button onClick={() => add("quote")}>重点提示</button>
        <button onClick={() => add("gallery")}>图集</button>
        <button onClick={() => add("agenda")}>活动议程</button>
        <button onClick={() => add("card")}>业务卡片</button>
        <label>
          图片
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={(e) => insertMedia(e.target.files?.[0], "image")}
          />
        </label>
        <label>
          视频
          <input
            hidden
            type="file"
            accept="video/mp4,video/webm"
            onChange={(e) => insertMedia(e.target.files?.[0], "video")}
          />
        </label>
        <label>
          附件
          <input
            hidden
            type="file"
            accept=".pdf,.docx,.pptx,.xlsx"
            onChange={(e) => insertMedia(e.target.files?.[0], "attachment")}
          />
        </label>
      </div>
      <div className="studio-block-list">
        {blocks.map((block, index) => (
          <article
            key={block.id}
            className={`studio-block block-${block.type}`}
          >
            <div className="block-head">
              <span>
                {block.type === "heading"
                  ? "小标题"
                  : block.type === "text"
                    ? "正文"
                    : block.type === "image"
                      ? "图片"
                      : block.type === "gallery"
                        ? "图集"
                        : block.type === "video"
                          ? "视频"
                          : block.type === "agenda"
                            ? "议程"
                            : block.type === "card"
                              ? "业务卡片"
                              : block.type === "attachment"
                                ? "附件"
                                : "重点"}
              </span>
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
                <button onClick={() => remove(block.id)}>删除</button>
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
            {(block.type === "image" ||
              block.type === "video" ||
              block.type === "attachment") && (
              <input
                value={block.url || ""}
                onChange={(e) => update(block.id, { url: e.target.value })}
                placeholder="媒体或附件链接"
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
            {(block.type === "image" || block.type === "gallery") && (
              <input
                value={block.caption || ""}
                onChange={(e) => update(block.id, { caption: e.target.value })}
                placeholder="图片说明 / Alt 文本"
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ContentRenderer({
  item,
}: {
  item: {
    title: string;
    summary: string;
    cover: string;
    coverType?: string;
    mediaType?: string;
    category?: string;
    date?: string;
    place?: string;
    bodyBlocks?: RichBlock[];
    agenda?: string[];
    abilityTags?: string[];
    registrationFields?: RegistrationField[];
    attachments?: string[];
  };
}) {
  const blocks = item.bodyBlocks?.length
    ? item.bodyBlocks
    : [{ id: "fallback", type: "text" as const, text: item.summary }];
  return (
    <article className="content-renderer">
      {item.cover &&
        (item.coverType === "video" ? (
          <video src={item.cover} controls playsInline />
        ) : (
          <img src={item.cover} alt={item.title} />
        ))}
      <small>{item.category || item.mediaType || "Star Plan"}</small>
      <h1>{item.title || "未命名内容"}</h1>
      <p className="lead">{item.summary}</p>
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
        {blocks.map((block) => (
          <section
            key={block.id}
            className={`render-block render-${block.type}`}
          >
            {block.type === "heading" && <h2>{block.title}</h2>}
            {block.type === "text" && <p>{block.text}</p>}
            {block.type === "quote" && <blockquote>{block.text}</blockquote>}
            {block.type === "image" && (
              <figure>
                <img
                  src={block.url || "/media/youth-collaboration.jpg"}
                  alt={block.caption || block.title || ""}
                />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            )}
            {block.type === "gallery" && (
              <div className="render-gallery">
                {(block.items || []).map((url) => (
                  <img key={url} src={url} alt={block.caption || "图集图片"} />
                ))}
              </div>
            )}
            {block.type === "video" && (
              <video src={block.url} controls playsInline />
            )}
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
            {block.type === "attachment" && (
              <a
                className="render-attachment"
                href={block.url || "#"}
                target="_blank"
                rel="noreferrer"
              >
                📎 {block.title || "查看附件"}
              </a>
            )}
          </section>
        ))}
      </div>
      {item.agenda?.length ? (
        <section className="render-extra">
          <h2>活动议程</h2>
          {item.agenda.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ) : null}
      {item.registrationFields?.length ? (
        <section className="render-extra">
          <h2>报名信息</h2>
          {item.registrationFields.map((field) => (
            <span key={field.id}>
              {field.label}
              {field.required ? " *" : ""}
            </span>
          ))}
        </section>
      ) : null}
      {item.attachments?.length ? (
        <section className="render-extra">
          <h2>附件</h2>
          {item.attachments.map((x) => (
            <a key={x} href={x}>
              {x}
            </a>
          ))}
        </section>
      ) : null}
    </article>
  );
}

function JobPublishingPreview({
  item,
}: {
  item: {
    title: string;
    company: string;
    summary: string;
    city: string;
    category: string;
    industry: string;
    degree: string;
    mode: string;
    duration: string;
    salaryMin: string;
    salaryMax: string;
    email: string;
    responsibilities: string;
    requirements: string;
  };
}) {
  const lines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  return (
    <article className="job-publishing-preview">
      <header>
        <span>{item.company.trim().slice(0, 2) || "企业"}</span>
        <div>
          <small>{item.company || "企业名称"}</small>
          <h1>{item.title || "机会名称"}</h1>
        </div>
      </header>
      <p>{item.summary || "一句话介绍这份机会的工作内容和学生收获。"}</p>
      <div className="job-preview-tags">
        <span>{item.city || "长沙"}</span>
        <span>{item.category || "机会类别"}</span>
        <span>{item.industry || "所属行业"}</span>
        <span>{item.degree || "学历要求"}</span>
        <span>{item.mode || "工作方式"}</span>
      </div>
      <section>
        <b>薪资与周期</b>
        <p>
          {item.salaryMin || "0"}–{item.salaryMax || "0"} 元/天 ·{" "}
          {item.duration || "周期待定"}
        </p>
      </section>
      <section>
        <b>岗位职责</b>
        {lines(item.responsibilities).length ? (
          <ul>
            {lines(item.responsibilities).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p>尚未填写岗位职责。</p>
        )}
      </section>
      <section>
        <b>能力要求</b>
        {lines(item.requirements).length ? (
          <ul>
            {lines(item.requirements).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p>尚未填写能力要求。</p>
        )}
      </section>
      <footer>
        <small>简历投递邮箱</small>
        <b>{item.email || "hr@example.com"}</b>
      </footer>
    </article>
  );
}

function PublishDialog({
  kind,
  record,
  save,
  upload,
  onClose,
}: {
  kind: "job" | "activity" | "content";
  record?: StoredRecord;
  save: (
    k: string,
    p: Record<string, unknown>,
    i?: string,
  ) => Promise<string | null>;
  upload: (
    f: File,
    p?: string,
  ) => Promise<{
    url: string | null;
    key: string;
    name: string;
    type: string;
  } | null>;
  onClose: () => void;
}) {
  useDialogEscape(onClose);
  const old = record?.payload || {};
  const oldFields = (old.registrationFields as RegistrationField[]) || [];
  const [selectedFields, setSelectedFields] = useState<string[]>(
      oldFields.length
        ? oldFields
            .filter((x) => registrationOptions.some((o) => o.id === x.id))
            .map((x) => x.id)
        : ["name", "phone", "school"],
    ),
    [customQuestions, setCustomQuestions] = useState(
      oldFields
        .filter((x) => !registrationOptions.some((o) => o.id === x.id))
        .map((x) => x.label)
        .join("\n"),
    );
  const [form, setForm] = useState({
    title: String(old.title || ""),
    company: String(old.company || old.publisher || ""),
    summary: String(old.summary || ""),
    email: String(old.contactEmail || ""),
    contactName: String(old.contactName || ""),
    contactPhone: String(old.contactPhone || ""),
    city: String(old.city || "长沙"),
    category: String(old.jobCategory || old.category || "产品运营"),
    duration: String(old.duration || ""),
    date: String(old.date || ""),
    deadline: String(old.registrationDeadline || ""),
    capacity: String(old.capacity || "100"),
    degree: String(old.degree || "本科"),
    industry: String(old.industry || "互联网AI"),
    salaryMin: String(old.salaryMin ?? "100"),
    salaryMax: String(old.salaryMax ?? "200"),
    mode: String(old.mode || "线下"),
    positionCount: String(old.positionCount || "1"),
    audience: String(old.audience || "在校学生"),
    responsibilities: String(
      ((old.responsibilities as string[]) || []).join("\n"),
    ),
    requirements: String(((old.requirements as string[]) || []).join("\n")),
    cover: String(old.cover || ""),
    coverType: String(old.coverType || "image"),
    mediaType: String(old.mediaType || "article"),
    sortOrder: String(old.sortOrder || "0"),
    featured: Boolean(old.featured),
    agenda: String(((old.agenda as string[]) || []).join("\n")),
    attachments: String(((old.attachments as string[]) || []).join("\n")),
  });
  const [saving, setSaving] = useState<"" | "draft" | "submit">(""),
    [step, setStep] = useState("基础信息"),
    [autosave, setAutosave] = useState(
      record ? "已载入平台记录" : "正在准备本地草稿…",
    ),
    [draftReady, setDraftReady] = useState(Boolean(record)),
    [workingId, setWorkingId] = useState(record?.id || ""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [blocks, setBlocks] = useState<RichBlock[]>(
      (old.bodyBlocks as RichBlock[] | undefined) ||
        starterBlocks[kind === "activity" ? "activity" : "content"],
    ),
    [abilities, setAbilities] = useState<string[]>(
      (old.abilityTags as string[] | undefined) || ["表达沟通", "行业认知"],
    );
  const draftKey = `starlight-enterprise-draft-${kind}-${record?.id || "new"}`;
  useEffect(() => {
    if (record) return;
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(draftKey);
        if (stored) {
          const draft = JSON.parse(stored) as {
            form?: typeof form;
            blocks?: RichBlock[];
            selectedFields?: string[];
            customQuestions?: string;
            abilities?: string[];
          };
          if (draft.form) setForm((current) => ({ ...current, ...draft.form }));
          if (draft.blocks) setBlocks(draft.blocks);
          if (draft.selectedFields) setSelectedFields(draft.selectedFields);
          if (typeof draft.customQuestions === "string")
            setCustomQuestions(draft.customQuestions);
          if (draft.abilities) setAbilities(draft.abilities);
          setAutosave("✓ 已恢复上次未完成草稿");
        } else {
          setAutosave("尚未保存到平台");
        }
      } catch {
        setAutosave("本地草稿不可用，请及时保存到平台");
      } finally {
        setDraftReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftKey, record]);
  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          form,
          blocks,
          selectedFields,
          customQuestions,
          abilities,
        }),
      );
      setAutosave(
        `✓ 已保存到当前设备 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
      );
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    abilities,
    blocks,
    customQuestions,
    draftKey,
    draftReady,
    form,
    selectedFields,
  ]);
  const change = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => {
      if (!current[k]) return current;
      const next = { ...current };
      delete next[k];
      return next;
    });
  };
  const media = async (file?: File) => {
    if (!file) return;
    const r = await upload(file);
    if (r?.url)
      setForm((f) => ({
        ...f,
        cover: r.url || "",
        coverType: r.type.startsWith("video/") ? "video" : "image",
        mediaType: r.type.startsWith("video/") ? "video" : f.mediaType,
      }));
  };
  const registrationFields = [
    ...registrationOptions.filter((x) => selectedFields.includes(x.id)),
    ...customQuestions
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((label, index) => ({
        id: `custom_${index + 1}`,
        label,
        type: "textarea" as const,
        required: false,
      })),
  ];
  const splitLines = (value: string) =>
    value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  const buildPayload = (mode: "draft" | "submit") => {
    const isDraft = mode === "draft";
    const reviewStatus = isDraft
      ? "draft"
      : kind === "job"
        ? "approved"
        : "pending";
    const base = {
      ...old,
      id: workingId || record?.id || crypto.randomUUID(),
      title: form.title.trim() || "未命名草稿",
      summary: form.summary.trim(),
      cover: form.cover,
      coverType: form.coverType,
      region: "湖南",
      sortOrder: Number(old.sortOrder || 0) || 0,
      featured: Boolean(old.featured),
      reviewStatus,
      reviewNote: isDraft ? String(old.reviewNote || "") : "",
      submittedAt: isDraft
        ? String(old.submittedAt || "")
        : new Date().toISOString(),
      draftUpdatedAt: new Date().toISOString(),
      editorVersion: 2,
      bodyBlocks: blocks,
      attachments: splitLines(form.attachments),
      plainText: [
        form.title,
        form.summary,
        ...blocks.map((block) => `${block.title || ""} ${block.text || ""}`),
      ].join("\n"),
    };
    if (kind === "job") {
      const salaryMin = Number(form.salaryMin) || 0;
      const salaryMax = Number(form.salaryMax) || 0;
      return {
        ...base,
        company: form.company.trim(),
        contactEmail: form.email.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        city: form.city.trim() || "长沙",
        jobCategory: form.category,
        industry: form.industry,
        degree: form.degree,
        mode: form.mode,
        duration: form.duration.trim() || "待定",
        positionCount: Number(form.positionCount) || 1,
        salaryMin,
        salaryMax,
        salary: salaryMax ? `${salaryMin}-${salaryMax} 元/天` : "薪资面议",
        tags: [form.category, form.industry, `${form.degree}可投`],
        status: isDraft ? "草稿" : "招募中",
        logo: form.company.trim().slice(0, 2) || "企业",
        color: "#00a0af",
        responsibilities: splitLines(form.responsibilities),
        requirements: splitLines(form.requirements),
        benefits: (old.benefits as string[] | undefined) || [
          "企业导师",
          "真实项目",
        ],
        publishedAt: isDraft
          ? String(old.publishedAt || "")
          : new Date().toLocaleDateString("zh-CN"),
      };
    }
    if (kind === "activity") {
      return {
        ...base,
        date: form.date,
        registrationDeadline: form.deadline,
        place: form.city.trim() || "长沙",
        category: form.category || "企业活动",
        capacity: Number(form.capacity) || 100,
        registered: Number(old.registered || 0),
        audience: form.audience.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        status: isDraft ? "草稿" : "审核中",
        registrationFields,
        agenda: splitLines(form.agenda),
        abilityTags: abilities,
        publisher: form.company.trim() || "湖南企业",
      };
    }
    return {
      ...base,
      category: form.category || "企业曝光",
      duration: form.duration.trim() || "10 分钟",
      level: String(old.level || "入门"),
      mediaType: form.mediaType,
      tags: abilities,
      publisher: form.company.trim() || "湖南企业",
      status: isDraft ? "草稿" : "审核中",
    };
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (form.title.trim().length < 4) next.title = "标题至少填写 4 个字";
    if (!form.company.trim()) next.company = "请填写发布企业名称";
    if (form.summary.trim().length < 12)
      next.summary = "摘要至少填写 12 个字，说明学生可以获得什么";
    if (kind !== "job" && !form.cover)
      next.cover = "活动和内容必须上传真实封面";
    if (kind === "job") {
      if (!/^\S+@\S+\.\S+$/.test(form.email))
        next.email = "请填写有效的简历接收邮箱";
      if (!form.industry) next.industry = "请选择所属行业";
      if (!form.degree) next.degree = "请选择学历要求";
      if (splitLines(form.responsibilities).length < 2)
        next.responsibilities = "至少填写 2 条岗位职责";
      if (splitLines(form.requirements).length < 2)
        next.requirements = "至少填写 2 条能力要求";
      const min = Number(form.salaryMin);
      const max = Number(form.salaryMax);
      if (min < 0 || max > 500 || min > max)
        next.salary = "薪资区间应在 0–500 元/天，且下限不能高于上限";
    }
    if (kind === "activity") {
      if (!form.date) next.date = "请选择活动日期";
      if (Number(form.capacity) < 1) next.capacity = "报名人数必须大于 0";
      if (
        form.deadline &&
        form.date &&
        new Date(form.deadline) > new Date(form.date)
      )
        next.deadline = "报名截止日期不能晚于活动日期";
      if (!selectedFields.includes("name"))
        next.registration = "报名表必须包含姓名";
      if (
        !selectedFields.some((field) => field === "phone" || field === "email")
      )
        next.registration = "报名表必须包含联系电话或常用邮箱";
      if (splitLines(form.agenda).length < 2)
        next.agenda = "至少填写 2 个活动环节";
    }
    if (kind === "content") {
      if (blocks.length < 2) next.blocks = "正文至少包含 2 个内容模块";
      if (
        blocks.some(
          (block) =>
            !String(block.title || block.text || block.url || "").trim(),
        )
      )
        next.blocks = "正文中仍有空白模块，请补充或删除";
    }
    setErrors(next);
    if (Object.keys(next).length) {
      const basicKeys = [
        "title",
        "company",
        "summary",
        "cover",
        "email",
        "date",
        "capacity",
        "deadline",
      ];
      const first = Object.keys(next)[0];
      if (basicKeys.includes(first)) setStep("基础信息");
      else if (["responsibilities", "requirements", "salary"].includes(first))
        setStep("岗位详情");
      else if (first === "registration") setStep("报名设置");
      else if (first === "agenda") setStep("成长设计");
      else if (first === "blocks")
        setStep(kind === "content" ? "内容编辑" : "活动详情");
      return false;
    }
    return true;
  };
  const saveDraft = async () => {
    setSaving("draft");
    const id = await save(kind, buildPayload("draft"), workingId || undefined);
    if (id) {
      setWorkingId(id);
      setAutosave("✓ 草稿已保存到平台");
    }
    setSaving("");
  };
  const submit = async () => {
    if (!validate()) return;
    setSaving("submit");
    const id = await save(kind, buildPayload("submit"), workingId || undefined);
    setSaving("");
    if (!id) return;
    window.localStorage.removeItem(draftKey);
    onClose();
  };
  const preview = {
    ...form,
    cover: form.cover || "/media/ja-career-fair.jpg",
    bodyBlocks: blocks,
    abilityTags: abilities,
    agenda: form.agenda
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean),
    registrationFields,
  };
  const steps =
    kind === "job"
      ? ["基础信息", "岗位详情", "预览"]
      : kind === "activity"
        ? ["基础信息", "活动详情", "报名设置", "成长设计", "预览"]
        : ["基础信息", "内容编辑", "展示设置", "预览"];
  const currentStepIndex = steps.indexOf(step);
  const goNext = () =>
    setStep(steps[Math.min(steps.length - 1, currentStepIndex + 1)]);
  const goPrevious = () => setStep(steps[Math.max(0, currentStepIndex - 1)]);
  const issue = (key: string) =>
    errors[key] ? <small className="field-error">{errors[key]}</small> : null;
  return (
    <div className="dialog-backdrop">
      <section className="dialog publisher-dialog studio-dialog">
        <button className="dialog-close" aria-label="关闭发布窗口" onClick={onClose}>
          ×
        </button>
        <div className="studio-top">
          <div>
            <small>STAR PLAN CONTENT STUDIO</small>
            <h1>
              {record ? "编辑" : "新建"}
              {kind === "job"
                ? "实习 / 项目机会"
                : kind === "activity"
                  ? "成长活动"
                  : "成长内容"}
            </h1>
          </div>
          <span>{autosave}</span>
        </div>
        <div className="review-flow-strip">
          <span className="active">1 企业编辑与校验</span>
          <i>→</i>
          <span>{kind === "job" ? "2 确认后直接发布" : "2 提交 JA 审核"}</span>
          <i>→</i>
          <span>3 学生端公开展示</span>
        </div>
        <nav className="studio-steps">
          {steps.map((name, index) => (
            <button
              key={name}
              className={`${step === name ? "active" : ""} ${index < currentStepIndex ? "complete" : ""}`}
              onClick={() => setStep(name)}
              aria-current={step === name ? "step" : undefined}
            >
              <span>{index < currentStepIndex ? "✓" : index + 1}</span>
              {name}
            </button>
          ))}
        </nav>
        {Object.keys(errors).length > 0 && (
          <div className="publisher-error-summary" role="alert">
            <b>还有 {Object.keys(errors).length} 项信息需要完善</b>
            <p>{Object.values(errors).join("；")}</p>
          </div>
        )}
        <div className="studio-grid">
          <div className="studio-main">
            <div className="publisher-fields">
              {step === "基础信息" && (
                <>
                  <label className={errors.company ? "has-error" : ""}>
                    <span>发布企业名称 *</span>
                    <input
                      value={form.company}
                      onChange={(e) => change("company", e.target.value)}
                      placeholder="请填写营业主体或正式品牌名称"
                      aria-invalid={Boolean(errors.company)}
                    />
                    {issue("company")}
                  </label>
                  <label className={errors.title ? "has-error" : ""}>
                    <span>
                      {kind === "job"
                        ? "机会名称 *"
                        : kind === "activity"
                          ? "活动名称 *"
                          : "内容标题 *"}
                    </span>
                    <input
                      value={form.title}
                      onChange={(e) => change("title", e.target.value)}
                      placeholder={
                        kind === "job"
                          ? "机会名称"
                          : kind === "activity"
                            ? "活动名称"
                            : "内容标题"
                      }
                      maxLength={60}
                      aria-invalid={Boolean(errors.title)}
                    />
                    <small className="field-hint">{form.title.length}/60</small>
                    {issue("title")}
                  </label>
                  <label>
                    <span>{kind === "job" ? "机会类别 *" : "内容分类 *"}</span>
                    <select
                      value={form.category}
                      onChange={(e) => change("category", e.target.value)}
                    >
                      {(kind === "job"
                        ? jobCategories.slice(1)
                        : kind === "activity"
                          ? activityCategories
                          : contentCategories.slice(1)
                      ).map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  {kind !== "content" && (
                    <label>
                      <span>
                        {kind === "job" ? "工作城市 *" : "活动地点 *"}
                      </span>
                      <input
                        value={form.city}
                        onChange={(e) => change("city", e.target.value)}
                        placeholder="例如：长沙市岳麓区"
                      />
                    </label>
                  )}
                  <label
                    className={`full ${errors.summary ? "has-error" : ""}`}
                  >
                    <span>一句话摘要 *</span>
                    <textarea
                      rows={3}
                      value={form.summary}
                      onChange={(e) => change("summary", e.target.value)}
                      placeholder="一句话讲清楚价值，学生端会优先展示"
                      maxLength={160}
                      aria-invalid={Boolean(errors.summary)}
                    />
                    <small className="field-hint">
                      {form.summary.length}/160
                    </small>
                    {issue("summary")}
                  </label>
                  {kind !== "job" && (
                    <label
                      className={`media-upload full ${errors.cover ? "has-error" : ""}`}
                    >
                      <span>展示封面 *</span>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={(e) => media(e.target.files?.[0])}
                      />
                      <span className="media-upload-state">
                        {form.cover
                          ? `✓ ${form.coverType === "video" ? "视频" : "图片"}上传成功，可在右侧预览`
                          : "上传 16:9 图片或 MP4/WebM 视频"}
                      </span>
                      {issue("cover")}
                    </label>
                  )}
                  {kind === "job" && (
                    <>
                      <label className={errors.email ? "has-error" : ""}>
                        <span>简历接收邮箱 *</span>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => change("email", e.target.value)}
                          placeholder="hr@example.com"
                          aria-invalid={Boolean(errors.email)}
                        />
                        {issue("email")}
                      </label>
                      <label>
                        <span>招聘联系人</span>
                        <input
                          value={form.contactName}
                          onChange={(e) =>
                            change("contactName", e.target.value)
                          }
                          placeholder="例如：李老师"
                        />
                      </label>
                    </>
                  )}
                  {kind === "activity" && (
                    <>
                      <label className={errors.date ? "has-error" : ""}>
                        <span>活动日期 *</span>
                        <input
                          type="date"
                          value={form.date}
                          onChange={(e) => change("date", e.target.value)}
                          aria-invalid={Boolean(errors.date)}
                        />
                        {issue("date")}
                      </label>
                      <label className={errors.deadline ? "has-error" : ""}>
                        <span>报名截止日期</span>
                        <input
                          type="date"
                          value={form.deadline}
                          onChange={(e) => change("deadline", e.target.value)}
                          aria-invalid={Boolean(errors.deadline)}
                        />
                        {issue("deadline")}
                      </label>
                      <label className={errors.capacity ? "has-error" : ""}>
                        <span>报名人数上限 *</span>
                        <input
                          type="number"
                          min="1"
                          value={form.capacity}
                          onChange={(e) => change("capacity", e.target.value)}
                          aria-invalid={Boolean(errors.capacity)}
                        />
                        {issue("capacity")}
                      </label>
                      <label>
                        <span>面向人群</span>
                        <input
                          value={form.audience}
                          onChange={(e) => change("audience", e.target.value)}
                          placeholder="例如：大一至大三学生"
                        />
                      </label>
                      <label>
                        <span>活动联系人</span>
                        <input
                          value={form.contactName}
                          onChange={(e) =>
                            change("contactName", e.target.value)
                          }
                          placeholder="例如：王老师"
                        />
                      </label>
                      <label>
                        <span>联系电话</span>
                        <input
                          type="tel"
                          value={form.contactPhone}
                          onChange={(e) =>
                            change("contactPhone", e.target.value)
                          }
                          placeholder="用于活动通知与应急联系"
                        />
                      </label>
                    </>
                  )}
                  {kind === "content" && (
                    <>
                      <label>
                        <span>预计阅读/观看时长</span>
                        <input
                          value={form.duration}
                          onChange={(e) => change("duration", e.target.value)}
                          placeholder="例如：8 分钟"
                        />
                      </label>
                      <label>
                        <span>内容形式 *</span>
                        <select
                          value={form.mediaType}
                          onChange={(e) => change("mediaType", e.target.value)}
                        >
                          <option value="article">图文文章</option>
                          <option value="video">视频内容</option>
                        </select>
                      </label>
                    </>
                  )}
                </>
              )}
              {step === "岗位详情" && kind === "job" && (
                <>
                  <label className={errors.industry ? "has-error" : ""}>
                    <span>所属行业 *</span>
                    <select
                      value={form.industry}
                      onChange={(e) => change("industry", e.target.value)}
                    >
                      {industryOptions.slice(1).map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                    {issue("industry")}
                  </label>
                  <label className={errors.degree ? "has-error" : ""}>
                    <span>最低学历 *</span>
                    <select
                      value={form.degree}
                      onChange={(e) => change("degree", e.target.value)}
                    >
                      {degreeOptions.slice(1).map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                    {issue("degree")}
                  </label>
                  <label>
                    <span>工作方式</span>
                    <select
                      value={form.mode}
                      onChange={(e) => change("mode", e.target.value)}
                    >
                      <option>线下</option>
                      <option>线上</option>
                      <option>混合办公</option>
                    </select>
                  </label>
                  <label>
                    <span>项目/实习周期</span>
                    <input
                      value={form.duration}
                      onChange={(e) => change("duration", e.target.value)}
                      placeholder="例如：3 个月，每周 3 天"
                    />
                  </label>
                  <label>
                    <span>招募人数</span>
                    <input
                      type="number"
                      min="1"
                      value={form.positionCount}
                      onChange={(e) => change("positionCount", e.target.value)}
                    />
                  </label>
                  <div
                    className={`salary-editor full ${errors.salary ? "has-error" : ""}`}
                  >
                    <span>日薪区间（元/天）*</span>
                    <label>
                      下限
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={form.salaryMin}
                        onChange={(e) => change("salaryMin", e.target.value)}
                      />
                    </label>
                    <label>
                      上限
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={form.salaryMax}
                        onChange={(e) => change("salaryMax", e.target.value)}
                      />
                    </label>
                    {issue("salary")}
                  </div>
                  <label
                    className={`full ${errors.responsibilities ? "has-error" : ""}`}
                  >
                    <span>岗位职责（每行一条）*</span>
                    <textarea
                      rows={6}
                      value={form.responsibilities}
                      onChange={(e) =>
                        change("responsibilities", e.target.value)
                      }
                      placeholder="参与用户调研与需求整理&#10;协助运营数据分析与复盘"
                    />
                    {issue("responsibilities")}
                  </label>
                  <label
                    className={`full ${errors.requirements ? "has-error" : ""}`}
                  >
                    <span>能力要求（每行一条）*</span>
                    <textarea
                      rows={6}
                      value={form.requirements}
                      onChange={(e) => change("requirements", e.target.value)}
                      placeholder="具备清晰的沟通表达能力&#10;能够熟练使用常用办公软件"
                    />
                    {issue("requirements")}
                  </label>
                  <label className="full">
                    <span>补充资料链接（每行一个）</span>
                    <textarea
                      rows={3}
                      value={form.attachments}
                      onChange={(e) => change("attachments", e.target.value)}
                      placeholder="企业介绍、项目说明或外部网页"
                    />
                  </label>
                </>
              )}
              {((step === "活动详情" && kind === "activity") ||
                (step === "内容编辑" && kind === "content")) && (
                <ContentBlockEditor
                  blocks={blocks}
                  setBlocks={setBlocks}
                  upload={upload}
                />
              )}
              {step === "报名设置" && (
                <fieldset className="registration-config full">
                  <legend>学生报名需要填写什么信息？</legend>
                  <p>
                    姓名与至少一种联系方式必须保留；报名数据只向活动发布方开放。
                  </p>
                  {issue("registration")}
                  <div>
                    {registrationOptions.map((field) => (
                      <label key={field.id}>
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.id)}
                          onChange={() => {
                            setSelectedFields((v) =>
                              v.includes(field.id)
                                ? v.filter((x) => x !== field.id)
                                : [...v, field.id],
                            );
                            setErrors((current) => {
                              const next = { ...current };
                              delete next.registration;
                              return next;
                            });
                          }}
                        />
                        <span>{field.label}</span>
                        <small>{field.required ? "必填" : "选填"}</small>
                      </label>
                    ))}
                  </div>
                  <label>
                    其他自定义问题（每行一个）
                    <textarea
                      rows={3}
                      value={customQuestions}
                      onChange={(e) => setCustomQuestions(e.target.value)}
                      placeholder="例如：你为什么想参加本次活动？"
                    />
                  </label>
                </fieldset>
              )}
              {step === "成长设计" && (
                <>
                  <label className={`full ${errors.agenda ? "has-error" : ""}`}>
                    <span>活动议程（每行一个环节）*</span>
                    <textarea
                      rows={5}
                      value={form.agenda}
                      onChange={(e) => change("agenda", e.target.value)}
                      placeholder="09:00-09:30 签到&#10;09:30-11:00 企业参访"
                    />
                    {issue("agenda")}
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
                  <label className="full">
                    <span>活动资料或附件（每行一个）</span>
                    <textarea
                      rows={3}
                      value={form.attachments}
                      onChange={(e) => change("attachments", e.target.value)}
                      placeholder="活动手册、交通指引或准备材料"
                    />
                  </label>
                </>
              )}
              {step === "展示设置" && kind === "content" && (
                <>
                  <fieldset className="ability-picker full">
                    <legend>内容能力标签</legend>
                    {abilityOptions.map((tag) => (
                      <label key={tag}>
                        <input
                          type="checkbox"
                          checked={abilities.includes(tag)}
                          onChange={() =>
                            setAbilities((value) =>
                              value.includes(tag)
                                ? value.filter((item) => item !== tag)
                                : [...value, tag],
                            )
                          }
                        />
                        <span>{tag}</span>
                      </label>
                    ))}
                  </fieldset>
                  <label className="full">
                    <span>延伸阅读与附件（每行一个）</span>
                    <textarea
                      rows={4}
                      value={form.attachments}
                      onChange={(e) => change("attachments", e.target.value)}
                      placeholder="PDF、资料包或可信外部链接"
                    />
                  </label>
                </>
              )}
              {step === "预览" && (
                <section className="publish-readiness full">
                  <small>FINAL CHECK</small>
                  <h2>发布前确认</h2>
                  <div>
                    <p className={form.title && form.summary ? "done" : ""}>
                      <b>{form.title && form.summary ? "✓" : "1"}</b>
                      标题与摘要完整
                    </p>
                    <p className={kind === "job" || form.cover ? "done" : ""}>
                      <b>{kind === "job" || form.cover ? "✓" : "2"}</b>
                      展示素材已准备
                    </p>
                    <p
                      className={
                        kind !== "content" || blocks.length >= 2 ? "done" : ""
                      }
                    >
                      <b>
                        {kind !== "content" || blocks.length >= 2 ? "✓" : "3"}
                      </b>
                      详细内容已编排
                    </p>
                  </div>
                  <p className="publish-readiness-note">
                    {kind === "job"
                      ? "确认发布后，机会将直接进入学生端；如需调整可随时返回编辑。"
                      : "提交后进入 JA 审核。被退回时会保留全部内容和审核意见，可修改后再次提交。"}
                  </p>
                </section>
              )}
            </div>
          </div>
          <aside className="studio-preview">
            <div className="studio-preview-head">
              <b>学生端展示预览</b>
              <span>实时更新</span>
            </div>
            {kind === "job" ? (
              <JobPublishingPreview item={form} />
            ) : (
              <ContentRenderer item={preview} />
            )}
          </aside>
        </div>
        <div className="dialog-actions publisher-dialog-actions">
          <div>
            <button
              className="quiet-btn"
              onClick={onClose}
              disabled={Boolean(saving)}
            >
              关闭
            </button>
            <button
              className="outline-btn"
              onClick={saveDraft}
              disabled={Boolean(saving)}
            >
              {saving === "draft" ? "正在保存…" : "保存草稿"}
            </button>
          </div>
          <div>
            {currentStepIndex > 0 && (
              <button
                className="quiet-btn"
                onClick={goPrevious}
                disabled={Boolean(saving)}
              >
                上一步
              </button>
            )}
            {currentStepIndex < steps.length - 1 ? (
              <button
                className="primary-btn"
                onClick={goNext}
                disabled={Boolean(saving)}
              >
                下一步：{steps[currentStepIndex + 1]}
              </button>
            ) : (
              <button
                className="primary-btn"
                disabled={Boolean(saving)}
                onClick={submit}
              >
                {saving === "submit"
                  ? "正在提交…"
                  : kind === "job"
                    ? "确认并发布"
                    : "提交 JA 审核"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function EnterpriseProfile({
  record,
  save,
  upload,
}: {
  record?: StoredRecord;
  save: (
    k: string,
    p: Record<string, unknown>,
    i?: string,
  ) => Promise<string | null>;
  upload: (
    f: File,
    p?: string,
  ) => Promise<{
    url: string | null;
    key: string;
    name: string;
    type: string;
  } | null>;
}) {
  const old = record?.payload || {};
  const [form, setForm] = useState({
    name: String(old.name || "湖南示例企业"),
    industry: String(old.industry || "制造业"),
    city: String(old.city || "长沙"),
    intro: String(
      old.intro ||
        "立足湖南，为青年提供真实、开放且有导师支持的实习、项目与成长活动。",
    ),
    website: String(old.website || "https://example.com"),
    logo: String(old.logo || "/og.png"),
    creditCode: String(old.creditCode || ""),
    companySize: String(old.companySize || "50-199人"),
    address: String(old.address || "长沙市"),
    contactName: String(old.contactName || ""),
    contactPhone: String(old.contactPhone || ""),
    contactEmail: String(old.contactEmail || ""),
  });
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const change = (k: string, v: string) => setForm((x) => ({ ...x, [k]: v }));
  const logo = async (file?: File) => {
    if (!file) return;
    const r = await upload(file);
    if (r?.url) change("logo", r.url);
  };
  const requiredChecks = [
    Boolean(form.name.trim()),
    Boolean(form.industry.trim()),
    form.intro.trim().length >= 30,
    Boolean(form.logo.trim()),
    Boolean(form.contactName.trim()),
    /^\S+@\S+\.\S+$/.test(form.contactEmail),
    Boolean(form.contactPhone.trim()),
    Boolean(form.address.trim()),
  ];
  const completeness = Math.round(
    (requiredChecks.filter(Boolean).length / requiredChecks.length) * 100,
  );
  const submit = async () => {
    setError("");
    if (!form.name.trim() || !form.industry.trim()) return setError("请填写企业名称与所属行业");
    if (form.intro.trim().length < 30) return setError("企业简介至少填写 30 个字");
    if (!form.contactName.trim() || !form.contactPhone.trim() || !/^\S+@\S+\.\S+$/.test(form.contactEmail))
      return setError("请完整填写内部联系人、电话和有效邮箱");
    setSaving(true);
    const id = await save("enterprise-profile", { ...form, region: "湖南" }, record?.id);
    setSaving(false);
    if (!id) setError("企业资料保存失败，请检查后重试");
  };
  return (
    <>
      <Title
        eyebrow="HUNAN COMPANY PROFILE"
        title="企业资料"
        desc=""
        action={
          <button
            className="primary-btn"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "正在保存…" : "保存企业资料"}
          </button>
        }
      />
      <div className="enterprise-profile-editor">
        <section>
          <img src={form.logo} alt={`${form.name} logo`} />
          <small>PUBLIC COMPANY PROFILE PREVIEW</small>
          <h1>{form.name}</h1>
          <h2>{form.industry}</h2>
          <p>{form.intro}</p>
          <div className="company-credit-tags profile-facts">
            <span>{form.companySize}</span>
            <span>{form.city}</span>
            <span>{form.address}</span>
          </div>
          <a href={form.website} target="_blank" rel="noreferrer">
            访问企业官网 ↗
          </a>
        </section>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="profile-completeness-card">
            <span><b>资料完整度 {completeness}%</b><small>完整资料有助于学生判断机会真实性</small></span>
            <i><em style={{ width: `${completeness}%` }} /></i>
          </div>
          {error && <p className="form-error">{error}</p>}
          <label>
            企业名称
            <input
              value={form.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </label>
          <label>
            所属行业
            <select
              value={form.industry}
              onChange={(e) => change("industry", e.target.value)}
            >
              {industryOptions.filter((item) => item !== "全部行业").map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            所在城市
            <input
              value={form.city}
              onChange={(e) => change("city", e.target.value)}
            />
          </label>
          <label>
            企业规模
            <select value={form.companySize} onChange={(e) => change("companySize", e.target.value)}>
              <option>1-49人</option><option>50-199人</option><option>200-499人</option><option>500-999人</option><option>1000人以上</option>
            </select>
          </label>
          <label>
            办公地址
            <input value={form.address} onChange={(e) => change("address", e.target.value)} />
          </label>
          <label>
            企业简介
            <textarea
              rows={5}
              value={form.intro}
              onChange={(e) => change("intro", e.target.value)}
            />
          </label>
          <fieldset className="enterprise-private-fields">
            <legend>内部联络信息（不在学生端公开）</legend>
            <label>联系人<input value={form.contactName} onChange={(e) => change("contactName", e.target.value)} /></label>
            <label>联系电话<input type="tel" value={form.contactPhone} onChange={(e) => change("contactPhone", e.target.value)} /></label>
            <label>联系邮箱<input type="email" value={form.contactEmail} onChange={(e) => change("contactEmail", e.target.value)} /></label>
            <label>统一社会信用代码（选填）<input value={form.creditCode} onChange={(e) => change("creditCode", e.target.value)} /></label>
          </fieldset>
          <label>
            企业官网
            <input
              type="url"
              value={form.website}
              onChange={(e) => change("website", e.target.value)}
            />
          </label>
          <label className="media-upload">
            替换企业 Logo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => logo(e.target.files?.[0])}
            />
          </label>
        </form>
      </div>
    </>
  );
}
