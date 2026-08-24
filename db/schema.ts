import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  heightCm: integer('height_cm').notNull(),
  currentWeightKg: real('current_weight_kg').notNull(),
  goalWeightKg: real('goal_weight_kg').notNull(),
  calorieMin: integer('calorie_min').notNull(),
  calorieMax: integer('calorie_max').notNull(),
  proteinGrams: integer('protein_grams').notNull(),
  carbsGrams: integer('carbs_grams').notNull(),
  fatGrams: integer('fat_grams').notNull(),
  transportMode: text('transport_mode').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const profileGoals = sqliteTable('profile_goals', {
  profileId: text('profile_id').primaryKey(),
  age: integer('age').notNull(),
  metabolicReference: text('metabolic_reference').notNull(),
  goalType: text('goal_type').notNull(),
  activityLevel: text('activity_level').notNull(),
  exerciseDaysPerWeek: integer('exercise_days_per_week').notNull(),
  exerciseMinutes: integer('exercise_minutes').notNull(),
  mealPrepMinutes: integer('meal_prep_minutes').notNull(),
  dietaryPreference: text('dietary_preference').notNull(),
  allergies: text('allergies').notNull(),
  dislikes: text('dislikes').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const pantryItems = sqliteTable('pantry_items', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  purchasedAt: text('purchased_at').notNull(),
  bestBefore: text('best_before').notNull(),
  source: text('source').notNull(),
  status: text('status').notNull(),
}, (table) => [index('idx_pantry_profile_status').on(table.profileId, table.status)]);

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  prepMinutes: integer('prep_minutes').notNull(),
  calories: integer('calories').notNull(),
  protein: integer('protein').notNull(),
  carbs: integer('carbs').notNull(),
  fat: integer('fat').notNull(),
  priority: text('priority').notNull(),
  ingredientsJson: text('ingredients_json').notNull(),
  stepsJson: text('steps_json').notNull(),
});

export const offers = sqliteTable('offers', {
  id: text('id').primaryKey(),
  supermarket: text('supermarket').notNull(),
  product: text('product').notNull(),
  unit: text('unit').notNull(),
  price: real('price').notNull(),
  regularPrice: real('regular_price').notNull(),
  distanceKm: real('distance_km').notNull(),
  validUntil: text('valid_until').notNull(),
}, (table) => [index('idx_offers_store').on(table.supermarket)]);

export const mealHistory = sqliteTable('meal_history', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  recipeId: text('recipe_id').notNull(),
  cookedAt: text('cooked_at').notNull(),
}, (table) => [index('idx_history_profile_date').on(table.profileId, table.cookedAt)]);

export const uploads = sqliteTable('uploads', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  filename: text('filename').notNull(),
  objectKey: text('object_key').notNull(),
  contentType: text('content_type').notNull(),
  createdAt: text('created_at').notNull(),
});
