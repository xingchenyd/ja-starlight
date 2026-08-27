/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages, jsx-a11y/media-has-caption, @typescript-eslint/no-unused-vars */
"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
    ["overview", "企业总览", "⌂"],
    ["positions", "机会发布", "▣"],
    ["activities", "活动发布", "◇"],
    ["content", "内容发布", "▱"],
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

function getDemoId() {
  let id = localStorage.getItem("starlight-demo-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("starlight-demo-id", id);
  }
  return id;
}
async function api(path: string, init: RequestInit = {}) {
  const id = getDemoId();
  return fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), "x-starlight-demo-id": id },
  });
}

export default function PlatformApp({
  initialRole,
  initialTab,
}: {
  initialRole: Role;
  initialTab?: string;
}) {
  const [role] = useState<Role>(initialRole),
    [tab, setTab] = useState(initialTab || "overview"),
    [records, setRecords] = useState<StoredRecord[]>([]),
    [catalog, setCatalog] = useState<StoredRecord[]>([]),
    [toast, setToast] = useState(""),
    [ready, setReady] = useState(false);
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
  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
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
      updatedAt: new Date().toISOString(),
    };
    setRecords((v) => [record, ...v.filter((x) => x.id !== data.id)]);
    flash("已保存并同步到平台");
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
              onClick={() => setTab(id)}
            >
              <span>{glyph}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="side-help contact-only">
          <a href="mailto:support@jachina.org">联系项目团队 →</a>
        </div>
        <a className="back" href="/">
          ← 返回主页
        </a>
      </aside>
      <div className="work">
        <header className="topbar fixed-workspace-title">
          <div className="workspace-context">
            <b>
              {role === "student"
                ? `你好，${studentName}`
                : "企业工作台 Enterprise"}
            </b>
          </div>
          <div
            className="sync-dot"
            aria-label={ready ? "已同步" : "正在载入"}
          />
        </header>
        <main key={`${role}-${tab}`} className="workspace page-transition">
          {role === "student" ? (
            <StudentSpace
              tab={tab}
              setTab={setTab}
              records={records}
              catalog={catalog}
              save={save}
              upload={upload}
              flash={flash}
            />
          ) : (
            <EnterpriseSpace
              tab={tab}
              setTab={setTab}
              records={records}
              save={save}
              remove={remove}
              upload={upload}
              flash={flash}
            />
          )}
        </main>
      </div>
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
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
    <div className="page-title">
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
  setTab,
  records,
  catalog,
  save,
  upload,
  flash,
}: {
  tab: string;
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
      />
    );
  if (tab === "opportunities")
    return <OpportunityBrowser allJobs={allJobs} flash={flash} />;
  if (tab === "activities")
    return <ActivityExperience custom={customActivities} flash={flash} />;
  if (tab === "content") return <LearningCenter custom={customContents} />;
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
}: {
  setTab: (s: string) => void;
  allJobs: Job[];
  allActivities: Activity[];
  allContents: ContentItem[];
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
        <GrowthTimelinePreview onOpen={() => setTab("profile")} />
      </section>
    </>
  );
}

