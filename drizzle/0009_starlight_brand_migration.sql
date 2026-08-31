CREATE TABLE IF NOT EXISTS `system_migrations` (
	`id` text PRIMARY KEY NOT NULL,
	`applied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
UPDATE `workspace_records`
SET `payload` = replace(replace(replace(`payload`, 'JA 星光计划', '星光计划'), 'JA China', '星光计划'), 'JA', '星光计划')
WHERE `payload` LIKE '%JA%';
--> statement-breakpoint
UPDATE `activity_registrations`
SET `activity_title` = replace(`activity_title`, 'JA', '星光计划'),
    `review_note` = replace(`review_note`, 'JA', '星光计划')
WHERE `activity_title` LIKE '%JA%' OR `review_note` LIKE '%JA%';
--> statement-breakpoint
UPDATE `student_experiences`
SET `title` = replace(`title`, 'JA', '星光计划'),
    `description` = replace(`description`, 'JA', '星光计划'),
    `output` = replace(`output`, 'JA', '星光计划')
WHERE `title` LIKE '%JA%' OR `description` LIKE '%JA%' OR `output` LIKE '%JA%';
--> statement-breakpoint
UPDATE `notifications`
SET `title` = replace(`title`, 'JA', '星光计划'),
    `body` = replace(`body`, 'JA', '星光计划')
WHERE `title` LIKE '%JA%' OR `body` LIKE '%JA%';
--> statement-breakpoint
INSERT OR IGNORE INTO `system_migrations` (`id`) VALUES ('brand-starlight-20260831');
--> statement-breakpoint
UPDATE `workspace_records`
SET `payload` = replace(replace(`payload`, '形成 星光计划', '形成星光计划'), '一段 星光计划', '一段星光计划')
WHERE `payload` LIKE '% 星光计划%';
--> statement-breakpoint
INSERT OR IGNORE INTO `system_migrations` (`id`) VALUES ('copy-spacing-20260831');
--> statement-breakpoint
PRAGMA optimize;
