import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), name: text("name").notNull(),
  role: text("role", { enum: ["student", "enterprise", "admin"] }).notNull().default("student"),
  status: text("status").notNull().default("active"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_workspace_owner_kind").on(table.ownerId, table.kind, table.updatedAt)]);

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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_activity_registration_student_activity").on(table.studentOwnerId, table.activityId),
  index("idx_activity_registration_publisher").on(table.publisherOwnerId, table.createdAt),
  index("idx_activity_registration_activity").on(table.activityId, table.createdAt),
]);
