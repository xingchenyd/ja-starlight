CREATE TABLE `admin_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`key_prefix` text NOT NULL,
	`secret_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_used_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admin_credentials_hash` ON `admin_credentials` (`secret_hash`);--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`scope_key` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`window_started_at` text NOT NULL,
	`blocked_until` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_auth_sessions_token` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_subject` ON `auth_sessions` (`subject_type`,`subject_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `password_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`algorithm` text NOT NULL,
	`version` integer NOT NULL,
	`iterations` integer NOT NULL,
	`salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_changed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `password_reset_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`proof_hash` text,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`verified_at` text,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_password_reset_user` ON `password_reset_challenges` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email_unique` ON `users` (lower(`email`));
--> statement-breakpoint
PRAGMA optimize;
