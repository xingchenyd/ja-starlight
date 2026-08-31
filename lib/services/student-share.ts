import { hashOpaqueToken } from "../auth/crypto.ts";

type Statement = { bind: (...values: unknown[]) => Statement; first: <T>() => Promise<T | null>; all: () => Promise<{ results: Record<string, unknown>[] }>; run: () => Promise<unknown> };
export type ShareDatabase = { prepare: (sql: string) => Statement; batch: (statements: Statement[]) => Promise<{ results: Record<string, unknown>[] }[]> };

export function normalizeShareDays(value: unknown) {
  const days = Number(value);
  return [7, 30, 90].includes(days) ? days : 30;
}

export function shareExpiresAt(days: unknown, now = new Date()) {
  return new Date(now.getTime() + normalizeShareDays(days) * 86_400_000).toISOString();
}

function text(value: unknown) { return String(value || "").trim(); }

export function sanitizePublicGrowthProfile(profile: Record<string, unknown>, experiences: Record<string, unknown>[]) {
  return {
    profile: {
      name: text(profile.name) || "星光计划学生",
      school: text(profile.school), major: text(profile.major), grade: text(profile.grade),
      headline: text(profile.headline), bio: text(profile.bio), skills: text(profile.skills), awards: text(profile.awards),
    },
    experiences: experiences.filter((item) => Boolean(item.isPublic)).map((item) => ({
      id: text(item.id), sourceType: text(item.sourceType), category: text(item.category), title: text(item.title),
      role: text(item.role), description: text(item.description), output: text(item.output), evidenceUrl: text(item.evidenceUrl),
      occurredAt: text(item.occurredAt), certified: Boolean(item.certified), sortOrder: Number(item.sortOrder || 0),
    })),
  };
}

export function buildApplicationMailBody(position: string, shareUrl: string) {
  return `您好，我希望申请贵公司的「${position}」岗位。\n\n我的公开成长档案：${shareUrl}\n档案中包含项目经历、星光计划认证活动与成果。\n\n请查收随邮件附上的 PDF 简历，谢谢。`;
}

export async function getPublicGrowthProfile(db: ShareDatabase, token: string, pepper: string) {
  const [shareId, secret, extra] = token.split(".");
  if (extra || !/^[0-9a-f-]{36}$/i.test(shareId || "") || !/^[A-Za-z0-9_-]{24,}$/.test(secret || "")) return null;
  const secretHash = await hashOpaqueToken(secret, pepper);
  const share = await db.prepare("SELECT id,student_id AS studentId,expires_at AS expiresAt FROM student_profile_shares WHERE id=? AND token_hash=? AND status='active' AND expires_at>CURRENT_TIMESTAMP LIMIT 1").bind(shareId, secretHash).first<{ id: string; studentId: string; expiresAt: string }>();
  if (!share) return null;
  const [profiles, experiences] = await db.batch([
    db.prepare("SELECT payload FROM workspace_records WHERE owner_id=? AND kind='student-profile' AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 1").bind(share.studentId),
    db.prepare("SELECT id,source_type AS sourceType,category,title,role,description,output,evidence_url AS evidenceUrl,occurred_at AS occurredAt,certified,is_public AS isPublic,sort_order AS sortOrder FROM student_experiences WHERE student_id=? AND is_public=1 ORDER BY sort_order DESC,occurred_at DESC").bind(share.studentId),
  ]);
  let profile: Record<string, unknown> = {};
  try { profile = JSON.parse(String(profiles.results[0]?.payload || "{}")); } catch { profile = {}; }
  return { ...sanitizePublicGrowthProfile(profile, experiences.results), expiresAt: share.expiresAt };
}
