CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`icon_url` text,
	`metadata_title` text NOT NULL,
	`metadata_description` text NOT NULL,
	`content` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_uuid_unique` ON `categories` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_uuid_idx` ON `categories` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_idx` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `category_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_uuid` text NOT NULL,
	`locale` text NOT NULL,
	`name` text NOT NULL,
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
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`game_uuid` text NOT NULL,
	`user_uuid` text,
	`content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`anonymous_name` text,
	`anonymous_email` text,
	`source` text DEFAULT 'anonymous' NOT NULL,
	`ip_address` text,
	`is_ai_generated` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comments_uuid_unique` ON `comments` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `comments_uuid_idx` ON `comments` (`uuid`);--> statement-breakpoint
CREATE INDEX `comments_game_uuid_idx` ON `comments` (`game_uuid`);--> statement-breakpoint
CREATE INDEX `comments_user_uuid_idx` ON `comments` (`user_uuid`);--> statement-breakpoint
CREATE INDEX `comments_status_idx` ON `comments` (`status`);--> statement-breakpoint
CREATE INDEX `comments_source_idx` ON `comments` (`source`);--> statement-breakpoint
CREATE INDEX `comments_game_status_idx` ON `comments` (`game_uuid`,`status`);--> statement-breakpoint
CREATE INDEX `comments_created_idx` ON `comments` (`created_at`);--> statement-breakpoint
CREATE TABLE `featured` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`metadata_title` text NOT NULL,
	`metadata_description` text NOT NULL,
	`content` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `featured_uuid_unique` ON `featured` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `featured_slug_unique` ON `featured` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `featured_uuid_idx` ON `featured` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `featured_slug_idx` ON `featured` (`slug`);--> statement-breakpoint
CREATE INDEX `featured_name_idx` ON `featured` (`name`);--> statement-breakpoint
CREATE TABLE `featured_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`featured_uuid` text NOT NULL,
	`locale` text NOT NULL,
	`name` text NOT NULL,
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
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`name_i18n` text DEFAULT '{}' NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`thumbnail` text NOT NULL,
	`source` text NOT NULL,
	`interact` integer DEFAULT 0,
	`rating` real DEFAULT 0,
	`rating_count` integer DEFAULT 0,
	`upvote_count` integer DEFAULT 0,
	`downvote_count` integer DEFAULT 0,
	`save_count` integer DEFAULT 0,
	`share_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_uuid_unique` ON `games` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `games_slug_unique` ON `games` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `games_uuid_idx` ON `games` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `games_slug_idx` ON `games` (`slug`);--> statement-breakpoint
