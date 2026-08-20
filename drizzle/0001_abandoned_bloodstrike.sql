CREATE UNIQUE INDEX `idx_applications_user_job` ON `applications` (`user_id`,`job_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_user_created` ON `applications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_registrations_user_activity` ON `registrations` (`user_id`,`activity_id`);--> statement-breakpoint
CREATE INDEX `idx_registrations_user_created` ON `registrations` (`user_id`,`created_at`);