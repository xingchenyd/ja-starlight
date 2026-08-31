CREATE TABLE `student_profile_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_profile_shares_token` ON `student_profile_shares` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_student_profile_shares_student_status` ON `student_profile_shares` (`student_id`,`status`,`created_at`);--> statement-breakpoint
PRAGMA optimize;
