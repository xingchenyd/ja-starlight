CREATE TABLE `content_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`reply_body` text DEFAULT '' NOT NULL,
	`replied_by` text DEFAULT '' NOT NULL,
	`replied_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_content_comments_content_created` ON `content_comments` (`content_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_content_comments_author` ON `content_comments` (`author_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_likes` (
	`content_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_likes_identity` ON `content_likes` (`content_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_content_likes_content` ON `content_likes` (`content_id`);--> statement-breakpoint
CREATE TABLE `file_access_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_file_access_actor_created` ON `file_access_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`purpose` text NOT NULL,
	`visibility` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`width` integer,
	`height` integer,
	`duration_seconds` integer,
	`archived_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_assets_storage_key` ON `media_assets` (`storage_key`);--> statement-breakpoint
CREATE INDEX `idx_media_assets_owner_created` ON `media_assets` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `moderation_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`handled_by` text,
	`handled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_moderation_reports_status` ON `moderation_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`target_url` text DEFAULT '' NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`,`read_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`credit_code` text DEFAULT '' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verified_by` text,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_organizations_owner` ON `organizations` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_organizations_verification` ON `organizations` (`verification_status`,`updated_at`);--> statement-breakpoint
ALTER TABLE `activity_registrations` ADD `updated_at` text;--> statement-breakpoint
UPDATE `activity_registrations` SET `updated_at`=CURRENT_TIMESTAMP WHERE `updated_at` IS NULL;--> statement-breakpoint
ALTER TABLE `activity_registrations` ADD `cancelled_at` text;--> statement-breakpoint
ALTER TABLE `activity_registrations` ADD `attendance_status` text DEFAULT 'unconfirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` text;--> statement-breakpoint
UPDATE `users` SET `updated_at`=CURRENT_TIMESTAMP WHERE `updated_at` IS NULL;--> statement-breakpoint
CREATE INDEX `idx_users_role_status` ON `users` (`role`,`status`);--> statement-breakpoint
ALTER TABLE `workspace_records` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_records` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `workspace_records` ADD `published_at` text;--> statement-breakpoint
CREATE INDEX `idx_workspace_public_kind` ON `workspace_records` (`kind`,`archived_at`,`updated_at`);--> statement-breakpoint
PRAGMA optimize;
