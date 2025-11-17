CREATE TABLE `category_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_uuid` text NOT NULL,
	`locale` text NOT NULL,
	`metadata_title` text NOT NULL,
	`metadata_description` text NOT NULL,
	`content` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_translations_unique` ON `category_translations` (`category_uuid`,`locale`);--> statement-breakpoint
CREATE INDEX `category_translations_uuid_idx` ON `category_translations` (`category_uuid`);--> statement-breakpoint
CREATE INDEX `category_translations_locale_idx` ON `category_translations` (`locale`);--> statement-breakpoint
CREATE TABLE `featured_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`featured_uuid` text NOT NULL,
	`locale` text NOT NULL,
	`metadata_title` text NOT NULL,
	`metadata_description` text NOT NULL,
	`content` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `featured_translations_unique` ON `featured_translations` (`featured_uuid`,`locale`);--> statement-breakpoint
CREATE INDEX `featured_translations_uuid_idx` ON `featured_translations` (`featured_uuid`);--> statement-breakpoint
CREATE INDEX `featured_translations_locale_idx` ON `featured_translations` (`locale`);--> statement-breakpoint
CREATE TABLE `introduction_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_uuid` text NOT NULL,
	`locale` text NOT NULL,
	`metadata_title` text NOT NULL,
	`metadata_description` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `introduction_translations_unique` ON `introduction_translations` (`game_uuid`,`locale`);--> statement-breakpoint
CREATE INDEX `introduction_translations_uuid_idx` ON `introduction_translations` (`game_uuid`);--> statement-breakpoint
CREATE INDEX `introduction_translations_locale_idx` ON `introduction_translations` (`locale`);--> statement-breakpoint
CREATE TABLE `tag_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag_uuid` text NOT NULL,
	`locale` text NOT NULL,
	`metadata_title` text NOT NULL,
	`metadata_description` text NOT NULL,
	`content` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_translations_unique` ON `tag_translations` (`tag_uuid`,`locale`);--> statement-breakpoint
CREATE INDEX `tag_translations_uuid_idx` ON `tag_translations` (`tag_uuid`);--> statement-breakpoint
CREATE INDEX `tag_translations_locale_idx` ON `tag_translations` (`locale`);--> statement-breakpoint
CREATE TABLE `translation_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`language_code` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`progress` text DEFAULT '{"games":{"done":0,"total":0},"categories":{"done":0,"total":0},"tags":{"done":0,"total":0},"featured":{"done":0,"total":0}}',
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`started_at` integer,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translation_tasks_uuid_unique` ON `translation_tasks` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `translation_tasks_uuid_idx` ON `translation_tasks` (`uuid`);--> statement-breakpoint
CREATE INDEX `translation_tasks_language_code_idx` ON `translation_tasks` (`language_code`);--> statement-breakpoint
CREATE INDEX `translation_tasks_status_idx` ON `translation_tasks` (`status`);--> statement-breakpoint
ALTER TABLE `games` ADD `name_i18n` text DEFAULT '{}' NOT NULL;