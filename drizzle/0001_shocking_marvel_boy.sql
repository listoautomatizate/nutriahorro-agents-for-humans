CREATE TABLE `profile_goals` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`age` integer NOT NULL,
	`metabolic_reference` text NOT NULL,
	`goal_type` text NOT NULL,
	`activity_level` text NOT NULL,
	`exercise_days_per_week` integer NOT NULL,
	`exercise_minutes` integer NOT NULL,
	`meal_prep_minutes` integer NOT NULL,
	`dietary_preference` text NOT NULL,
	`allergies` text NOT NULL,
	`dislikes` text NOT NULL,
	`updated_at` text NOT NULL
);