function GrowthTimelinePreview({ onOpen }: { onOpen: () => void }) {
  const items = [
    ["2026.09.12", "参加未来职场开放日", "完成智能制造职业观察记录"],
    ["2026.09.19", "参加简历工作坊", "产出一版可投递简历"],
    ["2026.10.08", "参与可持续创新挑战赛", "形成团队项目方案与路演材料"],
  ];
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
    [open, setOpen] = useState("岗位类别"),
    [selected, setSelected] = useState<Job | null>(null),
    [company, setCompany] = useState<string | null>(null);
  const shown = useMemo(
    () =>
      allJobs.filter(
        (j) =>
          (category === "全部类别" || j.jobCategory === category) &&
          (degree === "全部学历" || j.degree === degree) &&
          (industry === "全部行业" || j.industry === industry) &&
          Number(j.salaryMax || 500) >= salaryMin &&
          Number(j.salaryMin || 0) <= salaryMax &&
          (j.company + j.title + j.jobCategory + j.tags.join(""))
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [allJobs, q, category, degree, industry, salaryMin, salaryMax],
  );
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
      <div className="result-count">{shown.length} 个机会</div>
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
        <button className="dialog-close" onClick={onClose}>
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
        <button className="dialog-close" onClick={onClose}>
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
}: {
  custom: Activity[];
  flash: (s: string) => void;
}) {
  const list = [...custom, ...activities].sort(
    (a, b) =>
      Number((b as unknown as { sortOrder?: number }).sortOrder || 0) -
        Number((a as unknown as { sortOrder?: number }).sortOrder || 0) ||
      String(b.date).localeCompare(String(a.date)),
  );
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]),
    [selected, setSelected] = useState<Activity | null>(null),
    [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    api("/api/registrations")
      .then((r) => r.json())
      .then((data) => setRegistrations(data.registrations || []));
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
    setSelected(null);
    flash("报名已提交，正在等待企业确认");
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
  const activeRegistration = active ? existing(active.id) : undefined;
  return (
    <>
      <Title eyebrow="ACTIVITIES" title="成长活动" desc="" />
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
              onClick={() => setSelected(active)}
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
                onClick={() => setSelected(activity)}
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
          onClose={() => setSelected(null)}
          onSubmit={(answers) => submitted(selected, answers)}
        />
      )}
    </>
  );
}

