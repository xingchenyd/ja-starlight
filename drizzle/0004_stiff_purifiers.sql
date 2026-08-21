PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`activity_title` text NOT NULL,
	`student_owner_id` text NOT NULL,
	`publisher_owner_id` text NOT NULL,
	`answers` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_activity_registrations`("id", "activity_id", "activity_title", "student_owner_id", "publisher_owner_id", "answers", "status", "review_note", "reviewed_at", "created_at") SELECT "id", "activity_id", "activity_title", "student_owner_id", "publisher_owner_id", "answers", "status", '', NULL, "created_at" FROM `activity_registrations`;--> statement-breakpoint
DROP TABLE `activity_registrations`;--> statement-breakpoint
ALTER TABLE `__new_activity_registrations` RENAME TO `activity_registrations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_registration_student_activity` ON `activity_registrations` (`student_owner_id`,`activity_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_registration_publisher` ON `activity_registrations` (`publisher_owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_registration_activity` ON `activity_registrations` (`activity_id`,`created_at`);
