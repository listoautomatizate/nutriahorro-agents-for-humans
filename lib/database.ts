import { env } from 'cloudflare:workers';
import { demoOffers, demoPantry, demoProfile, demoRecipes } from './demo-data';
import type { AppState, Offer, PantryItem, Profile, Recipe } from './types';

const statements = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    height_cm INTEGER NOT NULL,
    current_weight_kg REAL NOT NULL,
    goal_weight_kg REAL NOT NULL,
    calorie_min INTEGER NOT NULL,
    calorie_max INTEGER NOT NULL,
    protein_grams INTEGER NOT NULL,
    carbs_grams INTEGER NOT NULL,
    fat_grams INTEGER NOT NULL,
    transport_mode TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS profile_goals (
    profile_id TEXT PRIMARY KEY,
    age INTEGER NOT NULL,
    metabolic_reference TEXT NOT NULL,
    goal_type TEXT NOT NULL,
    activity_level TEXT NOT NULL,
    exercise_days_per_week INTEGER NOT NULL,
    exercise_minutes INTEGER NOT NULL,
    meal_prep_minutes INTEGER NOT NULL,
    dietary_preference TEXT NOT NULL,
    allergies TEXT NOT NULL,
    dislikes TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pantry_items (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    purchased_at TEXT NOT NULL,
    best_before TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    prep_minutes INTEGER NOT NULL,
    calories INTEGER NOT NULL,
    protein INTEGER NOT NULL,
    carbs INTEGER NOT NULL,
    fat INTEGER NOT NULL,
    priority TEXT NOT NULL,
    ingredients_json TEXT NOT NULL,
    steps_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    supermarket TEXT NOT NULL,
    product TEXT NOT NULL,
    unit TEXT NOT NULL,
    price REAL NOT NULL,
    regular_price REAL NOT NULL,
    distance_km REAL NOT NULL,
    valid_until TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS meal_history (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    recipe_id TEXT NOT NULL,
    cooked_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    object_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_pantry_profile_status ON pantry_items(profile_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_offers_store ON offers(supermarket)',
  'CREATE INDEX IF NOT EXISTS idx_history_profile_date ON meal_history(profile_id, cooked_at)',
];

const rowToProfile = (row: Record<string, unknown>, goals?: Record<string, unknown> | null): Profile => ({
  id: String(row.id),
  name: String(row.name),
  city: String(row.city),
  age: Number(goals?.age ?? demoProfile.age),
  metabolicReference: (goals?.metabolic_reference ?? demoProfile.metabolicReference) as Profile['metabolicReference'],
  heightCm: Number(row.height_cm),
  currentWeightKg: Number(row.current_weight_kg),
  goalWeightKg: Number(row.goal_weight_kg),
  goalType: (goals?.goal_type ?? demoProfile.goalType) as Profile['goalType'],
  activityLevel: (goals?.activity_level ?? demoProfile.activityLevel) as Profile['activityLevel'],
  exerciseDaysPerWeek: Number(goals?.exercise_days_per_week ?? demoProfile.exerciseDaysPerWeek),
  exerciseMinutes: Number(goals?.exercise_minutes ?? demoProfile.exerciseMinutes),
  mealPrepMinutes: Number(goals?.meal_prep_minutes ?? demoProfile.mealPrepMinutes),
  dietaryPreference: String(goals?.dietary_preference ?? demoProfile.dietaryPreference),
  allergies: String(goals?.allergies ?? demoProfile.allergies),
  dislikes: String(goals?.dislikes ?? demoProfile.dislikes),
  calorieMin: Number(row.calorie_min),
  calorieMax: Number(row.calorie_max),
  proteinGrams: Number(row.protein_grams),
  carbsGrams: Number(row.carbs_grams),
  fatGrams: Number(row.fat_grams),
  transportMode: row.transport_mode as Profile['transportMode'],
});

const rowToPantry = (row: Record<string, unknown>): PantryItem => ({
  id: String(row.id),
  name: String(row.name),
  category: String(row.category),
  quantity: Number(row.quantity),
  unit: String(row.unit),
  purchasedAt: String(row.purchased_at),
  bestBefore: String(row.best_before),
  source: String(row.source),
  status: row.status as PantryItem['status'],
});

const rowToRecipe = (row: Record<string, unknown>): Recipe => ({
  id: String(row.id),
  name: String(row.name),
  description: String(row.description),
  prepMinutes: Number(row.prep_minutes),
  calories: Number(row.calories),
  protein: Number(row.protein),
  carbs: Number(row.carbs),
  fat: Number(row.fat),
  priority: String(row.priority),
  ingredients: JSON.parse(String(row.ingredients_json)),
  steps: JSON.parse(String(row.steps_json)),
});

const rowToOffer = (row: Record<string, unknown>): Offer => ({
  id: String(row.id),
  supermarket: String(row.supermarket),
  product: String(row.product),
  unit: String(row.unit),
  price: Number(row.price),
  regularPrice: Number(row.regular_price),
  distanceKm: Number(row.distance_km),
  validUntil: String(row.valid_until),
});

export async function ensureDatabase() {
  const db = env.DB;
  await db.batch(statements.map((sql) => db.prepare(sql)));

  const existing = await db.prepare('SELECT id FROM profiles WHERE id = ?').bind(demoProfile.id).first();
  const now = new Date().toISOString();
  if (existing) {
    await db.prepare(`INSERT OR IGNORE INTO profile_goals (
      profile_id, age, metabolic_reference, goal_type, activity_level,
      exercise_days_per_week, exercise_minutes, meal_prep_minutes,
      dietary_preference, allergies, dislikes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      demoProfile.id, demoProfile.age, demoProfile.metabolicReference, demoProfile.goalType,
      demoProfile.activityLevel, demoProfile.exerciseDaysPerWeek, demoProfile.exerciseMinutes,
      demoProfile.mealPrepMinutes, demoProfile.dietaryPreference, demoProfile.allergies,
      demoProfile.dislikes, now,
    ).run();
    return;
  }

  const seed = [
    db.prepare(`INSERT INTO profiles (
      id, name, city, height_cm, current_weight_kg, goal_weight_kg,
      calorie_min, calorie_max, protein_grams, carbs_grams, fat_grams,
      transport_mode, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(demoProfile.id, demoProfile.name, demoProfile.city, demoProfile.heightCm, demoProfile.currentWeightKg, demoProfile.goalWeightKg, demoProfile.calorieMin, demoProfile.calorieMax, demoProfile.proteinGrams, demoProfile.carbsGrams, demoProfile.fatGrams, demoProfile.transportMode, now),
    db.prepare(`INSERT INTO profile_goals (
      profile_id, age, metabolic_reference, goal_type, activity_level,
      exercise_days_per_week, exercise_minutes, meal_prep_minutes,
      dietary_preference, allergies, dislikes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(demoProfile.id, demoProfile.age, demoProfile.metabolicReference, demoProfile.goalType, demoProfile.activityLevel, demoProfile.exerciseDaysPerWeek, demoProfile.exerciseMinutes, demoProfile.mealPrepMinutes, demoProfile.dietaryPreference, demoProfile.allergies, demoProfile.dislikes, now),
    ...demoPantry.map((item) => db.prepare(`INSERT INTO pantry_items (
      id, profile_id, name, category, quantity, unit, purchased_at, best_before, source, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(item.id, demoProfile.id, item.name, item.category, item.quantity, item.unit, item.purchasedAt, item.bestBefore, item.source, item.status)),
    ...demoRecipes.map((recipe) => db.prepare(`INSERT INTO recipes (
      id, name, description, prep_minutes, calories, protein, carbs, fat, priority, ingredients_json, steps_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(recipe.id, recipe.name, recipe.description, recipe.prepMinutes, recipe.calories, recipe.protein, recipe.carbs, recipe.fat, recipe.priority, JSON.stringify(recipe.ingredients), JSON.stringify(recipe.steps))),
    ...demoOffers.map((offer) => db.prepare(`INSERT INTO offers (
      id, supermarket, product, unit, price, regular_price, distance_km, valid_until
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(offer.id, offer.supermarket, offer.product, offer.unit, offer.price, offer.regularPrice, offer.distanceKm, offer.validUntil)),
  ];

  await db.batch(seed);
  await db.prepare('PRAGMA optimize').run();
}

export async function getAppState(): Promise<AppState> {
  await ensureDatabase();
  const db = env.DB;
  const [profileRow, goalRow, pantryRows, recipeRows, offerRows, historyRows, uploadRow] = await Promise.all([
    db.prepare('SELECT * FROM profiles WHERE id = ?').bind(demoProfile.id).first<Record<string, unknown>>(),
    db.prepare('SELECT * FROM profile_goals WHERE profile_id = ?').bind(demoProfile.id).first<Record<string, unknown>>(),
    db.prepare('SELECT * FROM pantry_items WHERE profile_id = ? ORDER BY best_before ASC').bind(demoProfile.id).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM recipes ORDER BY prep_minutes ASC').all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM offers ORDER BY supermarket, product').all<Record<string, unknown>>(),
    db.prepare('SELECT recipe_id FROM meal_history WHERE profile_id = ? ORDER BY cooked_at DESC').bind(demoProfile.id).all<{ recipe_id: string }>(),
    db.prepare('SELECT filename FROM uploads WHERE profile_id = ? ORDER BY created_at DESC LIMIT 1').bind(demoProfile.id).first<{ filename: string }>(),
  ]);

  if (!profileRow) throw new Error('No se pudo cargar el perfil de demostracion.');

  return {
    profile: rowToProfile(profileRow, goalRow),
    pantry: pantryRows.results.map(rowToPantry),
    recipes: recipeRows.results.map(rowToRecipe),
    offers: offerRows.results.map(rowToOffer),
    cookedRecipeIds: historyRows.results.map((row) => row.recipe_id),
    lastUploadName: uploadRow?.filename ?? null,
  };
}

export async function upsertPantryItem(item: PantryItem) {
  await ensureDatabase();
  await env.DB.prepare(`INSERT INTO pantry_items (
    id, profile_id, name, category, quantity, unit, purchased_at, best_before, source, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    category = excluded.category,
    quantity = excluded.quantity,
    unit = excluded.unit,
    purchased_at = excluded.purchased_at,
    best_before = excluded.best_before,
    source = excluded.source,
    status = excluded.status`)
    .bind(item.id, demoProfile.id, item.name, item.category, item.quantity, item.unit, item.purchasedAt, item.bestBefore, item.source, item.status)
    .run();
}

export async function deletePantryItem(id: string) {
  await ensureDatabase();
  await env.DB.prepare('DELETE FROM pantry_items WHERE id = ? AND profile_id = ?').bind(id, demoProfile.id).run();
}

export async function updateTransport(mode: Profile['transportMode']) {
  await ensureDatabase();
  await env.DB.prepare('UPDATE profiles SET transport_mode = ?, updated_at = ? WHERE id = ?')
    .bind(mode, new Date().toISOString(), demoProfile.id)
    .run();
}

export async function updateProfile(profile: Profile) {
  await ensureDatabase();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE profiles SET
      name = ?, city = ?, height_cm = ?, current_weight_kg = ?, goal_weight_kg = ?,
      calorie_min = ?, calorie_max = ?, protein_grams = ?, carbs_grams = ?, fat_grams = ?,
      updated_at = ? WHERE id = ?`)
      .bind(profile.name, profile.city, profile.heightCm, profile.currentWeightKg, profile.goalWeightKg, profile.calorieMin, profile.calorieMax, profile.proteinGrams, profile.carbsGrams, profile.fatGrams, now, demoProfile.id),
    env.DB.prepare(`INSERT INTO profile_goals (
      profile_id, age, metabolic_reference, goal_type, activity_level,
      exercise_days_per_week, exercise_minutes, meal_prep_minutes,
      dietary_preference, allergies, dislikes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id) DO UPDATE SET
      age = excluded.age,
      metabolic_reference = excluded.metabolic_reference,
      goal_type = excluded.goal_type,
      activity_level = excluded.activity_level,
      exercise_days_per_week = excluded.exercise_days_per_week,
      exercise_minutes = excluded.exercise_minutes,
      meal_prep_minutes = excluded.meal_prep_minutes,
      dietary_preference = excluded.dietary_preference,
      allergies = excluded.allergies,
      dislikes = excluded.dislikes,
      updated_at = excluded.updated_at`)
      .bind(demoProfile.id, profile.age, profile.metabolicReference, profile.goalType, profile.activityLevel, profile.exerciseDaysPerWeek, profile.exerciseMinutes, profile.mealPrepMinutes, profile.dietaryPreference, profile.allergies, profile.dislikes, now),
  ]);
}

export async function cookRecipe(recipeId: string) {
  await ensureDatabase();
  const db = env.DB;
  const row = await db.prepare('SELECT ingredients_json FROM recipes WHERE id = ?').bind(recipeId).first<{ ingredients_json: string }>();
  if (!row) throw new Error('No encontre esa receta.');
  const ingredients = JSON.parse(row.ingredients_json) as Recipe['ingredients'];
  const updates = ingredients.map((ingredient) => db.prepare(`UPDATE pantry_items
    SET quantity = MAX(0, quantity - ?),
        status = CASE WHEN quantity - ? <= 1 THEN 'low' ELSE status END
    WHERE profile_id = ? AND lower(name) = lower(?)`)
    .bind(ingredient.quantity, ingredient.quantity, demoProfile.id, ingredient.pantryName));
  updates.push(db.prepare('INSERT INTO meal_history (id, profile_id, recipe_id, cooked_at) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), demoProfile.id, recipeId, new Date().toISOString()));
  await db.batch(updates);
}

export async function saveUpload(file: File, objectKey: string) {
  await ensureDatabase();
  await env.FILES.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  await env.DB.prepare('INSERT INTO uploads (id, profile_id, filename, object_key, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), demoProfile.id, file.name, objectKey, file.type || 'application/octet-stream', new Date().toISOString())
    .run();
}