function ActivityRegistrationDialog({
  activity,
  previous,
  onClose,
  onSubmit,
}: {
  activity: Activity;
  previous?: Record<string, string>;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => Promise<void>;
}) {
  const fields = activity.registrationFields?.length
    ? activity.registrationFields
    : ([
        { id: "name", label: "姓名", type: "text", required: true },
        { id: "phone", label: "联系电话", type: "tel", required: true },
        { id: "school", label: "学校与专业", type: "text", required: true },
      ] as RegistrationField[]);
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
      >
        <button className="dialog-close" onClick={onClose}>
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
              <button className="outline-btn" onClick={onClose}>
                取消
              </button>
              <button
                className="primary-btn"
                disabled={saving}
                onClick={submit}
              >
                {saving ? "正在保存…" : previous ? "保存修改" : "确认报名"}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function LearningCenter({ custom }: { custom: ContentItem[] }) {
  const list = [...custom, ...contents].sort(
    (a, b) =>
      Number((b as unknown as { sortOrder?: number }).sortOrder || 0) -
      Number((a as unknown as { sortOrder?: number }).sortOrder || 0),
  );
  const [selected, setSelected] = useState<ContentItem | null>(null),
    [category, setCategory] = useState("全部内容"),
    [liked, setLiked] = useState<Record<string, boolean>>({}),
    [comments, setComments] = useState<
      Record<
        string,
        { id: string; author: string; text: string; reply?: string }[]
      >
    >({}),
    [draft, setDraft] = useState("");
  const shown = list.filter(
    (c) => category === "全部内容" || c.category === category,
  );
  const addComment = () => {
    if (!selected || !draft.trim()) return;
    setComments((v) => ({
      ...v,
      [selected.id]: [
        ...(v[selected.id] || []),
        {
          id: crypto.randomUUID(),
          author: "学生",
          text: draft.trim(),
          reply: "",
        },
      ],
    }));
    setDraft("");
  };
  const reply = (id: string) => {
    if (!selected) return;
    setComments((v) => ({
      ...v,
      [selected.id]: (v[selected.id] || []).map((c) =>
        c.id === id
          ? { ...c, reply: "发布方已收到，会在后续内容中补充回应。" }
          : c,
      ),
    }));
  };
  const removeComment = (id: string) => {
    if (!selected) return;
    setComments((v) => ({
      ...v,
      [selected.id]: (v[selected.id] || []).filter((c) => c.id !== id),
    }));
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
            <button onClick={() => setSelected(c)}>打开内容 →</button>
          </article>
        ))}
      </div>
      {selected && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <section className="dialog reader rich-reader">
            <button className="dialog-close" onClick={() => setSelected(null)}>
              ×
            </button>
            <ContentRenderer item={selected} />
            <div className="content-social">
              <button
                className={liked[selected.id] ? "active" : ""}
                onClick={() =>
                  setLiked((v) => ({ ...v, [selected.id]: !v[selected.id] }))
                }
              >
                ♥ {liked[selected.id] ? "已点赞" : "点赞"}
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
              <button className="primary-btn" onClick={addComment}>
                发布评论
              </button>
              {(comments[selected.id] || []).map((c) => (
                <div className="comment-item" key={c.id}>
                  <b>{c.author}</b>
                  <p>{c.text}</p>
                  {c.reply && <em>{c.reply}</em>}
                  <span>
                    <button onClick={() => reply(c.id)}>发布方回复</button>
                    <button onClick={() => removeComment(c.id)}>删除</button>
                  </span>
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
    timelineItems: String(
      initial.timelineItems ||
        "2026.10.08｜学生项目｜校园可持续议题调研｜完成访谈、问卷整理与问题定义。｜形成项目报告、路演页和行动建议。",
    ),
  });
  const [editing, setEditing] = useState(true),
    [notice, setNotice] = useState(""),
    [active, setActive] = useState("tl-1"),
    [registrations, setRegistrations] = useState<RegistrationItem[]>([]),
    [draft, setDraft] = useState({
      date: "",
      title: "",
      action: "",
      output: "",
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
      update("resumeName", result.name);
      setNotice(
        "简历已上传。企业看到的是你整理后的成长主页，可按需查看完整简历。",
      );
    }
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
  const addTimelineItem = () => {
    if (!draft.title.trim()) return;
    const line = `${draft.date || new Date().toLocaleDateString("zh-CN").replaceAll("/", ".")}｜学生项目｜${draft.title.trim()}｜${draft.action.trim() || "补充项目过程与承担工作。"}｜${draft.output.trim() || "补充项目成果或作品链接。"}`;
    const next = form.timelineItems
      ? [form.timelineItems, line].join("\n")
      : line;
    update("timelineItems", next);
    setDraft({ date: "", title: "", action: "", output: "" });
    setActive(`manual-${manual.length}`);
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
                onClick={() =>
                  setNotice(
                    form.resumeName
                      ? `完整简历：${form.resumeName}`
                      : "请先上传完整简历",
                  )
                }
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
            <label className="full">
              成长时间轴原始记录（每行：日期｜类型｜标题｜做了什么｜产出）
              <textarea
                value={form.timelineItems}
                onChange={(e) => update("timelineItems", e.target.value)}
                disabled={!editing}
                rows={4}
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
    return (
      <>
        <Title
          eyebrow="HUNAN ENTERPRISE WORKSPACE"
          title="湖南企业发布，JA 审核后公开。"
          desc="企业先把实习 / 项目机会、活动和内容提交到 JA 后台；JA 通过后按分类和排序进入学生端。"
        />
        <div className="review-journey">
          <span className="done">
            <b>1</b>企业填写并提交
          </span>
          <i>→</i>
          <span>
            <b>2</b>JA 分类、排序与审核
          </span>
          <i>→</i>
          <span>
            <b>3</b>学生端公开并沉淀成长
          </span>
        </div>
        <div className="metrics">
          <Metric
            label="我的机会"
            value={String(positions.length)}
            note="实习 / 项目均可发布"
          />
          <Metric
            label="待 JA 审核"
            value={String(
              records.filter((r) => r.payload.reviewStatus === "pending")
                .length,
            )}
            note="提交后暂不公开"
            tone="yellow"
          />
          <Metric
            label="审核通过"
            value={String(
              records.filter((r) => r.payload.reviewStatus === "approved")
                .length,
            )}
            note="已进入学生端"
            tone="lime"
          />
          <Metric
            label="企业贡献分"
            value={String(68 + records.length * 4)}
            note="由发布、反馈和录用回传组成"
            tone="blue"
          />
        </div>
        <section className="enterprise-hero">
          <div>
            <small>HUNAN PILOT</small>
            <h2>发布活动，也形成企业贡献画像</h2>
            <p>
              活动发布、学生报名、审核通过和录用反馈都会沉淀到企业主页，展示企业商誉与社会责任。
            </p>
            <button onClick={() => setTab("activities")}>发布成长活动 →</button>
          </div>
          <img src="/media/ja-student-company.jpg" alt="湖南青年成长活动" />
        </section>
        <EnterpriseContribution records={records} />
      </>
    );
  if (tab === "positions")
    return (
      <EnterprisePublisher
        kind="job"
        title="湖南实习 / 项目机会发布"
        desc="面向湖南区域；请重点选择类别并完整填写邮箱、职责和能力要求。"
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
        title="湖南成长活动发布"
        desc="上传封面，明确报名所需字段，提交后由 JA 后台审核。"
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
        title="成长内容发布"
        desc="支持技能成长、活动分享和企业曝光，审核通过后进入学生端。"
        records={records.filter((r) => r.kind === "content")}
        save={save}
        remove={remove}
        upload={upload}
        flash={flash}
      />
    );
  if (tab === "registrations") return <EnterpriseRegistrations />;
  return (
    <EnterpriseProfile
      record={records.find((r) => r.kind === "enterprise-profile")}
      save={save}
      upload={upload}
    />
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
    [notice, setNotice] = useState("");
  const load = () => {
    setLoading(true);
    api("/api/registrations?scope=publisher")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.registrations || []);
        setLoading(false);
      });
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
      });
    return () => {
      active = false;
    };
  }, []);
  const decide = async (
    item: RegistrationItem,
    decision: "approved" | "rejected",
    note: string,
  ) => {
    const response = await api("/api/registrations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registrationId: item.id, decision, note }),
    });
    const data = await response.json();
    if (!response.ok) {
      setNotice(data.error || "审核失败");
      return;
    }
    setNotice(
      decision === "approved"
        ? `已通过 ${item.answers.name || "该学生"} 的报名`
        : `已退回 ${item.answers.name || "该学生"} 的报名`,
    );
    setSelected(null);
    load();
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
    ).sort((a, b) => b[1] - a[1]);
  const exportCsv = () => {
    if (!items.length) {
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
    const rows = items.map((item) =>
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
    setNotice("报名表已导出，可用 Excel 打开");
  };
  return (
    <>
      <Title
        eyebrow="REGISTRATION DATA"
        title="活动报名审核"
        desc="测试阶段显示全部活动报名，方便企业和项目团队联调审核；正式账号启用后再按企业权限收拢。"
        action={
          <div className="registration-toolbar">
            <button className="outline-btn" onClick={load}>
              刷新数据
            </button>
            <button className="primary-btn" onClick={exportCsv}>
              导出报名表
            </button>
          </div>
        }
      />
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
      {loading ? (
        <div className="admin-empty">正在读取报名数据…</div>
      ) : items.length === 0 ? (
        <div className="empty-publisher">
          <b>☷</b>
          <h2>还没有学生报名</h2>
          <p>
            学生完成任一活动报名表后，会出现在这里供企业或项目团队测试审核。
          </p>
        </div>
      ) : (
        <div className="registration-table enterprise-registration-table">
          <div className="registration-row head">
            <b>活动</b>
            <b>学生</b>
            <b>联系电话</b>
            <b>报名状态</b>
            <b>审核</b>
          </div>
          {items.map((item) => (
            <div className="registration-row" key={item.id}>
              <strong>{item.activityTitle}</strong>
              <span>{item.answers.name || "未填写"}</span>
              <span>{item.answers.phone || "未填写"}</span>
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
        <button className="dialog-close" onClick={onClose}>
          ×
        </button>
        <small>REGISTRATION REVIEW</small>
        <h1>{item.activityTitle}</h1>
        <div>
          {Object.entries(item.answers).map(([key, value]) => (
            <p key={key}>
              <b>{registrationLabel(key)}</b>
              <span>{value || "未填写"}</span>
            </p>
          ))}
        </div>
        <small>
          提交时间：{new Date(item.createdAt).toLocaleString("zh-CN")}
        </small>
        {pending && onDecision ? (
          <>
            <label className="registration-review-note">
              企业审核意见
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="通过时可填写提醒；退回时必须说明原因"
              />
            </label>
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
          </>
        ) : (
          <p className={`registration-result ${item.status}`}>
            <b>{item.status === "approved" ? "报名已通过" : "报名已退回"}</b>
            {item.reviewNote && <span>{item.reviewNote}</span>}
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
    [status, setStatus] = useState("全部状态");
  const start = (r?: StoredRecord) => {
    setEdit(r);
    setOpen(true);
  };
  const sorted = records
    .filter(
      (r) =>
        status === "全部状态" ||
        String(r.payload.reviewStatus || "pending") === status,
    )
    .sort(
      (a, b) =>
        Number(b.payload.sortOrder || 0) - Number(a.payload.sortOrder || 0) ||
        String(b.updatedAt).localeCompare(String(a.updatedAt)),
    );
  return (
    <>
      <Title
        eyebrow="PUBLISHING CENTER"
        title={title}
        desc={desc}
        action={
          <button className="primary-btn" onClick={() => start()}>
            ＋ 新建
            {kind === "job" ? "机会" : kind === "activity" ? "活动" : "内容"}
          </button>
        }
      />
      <div className="publisher-toolbar">
        <span>按 JA 排序数字优先展示</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已退回</option>
        </select>
      </div>
      {records.length === 0 ? (
        <div className="empty-publisher">
          <b>{kind === "job" ? "▣" : kind === "activity" ? "◇" : "▱"}</b>
          <h2>还没有提交内容</h2>
          <p>提交后先进入 JA 后台审核，不会立即出现在学生端。</p>
          <button onClick={() => start()}>开始创建</button>
        </div>
      ) : (
        <div className="published-list">
          {sorted.map((r) => {
            const statusText =
              r.payload.reviewStatus === "approved"
                ? "已通过"
                : r.payload.reviewStatus === "rejected"
                  ? "已退回"
                  : "等待 JA 审核";
            return (
              <article
                key={r.id}
                className={`review-${String(r.payload.reviewStatus || "pending")}`}
              >
                {r.payload.cover ? (
                  r.payload.coverType === "video" ? (
                    <video src={String(r.payload.cover)} muted />
                  ) : (
                    <img src={String(r.payload.cover)} alt="" />
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
                      : `${String(r.payload.category || "成长内容")} · 排序 ${String(r.payload.sortOrder || 0)}`}
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
                    : "编辑"}
                </button>
                <button className="danger-link" onClick={() => remove(r.id)}>
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
    company: String(old.company || ""),
    summary: String(old.summary || ""),
    email: String(old.contactEmail || ""),
    city: String(old.city || "长沙"),
    category: String(old.jobCategory || old.category || "产品运营"),
    duration: String(old.duration || ""),
    date: String(old.date || ""),
    capacity: String(old.capacity || "100"),
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
  const [saving, setSaving] = useState(false),
    [step, setStep] = useState(kind === "activity" ? "基础信息" : "内容编辑"),
    [autosave, setAutosave] = useState("草稿已准备"),
    [blocks, setBlocks] = useState<RichBlock[]>(
      (old.bodyBlocks as RichBlock[] | undefined) ||
        starterBlocks[kind === "activity" ? "activity" : "content"],
    ),
    [abilities, setAbilities] = useState<string[]>(
      (old.abilityTags as string[] | undefined) || ["表达沟通", "行业认知"],
    );
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setAutosave(
          `✓ 草稿已自动保存 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
        ),
      700,
    );
    return () => window.clearTimeout(timer);
  }, [form, blocks, selectedFields, customQuestions, abilities]);
  const change = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));
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
  const submit = async () => {
    if (
      !form.title ||
      !form.summary ||
      (kind === "job" && (!form.company || !/^\S+@\S+\.\S+$/.test(form.email)))
    )
      return;
    setSaving(true);
    const base = {
      id: record?.id || crypto.randomUUID(),
      title: form.title,
      summary: form.summary,
      cover: form.cover || "/media/ja-career-fair.jpg",
      coverType: form.coverType,
      region: "湖南",
      sortOrder: Number(form.sortOrder) || 0,
      featured: form.featured,
      reviewStatus: "pending",
      reviewNote: "",
      submittedAt: new Date().toISOString(),
      bodyBlocks: blocks,
      attachments: form.attachments
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      plainText: [
        form.title,
        form.summary,
        ...blocks.map((block) => `${block.title || ""} ${block.text || ""}`),
      ].join("\n"),
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
    const payload =
      kind === "job"
        ? {
            ...base,
            company: form.company,
            contactEmail: form.email,
            city: form.city || "长沙",
            jobCategory: form.category,
            mode: "线下/混合办公",
            duration: form.duration || "待定",
            tags: [form.category, "湖南企业", "企业发布"],
            status: "审核中",
            logo: form.company.slice(0, 2),
            color: "#00a0af",
            responsibilities: form.responsibilities.split("\n").filter(Boolean),
            requirements: form.requirements.split("\n").filter(Boolean),
            benefits: ["企业导师", "真实项目"],
            publishedAt: new Date().toLocaleDateString("zh-CN"),
          }
        : kind === "activity"
          ? {
              ...base,
              date: form.date || "待定",
              place: form.city || "湖南",
              category: form.category || "企业活动",
              capacity: Number(form.capacity) || 100,
              registered: 0,
              status: "审核中",
              registrationFields,
              agenda: form.agenda
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean),
              abilityTags: abilities,
              publisher: form.company || "湖南企业",
            }
          : {
              ...base,
              category: form.category || "企业曝光",
              duration: form.duration || "10 分钟",
              level: "入门",
              mediaType: form.mediaType,
              tags: abilities,
              publisher: form.company || "湖南企业",
            };
    await save(kind, payload, record?.id);
    setSaving(false);
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
    registrationFields: [
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
    ],
  };
  const steps =
    kind === "activity"
      ? ["基础信息", "活动详情", "报名设置", "成长设计", "预览"]
      : ["内容编辑", "媒体排版", "预览"];
  return (
    <div className="dialog-backdrop">
      <section className="dialog publisher-dialog studio-dialog">
        <button className="dialog-close" onClick={onClose}>
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
          <span className="active">1 发布方编辑</span>
          <i>→</i>
          <span>2 JA 审核与排序</span>
          <i>→</i>
          <span>3 学生端公开展示</span>
        </div>
        <nav className="studio-steps">
          {steps.map((name) => (
            <button
              key={name}
              className={step === name ? "active" : ""}
              onClick={() => setStep(name)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="studio-grid">
          <div className="studio-main">
            <div className="publisher-fields">
              {(step === "基础信息" || step === "内容编辑") && (
                <>
                  {kind === "job" && (
                    <>
                      <label>
                        湖南企业名称
                        <input
                          value={form.company}
                          onChange={(e) => change("company", e.target.value)}
                          placeholder="例如：湖南本地企业"
                        />
                      </label>
                      <label>
                        简历接收邮箱
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => change("email", e.target.value)}
                          placeholder="hr@example.com"
                        />
                      </label>
                      <label>
                        机会类别
                        <select
                          value={form.category}
                          onChange={(e) => change("category", e.target.value)}
                        >
                          {jobCategories.slice(1).map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  {kind !== "job" && (
                    <label>
                      分类
                      <select
                        value={form.category}
                        onChange={(e) => change("category", e.target.value)}
                      >
                        {contentCategories.slice(1).map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    标题
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
                    />
                  </label>
                  <label>
                    {kind === "job" ? "所在城市" : "地点/场景"}
                    <input
                      value={form.city}
                      onChange={(e) => change("city", e.target.value)}
                    />
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
                    <span>建议首页推荐</span>
                  </label>
                  <label className="full">
                    摘要
                    <textarea
                      rows={3}
                      value={form.summary}
                      onChange={(e) => change("summary", e.target.value)}
                      placeholder="一句话讲清楚价值，学生端会优先展示"
                    />
                  </label>
                  <label className="media-upload full">
                    封面图片或视频
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      onChange={(e) => media(e.target.files?.[0])}
                    />
                    <span>
                      {form.cover
                        ? `✓ ${form.coverType === "video" ? "视频" : "图片"}已上传`
                        : "选择封面素材"}
                    </span>
                  </label>
                  {kind === "activity" && (
                    <>
                      <label>
                        活动日期
                        <input
                          type="date"
                          value={form.date}
                          onChange={(e) => change("date", e.target.value)}
                        />
                      </label>
                      <label>
                        报名人数上限
                        <input
                          type="number"
                          min="1"
                          value={form.capacity}
                          onChange={(e) => change("capacity", e.target.value)}
                        />
                      </label>
                    </>
                  )}
                  {kind === "content" && (
                    <>
                      <label>
                        阅读/观看时长
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
                          <option value="video">视频内容</option>
                        </select>
                      </label>
                    </>
                  )}
                  {kind === "job" && (
                    <>
                      <label className="full">
                        职责 / 项目说明（每行一条）
                        <textarea
                          rows={4}
                          value={form.responsibilities}
                          onChange={(e) =>
                            change("responsibilities", e.target.value)
                          }
                        />
                      </label>
                      <label className="full">
                        能力要求（每行一条）
                        <textarea
                          rows={4}
                          value={form.requirements}
                          onChange={(e) =>
                            change("requirements", e.target.value)
                          }
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {(step === "活动详情" || step === "媒体排版") && (
                <ContentBlockEditor
                  blocks={blocks}
                  setBlocks={setBlocks}
                  upload={upload}
                />
              )}{" "}
              {step === "报名设置" && (
                <fieldset className="registration-config full">
                  <legend>学生报名需要填写什么信息？</legend>
                  <p>勾选后，学生点击报名会进入对应的信息填写页面。</p>
                  <div>
                    {registrationOptions.map((field) => (
                      <label key={field.id}>
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.id)}
                          onChange={() =>
                            setSelectedFields((v) =>
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
                    其他自定义问题（每行一个）
                    <textarea
                      rows={3}
                      value={customQuestions}
                      onChange={(e) => setCustomQuestions(e.target.value)}
                      placeholder="例如：你为什么想参加本次活动？"
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
                      placeholder="09:00-09:30 签到&#10;09:30-11:00 企业参访"
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
              {step === "预览" && <ContentRenderer item={preview} />}
              <label className="full">
                附件链接 / 资料包（每行一个，可选）
                <textarea
                  rows={2}
                  value={form.attachments}
                  onChange={(e) => change("attachments", e.target.value)}
                  placeholder="PDF、PPT 或外部作品链接"
                />
              </label>
            </div>
          </div>
          <aside className="studio-preview">
            <b>实时展示预览</b>
            <ContentRenderer item={preview} />
          </aside>
        </div>
        <div className="dialog-actions">
          <button className="outline-btn" onClick={onClose}>
            取消
          </button>
          <button className="primary-btn" disabled={saving} onClick={submit}>
            {saving ? "正在提交…" : "提交 JA 审核"}
          </button>
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
    industry: String(old.industry || "湖南优势产业"),
    city: String(old.city || "长沙"),
    intro: String(
      old.intro ||
        "立足湖南，为青年提供真实、开放且有导师支持的实习、项目与成长活动。",
    ),
    website: String(old.website || "https://example.com"),
    logo: String(old.logo || "/og.png"),
  });
  const change = (k: string, v: string) => setForm((x) => ({ ...x, [k]: v }));
  const logo = async (file?: File) => {
    if (!file) return;
    const r = await upload(file);
    if (r?.url) change("logo", r.url);
  };
  return (
    <>
      <Title
        eyebrow="HUNAN COMPANY PROFILE"
        title="企业贡献画像"
        desc="企业 Logo、介绍、所在城市和社会责任画像会与审核通过的机会一起展示。"
        action={
          <button
            className="primary-btn"
            onClick={() =>
              save(
                "enterprise-profile",
                { ...form, region: "湖南" },
                record?.id,
              )
            }
          >
            保存企业资料
          </button>
        }
      />
      <div className="enterprise-profile-editor">
        <section>
          <img src={form.logo} alt={`${form.name} logo`} />
          <small>JA HUNAN VERIFIED ORGANIZATION</small>
          <h1>{form.name}</h1>
          <h2>{form.industry}</h2>
          <p>{form.intro}</p>
          <div className="company-credit-tags">
            <span>提供真实机会</span>
            <span>参与青年成长</span>
            <span>录用反馈待接入</span>
          </div>
          <a href={form.website} target="_blank" rel="noreferrer">
            访问企业官网 ↗
          </a>
        </section>
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            企业名称
            <input
              value={form.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </label>
          <label>
            所属行业
            <input
              value={form.industry}
              onChange={(e) => change("industry", e.target.value)}
            />
          </label>
          <label>
            所在城市
            <input
              value={form.city}
              onChange={(e) => change("city", e.target.value)}
            />
          </label>
          <label>
            企业简介
            <textarea
              rows={5}
              value={form.intro}
              onChange={(e) => change("intro", e.target.value)}
            />
          </label>
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
