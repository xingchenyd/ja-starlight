import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), name: text("name").notNull(),
  role: text("role", { enum: ["student", "enterprise", "admin"] }).notNull().default("student"),
  status: text("status").notNull().default("active"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_users_role_status").on(table.role, table.status)]);

export const passwordCredentials = sqliteTable("password_credentials", {
  userId: text("user_id").primaryKey(), algorithm: text("algorithm").notNull(), version: integer("version").notNull(),
  iterations: integer("iterations").notNull(), salt: text("salt").notNull(), passwordHash: text("password_hash").notNull(),
  passwordChangedAt: text("password_changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(), subjectType: text("subject_type").notNull(), subjectId: text("subject_id").notNull(), tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(), lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`), revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_auth_sessions_token").on(table.tokenHash), index("idx_auth_sessions_subject").on(table.subjectType, table.subjectId, table.expiresAt)]);
export const passwordResetChallenges = sqliteTable("password_reset_challenges", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), codeHash: text("code_hash").notNull(), proofHash: text("proof_hash"),
  expiresAt: text("expires_at").notNull(), attempts: integer("attempts").notNull().default(0), verifiedAt: text("verified_at"), consumedAt: text("consumed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_password_reset_user").on(table.userId, table.createdAt)]);
export const adminCredentials = sqliteTable("admin_credentials", {
  id: text("id").primaryKey(), label: text("label").notNull(), keyPrefix: text("key_prefix").notNull(), secretHash: text("secret_hash").notNull(),
  status: text("status").notNull().default("active"), lastUsedAt: text("last_used_at"), createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), revokedAt: text("revoked_at"),
}, (table) => [uniqueIndex("idx_admin_credentials_hash").on(table.secretHash)]);
export const authRateLimits = sqliteTable("auth_rate_limits", {
  scopeKey: text("scope_key").primaryKey(), attempts: integer("attempts").notNull().default(0), windowStartedAt: text("window_started_at").notNull(),
  blockedUntil: text("blocked_until"), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }), userId: text("user_id").notNull(),
  jobId: text("job_id").notNull(), status: text("status").notNull().default("submitted"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_applications_user_job").on(table.userId, table.jobId), index("idx_applications_user_created").on(table.userId, table.createdAt)]);
export const registrations = sqliteTable("registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }), userId: text("user_id").notNull(),
  activityId: text("activity_id").notNull(), status: text("status").notNull().default("registered"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_registrations_user_activity").on(table.userId, table.activityId), index("idx_registrations_user_created").on(table.userId, table.createdAt)]);
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }), actorId: text("actor_id").notNull(),
  action: text("action").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_created").on(table.createdAt), index("idx_audit_actor").on(table.actorId, table.createdAt)]);

export const workspaceRecords = sqliteTable("workspace_records", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  kind: text("kind").notNull(),
  payload: text("payload").notNull(),
  version: integer("version").notNull().default(1),
  archivedAt: text("archived_at"),
  publishedAt: text("published_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_workspace_owner_kind").on(table.ownerId, table.kind, table.updatedAt),
  index("idx_workspace_public_kind").on(table.kind, table.archivedAt, table.updatedAt),
]);

export const activityRegistrations = sqliteTable("activity_registrations", {
  id: text("id").primaryKey(),
  activityId: text("activity_id").notNull(),
  activityTitle: text("activity_title").notNull(),
  studentOwnerId: text("student_owner_id").notNull(),
  publisherOwnerId: text("publisher_owner_id").notNull(),
  answers: text("answers").notNull(),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note").notNull().default(""),
  reviewedAt: text("reviewed_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  cancelledAt: text("cancelled_at"),
  attendanceStatus: text("attendance_status").notNull().default("unconfirmed"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_activity_registration_student_activity").on(table.studentOwnerId, table.activityId),
  index("idx_activity_registration_publisher").on(table.publisherOwnerId, table.createdAt),
  index("idx_activity_registration_activity").on(table.activityId, table.createdAt),
]);

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), name: text("name").notNull(),
  creditCode: text("credit_code").notNull().default(""), verificationStatus: text("verification_status").notNull().default("pending"),
  verifiedBy: text("verified_by"), verifiedAt: text("verified_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_organizations_owner").on(table.ownerId), index("idx_organizations_verification").on(table.verificationStatus, table.updatedAt)]);

