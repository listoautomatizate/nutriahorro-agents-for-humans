CREATE TABLE `meal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`recipe_name` text NOT NULL,
	`meal_date` text NOT NULL,
	`cooked_at` text NOT NULL,
	`calories` integer NOT NULL,
	`protein` integer NOT NULL,
	`carbs` integer NOT NULL,
	`fat` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_meal_entries_profile_date` ON `meal_entries` (`profile_id`,`meal_date`,`cooked_at`);