import { activities, contents, jobs } from "../../app/data.ts";

export type FormalRecord = { id: string; kind: "job" | "activity" | "content"; owner: "enterprise" | "starlight"; payload: Record<string, unknown> };

export const formalRecords: FormalRecord[] = [
  ...jobs.slice(0, 12).map((item, index) => ({ id: `formal-${item.id}`, kind: "job" as const, owner: "enterprise" as const, payload: { ...item, id: `formal-${item.id}`, region: "湖南", city: item.city || "长沙", reviewStatus: "approved", status: "招募中", publishedAt: item.publishedAt || `2026-08-${String(30 - index).padStart(2, "0")}`, sortOrder: 120 - index } })),
  ...activities.map((item, index) => {
    const owner = index % 2 === 0 ? "starlight" as const : "enterprise" as const;
    const pending = index < 2;
    return { id: `formal-${item.id}`, kind: "activity" as const, owner, payload: { ...item, id: `formal-${item.id}`, region: "湖南", place: item.place || "长沙", publisher: owner === "starlight" ? "星光计划" : item.publisher, reviewStatus: pending ? "pending" : "approved", status: pending ? "审核中" : item.status, sortOrder: 80 - index } };
  }),
  ...contents.map((item, index) => {
    const owner = index % 3 === 0 ? "starlight" as const : "enterprise" as const;
    const pending = owner === "enterprise" && index < 3;
    return { id: `formal-${item.id}`, kind: "content" as const, owner, payload: { ...item, id: `formal-${item.id}`, region: "湖南", publisher: owner === "starlight" ? "星光计划" : item.publisher, reviewStatus: pending ? "pending" : "approved", status: pending ? "审核中" : "已发布", publishedAt: `2026-08-${String(28 - index).padStart(2, "0")}`, sortOrder: 60 - index } };
  }),
];

const students = [
  ["张晨", "湖南大学", "工商管理", "2027届"], ["李若溪", "中南大学", "计算机科学与技术", "2027届"],
  ["周子涵", "湖南师范大学", "新闻传播学", "2026届"], ["陈思远", "长沙理工大学", "数据科学", "2027届"],
  ["王嘉宁", "湖南工商大学", "市场营销", "2026届"], ["刘宇航", "湖南农业大学", "电子商务", "2027届"],
  ["赵可欣", "中南林业科技大学", "视觉传达", "2026届"], ["唐浩然", "湖南工业职业技术学院", "智能制造", "2027届"],
];
const statuses = ["pending", "approved", "approved", "rejected", "waitlisted", "approved", "cancelled", "pending"];
const activityRecords = formalRecords.filter((item) => item.kind === "activity");

export const formalRegistrations = Array.from({ length: 15 }, (_, index) => {
  const student = students[index % students.length], activity = activityRecords[index % activityRecords.length];
  return {
    id: `formal-registration-${String(index + 1).padStart(2, "0")}`, activityId: activity.id, activityTitle: String(activity.payload.title),
    studentSlug: index === 0 ? "primary" : `student-${index + 1}`, publisher: activity.owner,
    status: statuses[index % statuses.length], attendanceStatus: index % 4 === 1 ? "attended" : "unconfirmed",
    answers: { name: student[0], phone: `138${String(10000000 + index * 7919).slice(-8)}`, email: `student${index + 1}@example.edu.cn`, school: `${student[1]} · ${student[2]} · ${student[3]}`, expectation: index % 2 ? "希望了解真实岗位协作方式，并完成一份可以持续改进的实践成果。" : "希望通过企业现场任务提升沟通、调研和项目复盘能力。" },
    reviewNote: statuses[index % statuses.length] === "approved" ? "报名信息完整，已确认参加资格。" : statuses[index % statuses.length] === "rejected" ? "本场次名额与专业方向暂不匹配，建议关注后续活动。" : "",
  };
});

export const formalStudentProfile = { name: "张晨", school: "湖南大学", major: "工商管理", grade: "2027届", headline: "关注产品运营、公益实践与青年发展", bio: "擅长把复杂问题整理为清晰行动方案，期待在真实项目中持续学习、协作和复盘。", skills: "内容策划,用户研究,项目协作,数据整理", awards: "星光计划职业探索工作坊优秀成果；校级创新挑战赛入围", phone: "13800001234", email: "student1@example.edu.cn", resumeName: "张晨_个人简历.pdf", resumeKey: "", resumeType: "application/pdf", resumeSize: 0 };

export const formalExperiences = [
  { id: "formal-experience-01", sourceType: "platform", sourceId: "formal-act-03", category: "企业参访", title: "智能制造企业一日体验营", role: "项目调研组成员", description: "完成产线观察、岗位访谈和小组问题分析。", output: "企业观察报告与三分钟小组汇报", occurredAt: "2026-08-16", certified: 1, isPublic: 1, sortOrder: 5 },
  { id: "formal-experience-02", sourceType: "manual", sourceId: null, category: "校园项目", title: "校园可持续消费调研", role: "项目负责人", description: "组织六人小组完成问卷设计、访谈与数据整理。", output: "回收 326 份问卷并形成行动建议书", occurredAt: "2026-06-28", certified: 0, isPublic: 1, sortOrder: 4 },
  { id: "formal-experience-03", sourceType: "platform", sourceId: "formal-act-05", category: "主题工作坊", title: "职业表达与简历成果工作坊", role: "参与者", description: "围绕真实岗位需求重构个人经历表达。", output: "完成一版结构化简历与成长故事", occurredAt: "2026-05-18", certified: 1, isPublic: 1, sortOrder: 3 },
  { id: "formal-experience-04", sourceType: "manual", sourceId: null, category: "志愿实践", title: "社区青少年财经课堂", role: "课程志愿者", description: "协助完成课堂互动、学习材料整理和活动复盘。", output: "服务 42 名学生，形成课程改进清单", occurredAt: "2026-03-09", certified: 0, isPublic: 1, sortOrder: 2 },
];
