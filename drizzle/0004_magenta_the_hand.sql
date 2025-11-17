-- Step 1: Add name columns as nullable first (to avoid constraint violations on existing rows)
ALTER TABLE `category_translations` ADD `name` text;--> statement-breakpoint
ALTER TABLE `featured_translations` ADD `name` text;--> statement-breakpoint
ALTER TABLE `tag_translations` ADD `name` text;--> statement-breakpoint

-- Step 2: Populate name from parent tables for all existing translation records
UPDATE `category_translations`
SET `name` = (SELECT `name` FROM `categories` WHERE `categories`.`uuid` = `category_translations`.`category_uuid`)
WHERE `name` IS NULL;--> statement-breakpoint

UPDATE `featured_translations`
SET `name` = (SELECT `name` FROM `featured` WHERE `featured`.`uuid` = `featured_translations`.`featured_uuid`)
WHERE `name` IS NULL;--> statement-breakpoint

UPDATE `tag_translations`
SET `name` = (SELECT `name` FROM `tags` WHERE `tags`.`uuid` = `tag_translations`.`tag_uuid`)
WHERE `name` IS NULL;--> statement-breakpoint

-- Note: SQLite doesn't support ALTER COLUMN to add NOT NULL constraint on existing tables
-- The NOT NULL constraint is defined in the schema and will be enforced by Drizzle ORM for new records
-- All existing records now have name values populated from their parent tables