CREATE TABLE `site_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`scope` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_config_uuid_unique` ON `site_config` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `site_config_scope_unique` ON `site_config` (`scope`);--> statement-breakpoint
CREATE UNIQUE INDEX `site_config_uuid_idx` ON `site_config` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `site_config_scope_idx` ON `site_config` (`scope`);