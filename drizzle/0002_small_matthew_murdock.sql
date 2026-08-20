CREATE TABLE `workspace_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_owner_kind` ON `workspace_records` (`owner_id`,`kind`,`updated_at`);