CREATE INDEX `games_status_idx` ON `games` (`status`);--> statement-breakpoint
CREATE INDEX `games_created_idx` ON `games` (`created_at`);--> statement-breakpoint
CREATE INDEX `games_rating_idx` ON `games` (`rating`);--> statement-breakpoint
CREATE INDEX `games_interact_idx` ON `games` (`interact`);--> statement-breakpoint
CREATE TABLE `games_to_categories` (
	`game_uuid` text NOT NULL,
	`category_uuid` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` integer DEFAULT 0,
	PRIMARY KEY(`game_uuid`, `category_uuid`)
);
--> statement-breakpoint
CREATE INDEX `games_to_categories_game_idx` ON `games_to_categories` (`game_uuid`);--> statement-breakpoint
CREATE INDEX `games_to_categories_category_idx` ON `games_to_categories` (`category_uuid`);--> statement-breakpoint
CREATE INDEX `games_to_categories_sort_idx` ON `games_to_categories` (`category_uuid`,`sort_order`);--> statement-breakpoint
CREATE TABLE `games_to_comments` (
	`game_uuid` text NOT NULL,
	`comment_uuid` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `games_to_comments_pk` ON `games_to_comments` (`game_uuid`,`comment_uuid`);--> statement-breakpoint
CREATE INDEX `games_to_comments_game_idx` ON `games_to_comments` (`game_uuid`);--> statement-breakpoint
CREATE INDEX `games_to_comments_comment_idx` ON `games_to_comments` (`comment_uuid`);--> statement-breakpoint
CREATE TABLE `games_to_featured` (
	`game_uuid` text NOT NULL,
	`featured_uuid` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` integer DEFAULT 0,
	PRIMARY KEY(`game_uuid`, `featured_uuid`)
);
--> statement-breakpoint
CREATE INDEX `games_to_featured_game_idx` ON `games_to_featured` (`game_uuid`);--> statement-breakpoint
CREATE INDEX `games_to_featured_featured_idx` ON `games_to_featured` (`featured_uuid`);--> statement-breakpoint
CREATE INDEX `games_to_featured_sort_idx` ON `games_to_featured` (`featured_uuid`,`sort_order`);--> statement-breakpoint
CREATE TABLE `games_to_tags` (
	`game_uuid` text NOT NULL,
	`tag_uuid` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` integer DEFAULT 0,
	PRIMARY KEY(`game_uuid`, `tag_uuid`)
);
--> statement-breakpoint
CREATE INDEX `games_to_tags_game_idx` ON `games_to_tags` (`game_uuid`);--> statement-breakpoint
CREATE INDEX `games_to_tags_tag_idx` ON `games_to_tags` (`tag_uuid`);--> statement-breakpoint
CREATE INDEX `games_to_tags_sort_idx` ON `games_to_tags` (`tag_uuid`,`sort_order`);--> statement-breakpoint
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
CREATE TABLE `introductions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`game_uuid` text NOT NULL,
	`metadata_title` text NOT NULL,
	`metadata_description` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `introductions_uuid_unique` ON `introductions` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `introductions_uuid_idx` ON `introductions` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `introductions_game_uuid_idx` ON `introductions` (`game_uuid`);--> statement-breakpoint
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
CREATE INDEX `language_config_enabled_idx` ON `language_config` (`enabled`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`order_number` text NOT NULL,
	`user_uuid` text NOT NULL,
	`order_amount` real NOT NULL,
	`order_currency` text DEFAULT 'USD' NOT NULL,
	`product_uuid` text NOT NULL,
	`product_name` text NOT NULL,
	`product_price_snapshot` real NOT NULL,
	`credits_amount_snapshot` integer NOT NULL,
	`payment_time` integer,
	`order_status` text NOT NULL,
	`payment_method` text,
	`payment_platform_order_id` text,
	`customer_id` text,
	`subscription_id` text,
	`subscription_cycle` text,
	`subscription_start_time` integer,
	`subscription_end_time` integer,
	`refund_amount` real DEFAULT 0,
	`refund_time` integer,
	`remarks` text,
	`order_created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`order_updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_uuid_unique` ON `orders` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_uuid_idx` ON `orders` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_idx` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `orders_user_uuid_idx` ON `orders` (`user_uuid`);--> statement-breakpoint
CREATE INDEX `orders_order_status_idx` ON `orders` (`order_status`);--> statement-breakpoint
CREATE INDEX `orders_payment_method_idx` ON `orders` (`payment_method`);--> statement-breakpoint
CREATE INDEX `orders_user_created_idx` ON `orders` (`user_uuid`,`order_created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`order_status`,`order_created_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`game_uuid` text NOT NULL,
	`user_uuid` text,
	`content` text NOT NULL,
	`report_type` text NOT NULL,
	`user_name` text NOT NULL,
	`user_email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_note` text,
	`processed_at` integer,
	`processed_by` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_uuid_unique` ON `reports` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `reports_uuid_idx` ON `reports` (`uuid`);--> statement-breakpoint
CREATE INDEX `reports_game_uuid_idx` ON `reports` (`game_uuid`);--> statement-breakpoint
CREATE INDEX `reports_user_uuid_idx` ON `reports` (`user_uuid`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE INDEX `reports_report_type_idx` ON `reports` (`report_type`);--> statement-breakpoint
CREATE INDEX `reports_created_idx` ON `reports` (`created_at`);--> statement-breakpoint
CREATE TABLE `tag_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag_uuid` text NOT NULL,
	`locale` text NOT NULL,
	`name` text NOT NULL,
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
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`metadata_title` text NOT NULL,
	`metadata_description` text NOT NULL,
	`content` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_uuid_unique` ON `tags` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_uuid_idx` ON `tags` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_idx` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `tags_name_idx` ON `tags` (`name`);--> statement-breakpoint
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
CREATE TABLE `user_credit_expense` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_uuid` text NOT NULL,
	`credits_amount` integer NOT NULL,
	`expense_type` text NOT NULL,
	`source_relation_uuid` text,
	`business_scenario` text,
	`remarks` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_credit_expense_uuid_unique` ON `user_credit_expense` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_credit_expense_uuid_idx` ON `user_credit_expense` (`uuid`);--> statement-breakpoint
CREATE INDEX `user_credit_expense_user_uuid_idx` ON `user_credit_expense` (`user_uuid`);--> statement-breakpoint
CREATE INDEX `user_credit_expense_expense_type_idx` ON `user_credit_expense` (`expense_type`);--> statement-breakpoint
CREATE INDEX `user_credit_expense_source_relation_idx` ON `user_credit_expense` (`source_relation_uuid`);--> statement-breakpoint
CREATE INDEX `user_credit_expense_user_created_idx` ON `user_credit_expense` (`user_uuid`,`created_at`);--> statement-breakpoint
CREATE INDEX `user_credit_expense_type_created_idx` ON `user_credit_expense` (`expense_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `user_credit_income` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_uuid` text NOT NULL,
	`credits_amount` integer NOT NULL,
	`income_type` text NOT NULL,
	`source_relation_uuid` text,
	`valid_start_time` integer NOT NULL,
	`valid_end_time` integer,
	`remarks` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_credit_income_uuid_unique` ON `user_credit_income` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_credit_income_uuid_idx` ON `user_credit_income` (`uuid`);--> statement-breakpoint
CREATE INDEX `user_credit_income_user_uuid_idx` ON `user_credit_income` (`user_uuid`);--> statement-breakpoint
CREATE INDEX `user_credit_income_income_type_idx` ON `user_credit_income` (`income_type`);--> statement-breakpoint
CREATE INDEX `user_credit_income_source_relation_idx` ON `user_credit_income` (`source_relation_uuid`);--> statement-breakpoint
CREATE INDEX `user_credit_income_user_created_idx` ON `user_credit_income` (`user_uuid`,`created_at`);--> statement-breakpoint
CREATE INDEX `user_credit_income_user_expire_idx` ON `user_credit_income` (`user_uuid`,`valid_end_time`);--> statement-breakpoint
CREATE INDEX `user_credit_income_type_created_idx` ON `user_credit_income` (`income_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `user_works` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_uuid` text NOT NULL,
	`work_type` text NOT NULL,
	`input_content` text NOT NULL,
	`input_image_url` text,
	`work_result` text NOT NULL,
	`generation_duration` integer,
	`credits_consumed` integer NOT NULL,
	`generation_status` text NOT NULL,
	`management_status` text DEFAULT 'active',
	`is_public` integer DEFAULT false,
	`likes_count` integer DEFAULT 0,
	`downloads_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_works_uuid_unique` ON `user_works` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_works_uuid_idx` ON `user_works` (`uuid`);--> statement-breakpoint
CREATE INDEX `user_works_user_uuid_idx` ON `user_works` (`user_uuid`);--> statement-breakpoint
CREATE INDEX `user_works_work_type_idx` ON `user_works` (`work_type`);--> statement-breakpoint
CREATE INDEX `user_works_generation_status_idx` ON `user_works` (`generation_status`);--> statement-breakpoint
CREATE INDEX `user_works_is_public_idx` ON `user_works` (`is_public`);--> statement-breakpoint
CREATE INDEX `user_works_user_created_idx` ON `user_works` (`user_uuid`,`created_at`);--> statement-breakpoint
CREATE INDEX `user_works_public_created_idx` ON `user_works` (`is_public`,`created_at`);--> statement-breakpoint
CREATE INDEX `user_works_type_created_idx` ON `user_works` (`work_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`nickname` text,
	`email` text NOT NULL,
	`avatar` text,
	`password` text,
	`account_provider` text,
	`provider_account_id` text,
	`ip_address` text,
	`account_status` text DEFAULT 'active',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_uuid_unique` ON `users` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_uuid_idx` ON `users` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_provider_idx` ON `users` (`account_provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `users_account_status_idx` ON `users` (`account_status`);