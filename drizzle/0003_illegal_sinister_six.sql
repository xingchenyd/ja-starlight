CREATE TABLE `activity_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`activity_title` text NOT NULL,
	`student_owner_id` text NOT NULL,
	`publisher_owner_id` text NOT NULL,
	`answers` text NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_registration_student_activity` ON `activity_registrations` (`student_owner_id`,`activity_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_registration_publisher` ON `activity_registrations` (`publisher_owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_registration_activity` ON `activity_registrations` (`activity_id`,`created_at`);