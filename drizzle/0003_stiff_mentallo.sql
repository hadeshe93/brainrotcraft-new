CREATE TABLE `language_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`native_name` text NOT NULL,
	`chinese_name` text NOT NULL,
	`english_name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `language_config_code_unique` ON `language_config` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `language_config_code_idx` ON `language_config` (`code`);--> statement-breakpoint
CREATE INDEX `language_config_sort_idx` ON `language_config` (`sort_order`);--> statement-breakpoint
CREATE INDEX `language_config_enabled_idx` ON `language_config` (`enabled`);