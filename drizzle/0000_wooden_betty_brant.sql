CREATE TABLE `meal_history` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`cooked_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_history_profile_date` ON `meal_history` (`profile_id`,`cooked_at`);--> statement-breakpoint
CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`supermarket` text NOT NULL,
	`product` text NOT NULL,
	`unit` text NOT NULL,
	`price` real NOT NULL,
	`regular_price` real NOT NULL,
	`distance_km` real NOT NULL,
	`valid_until` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_offers_store` ON `offers` (`supermarket`);--> statement-breakpoint
CREATE TABLE `pantry_items` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`purchased_at` text NOT NULL,
	`best_before` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_pantry_profile_status` ON `pantry_items` (`profile_id`,`status`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`height_cm` integer NOT NULL,
	`current_weight_kg` real NOT NULL,
	`goal_weight_kg` real NOT NULL,
	`calorie_min` integer NOT NULL,
	`calorie_max` integer NOT NULL,
	`protein_grams` integer NOT NULL,
	`carbs_grams` integer NOT NULL,
	`fat_grams` integer NOT NULL,
	`transport_mode` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`prep_minutes` integer NOT NULL,
	`calories` integer NOT NULL,
	`protein` integer NOT NULL,
	`carbs` integer NOT NULL,
	`fat` integer NOT NULL,
	`priority` text NOT NULL,
	`ingredients_json` text NOT NULL,
	`steps_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text NOT NULL
);
