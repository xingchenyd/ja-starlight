CREATE TABLE `student_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_snapshot` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_favorites_identity` ON `student_favorites` (`student_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_student_favorites_created` ON `student_favorites` (`student_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `student_calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`source_type` text DEFAULT 'activity' NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`start_at` text,
	`end_at` text,
	`reminder_at` text,
	`reminder_enabled` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_calendar_source` ON `student_calendar_events` (`student_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_student_calendar_upcoming` ON `student_calendar_events` (`student_id`,`status`,`start_at`);--> statement-breakpoint
CREATE TABLE `student_experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_id` text,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`output` text DEFAULT '' NOT NULL,
	`evidence_url` text DEFAULT '' NOT NULL,
	`evidence_asset_key` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`certified` integer DEFAULT 0 NOT NULL,
	`is_public` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_experiences_source` ON `student_experiences` (`student_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_student_experiences_timeline` ON `student_experiences` (`student_id`,`sort_order`,`occurred_at`);--> statement-breakpoint
PRAGMA optimize;