export const contentLikes = sqliteTable("content_likes", {
  contentId: text("content_id").notNull(), userId: text("user_id").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_content_likes_identity").on(table.contentId, table.userId), index("idx_content_likes_content").on(table.contentId)]);

export const contentComments = sqliteTable("content_comments", {
  id: text("id").primaryKey(), contentId: text("content_id").notNull(), authorId: text("author_id").notNull(), authorName: text("author_name").notNull(),
  body: text("body").notNull(), replyBody: text("reply_body").notNull().default(""), repliedBy: text("replied_by").notNull().default(""),
  repliedAt: text("replied_at"), status: text("status").notNull().default("active"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_content_comments_content_created").on(table.contentId, table.createdAt), index("idx_content_comments_author").on(table.authorId, table.createdAt)]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), type: text("type").notNull(), title: text("title").notNull(),
  body: text("body").notNull().default(""), targetUrl: text("target_url").notNull().default(""), readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_notifications_user_read").on(table.userId, table.readAt, table.createdAt)]);

export const studentFavorites = sqliteTable("student_favorites", {
  id: text("id").primaryKey(), studentId: text("student_id").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(),
  targetSnapshot: text("target_snapshot").notNull().default("{}"), status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_student_favorites_identity").on(table.studentId, table.targetType, table.targetId), index("idx_student_favorites_created").on(table.studentId, table.createdAt)]);

export const studentCalendarEvents = sqliteTable("student_calendar_events", {
  id: text("id").primaryKey(), studentId: text("student_id").notNull(), sourceType: text("source_type").notNull().default("activity"), sourceId: text("source_id").notNull(),
  title: text("title").notNull(), startAt: text("start_at"), endAt: text("end_at"), reminderAt: text("reminder_at"),
  reminderEnabled: integer("reminder_enabled").notNull().default(1), status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_student_calendar_source").on(table.studentId, table.sourceType, table.sourceId), index("idx_student_calendar_upcoming").on(table.studentId, table.status, table.startAt)]);

export const studentExperiences = sqliteTable("student_experiences", {
  id: text("id").primaryKey(), studentId: text("student_id").notNull(), sourceType: text("source_type").notNull().default("manual"), sourceId: text("source_id"),
  category: text("category").notNull(), title: text("title").notNull(), role: text("role").notNull().default(""), description: text("description").notNull().default(""),
  output: text("output").notNull().default(""), evidenceUrl: text("evidence_url").notNull().default(""), evidenceAssetKey: text("evidence_asset_key").notNull().default(""),
  occurredAt: text("occurred_at").notNull(), certified: integer("certified").notNull().default(0), isPublic: integer("is_public").notNull().default(1), sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_student_experiences_source").on(table.studentId, table.sourceType, table.sourceId), index("idx_student_experiences_timeline").on(table.studentId, table.sortOrder, table.occurredAt)]);

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), storageKey: text("storage_key").notNull(), originalName: text("original_name").notNull(),
  contentType: text("content_type").notNull(), size: integer("size").notNull(), purpose: text("purpose").notNull(), visibility: text("visibility").notNull(),
  status: text("status").notNull().default("ready"), width: integer("width"), height: integer("height"), durationSeconds: integer("duration_seconds"),
  archivedAt: text("archived_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_media_assets_storage_key").on(table.storageKey), index("idx_media_assets_owner_created").on(table.ownerId, table.createdAt)]);

export const fileAccessLogs = sqliteTable("file_access_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }), actorId: text("actor_id").notNull(), storageKey: text("storage_key").notNull(),
  action: text("action").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_file_access_actor_created").on(table.actorId, table.createdAt)]);

export const moderationReports = sqliteTable("moderation_reports", {
  id: text("id").primaryKey(), reporterId: text("reporter_id").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(),
  reason: text("reason").notNull(), status: text("status").notNull().default("open"), handledBy: text("handled_by"), handledAt: text("handled_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_moderation_reports_status").on(table.status, table.createdAt)]);
