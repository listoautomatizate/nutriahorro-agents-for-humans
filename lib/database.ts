import { env } from 'cloudflare:workers';
import { createDemoOffers, createDemoPantry, demoProfile, demoRecipes } from './demo-data';
import type { AppState, MealEntry, NutrientTotals, Offer, PantryItem, Profile, Recipe } from './types';

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
  `CREATE TABLE IF NOT EXISTS meal_entries (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    recipe_id TEXT NOT NULL,
    recipe_name TEXT NOT NULL,
    meal_date TEXT NOT NULL,
    cooked_at TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein INTEGER NOT NULL,
    carbs INTEGER NOT NULL,
    fat INTEGER NOT NULL
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
  'CREATE INDEX IF NOT EXISTS idx_meal_entries_profile_date ON meal_entries(profile_id, meal_date, cooked_at)',
];

const montevideoDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

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

const rowToMealEntry = (row: Record<string, unknown>): MealEntry => ({
  id: String(row.id),
  recipeId: String(row.recipe_id),
  recipeName: String(row.recipe_name),
  cookedAt: String(row.cooked_at),
  calories: Number(row.calories),
  protein: Number(row.protein),
  carbs: Number(row.carbs),
  fat: Number(row.fat),
});

const addTotals = (entries: MealEntry[]): NutrientTotals => entries.reduce<NutrientTotals>((total, entry) => ({
  calories: total.calories + entry.calories,
  protein: total.protein + entry.protein,
  carbs: total.carbs + entry.carbs,
  fat: total.fat + entry.fat,
}), { calories: 0, protein: 0, carbs: 0, fat: 0 });

export async function ensureDatabase() {
  const db = env.DB;
  await db.batch(statements.map((sql) => db.prepare(sql)));

  // Remove the original private prototype profile before serving the public demo.
  await db.batch([
    db.prepare('DELETE FROM meal_history WHERE profile_id = ?').bind('lia-demo'),
    db.prepare('DELETE FROM meal_entries WHERE profile_id = ?').bind('lia-demo'),
    db.prepare('DELETE FROM uploads WHERE profile_id = ?').bind('lia-demo'),
    db.prepare('DELETE FROM pantry_items WHERE profile_id = ?').bind('lia-demo'),
    db.prepare('DELETE FROM profile_goals WHERE profile_id = ?').bind('lia-demo'),
    db.prepare('DELETE FROM profiles WHERE id = ?').bind('lia-demo'),
  ]);

  const existing = await db.prepare('SELECT id FROM profiles WHERE id = ?').bind(demoProfile.id).first();
  const referenceDate = new Date();
  const now = referenceDate.toISOString();
  const currentDemoOffers = createDemoOffers(referenceDate);
  const currentDemoPantry = createDemoPantry(referenceDate);
  if (existing) {
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO profile_goals (
        profile_id, age, metabolic_reference, goal_type, activity_level,
        exercise_days_per_week, exercise_minutes, meal_prep_minutes,
        dietary_preference, allergies, dislikes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        demoProfile.id, demoProfile.age, demoProfile.metabolicReference, demoProfile.goalType,
        demoProfile.activityLevel, demoProfile.exerciseDaysPerWeek, demoProfile.exerciseMinutes,
        demoProfile.mealPrepMinutes, demoProfile.dietaryPreference, demoProfile.allergies,
        demoProfile.dislikes, now,
      ),
      ...demoRecipes.map((recipe) => db.prepare(`INSERT OR REPLACE INTO recipes (
        id, name, description, prep_minutes, calories, protein, carbs, fat, priority, ingredients_json, steps_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        recipe.id, recipe.name, recipe.description, recipe.prepMinutes, recipe.calories, recipe.protein,
        recipe.carbs, recipe.fat, recipe.priority, JSON.stringify(recipe.ingredients), JSON.stringify(recipe.steps),
      )),
      ...currentDemoOffers.map((offer) => db.prepare(`INSERT OR REPLACE INTO offers (
        id, supermarket, product, unit, price, regular_price, distance_km, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        offer.id, offer.supermarket, offer.product, offer.unit, offer.price, offer.regularPrice,
        offer.distanceKm, offer.validUntil,
      )),
    ]);
    return;
  }

  const seed = [
    db.prepare(`INSERT OR REPLACE INTO profiles (
      id, name, city, height_cm, current_weight_kg, goal_weight_kg,
      calorie_min, calorie_max, protein_grams, carbs_grams, fat_grams,
      transport_mode, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(demoProfile.id, demoProfile.name, demoProfile.city, demoProfile.heightCm, demoProfile.currentWeightKg, demoProfile.goalWeightKg, demoProfile.calorieMin, demoProfile.calorieMax, demoProfile.proteinGrams, demoProfile.carbsGrams, demoProfile.fatGrams, demoProfile.transportMode, now),
    db.prepare(`INSERT OR REPLACE INTO profile_goals (
      profile_id, age, metabolic_reference, goal_type, activity_level,
      exercise_days_per_week, exercise_minutes, meal_prep_minutes,
      dietary_preference, allergies, dislikes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(demoProfile.id, demoProfile.age, demoProfile.metabolicReference, demoProfile.goalType, demoProfile.activityLevel, demoProfile.exerciseDaysPerWeek, demoProfile.exerciseMinutes, demoProfile.mealPrepMinutes, demoProfile.dietaryPreference, demoProfile.allergies, demoProfile.dislikes, now),
    ...currentDemoPantry.map((item) => db.prepare(`INSERT OR IGNORE INTO pantry_items (
      id, profile_id, name, category, quantity, unit, purchased_at, best_before, source, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(item.id, demoProfile.id, item.name, item.category, item.quantity, item.unit, item.purchasedAt, item.bestBefore, item.source, item.status)),
    ...demoRecipes.map((recipe) => db.prepare(`INSERT OR REPLACE INTO recipes (
      id, name, description, prep_minutes, calories, protein, carbs, fat, priority, ingredients_json, steps_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(recipe.id, recipe.name, recipe.description, recipe.prepMinutes, recipe.calories, recipe.protein, recipe.carbs, recipe.fat, recipe.priority, JSON.stringify(recipe.ingredients), JSON.stringify(recipe.steps))),
    ...currentDemoOffers.map((offer) => db.prepare(`INSERT OR REPLACE INTO offers (
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
  const today = montevideoDate();
  const [profileRow, goalRow, pantryRows, recipeRows, offerRows, historyRows, mealRows, uploadRow] = await Promise.all([
    db.prepare('SELECT * FROM profiles WHERE id = ?').bind(demoProfile.id).first<Record<string, unknown>>(),
    db.prepare('SELECT * FROM profile_goals WHERE profile_id = ?').bind(demoProfile.id).first<Record<string, unknown>>(),
    db.prepare('SELECT * FROM pantry_items WHERE profile_id = ? ORDER BY best_before ASC').bind(demoProfile.id).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM recipes ORDER BY prep_minutes ASC').all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM offers ORDER BY supermarket, product').all<Record<string, unknown>>(),
    db.prepare('SELECT recipe_id FROM meal_history WHERE profile_id = ? ORDER BY cooked_at DESC').bind(demoProfile.id).all<{ recipe_id: string }>(),
    db.prepare('SELECT * FROM meal_entries WHERE profile_id = ? AND meal_date = ? ORDER BY cooked_at DESC').bind(demoProfile.id, today).all<Record<string, unknown>>(),
    db.prepare('SELECT filename FROM uploads WHERE profile_id = ? ORDER BY created_at DESC LIMIT 1').bind(demoProfile.id).first<{ filename: string }>(),
  ]);

  if (!profileRow) throw new Error('No se pudo cargar el perfil de demostracion.');

  const profile = rowToProfile(profileRow, goalRow);
  const meals = mealRows.results.map(rowToMealEntry);
  const consumed = addTotals(meals);
  const calorieStatus = consumed.calories < profile.calorieMin
    ? 'below'
    : consumed.calories <= profile.calorieMax ? 'in-range' : 'over';
  const remainingCalories = calorieStatus === 'below'
    ? profile.calorieMin - consumed.calories
    : calorieStatus === 'over' ? profile.calorieMax - consumed.calories : 0;

  return {
    profile,
    pantry: pantryRows.results.map(rowToPantry),
    recipes: recipeRows.results.map(rowToRecipe),
    offers: offerRows.results.map(rowToOffer),
    cookedRecipeIds: historyRows.results.map((row) => row.recipe_id),
    dailyIntake: {
      date: today,
      consumed,
      remaining: {
        calories: remainingCalories,
        protein: profile.proteinGrams - consumed.protein,
        carbs: profile.carbsGrams - consumed.carbs,
        fat: profile.fatGrams - consumed.fat,
      },
      calorieStatus,
      meals,
    },
    lastUploadName: uploadRow?.filename ?? null,
  };
}

export async function upsertPantryItem(item: PantryItem) {
  await ensureDatabase();
  const normalized = item.unit === 'kg'
    ? { ...item, quantity: item.quantity * 1000, unit: 'g' }
    : item.unit === 'l'
      ? { ...item, quantity: item.quantity * 1000, unit: 'ml' }
      : item;
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
    .bind(normalized.id, demoProfile.id, normalized.name, normalized.category, normalized.quantity, normalized.unit, normalized.purchasedAt, normalized.bestBefore, normalized.source, normalized.status)
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
  const row = await db.prepare('SELECT * FROM recipes WHERE id = ?').bind(recipeId).first<Record<string, unknown>>();
  if (!row) throw new Error('No encontre esa receta.');
  const recipe = rowToRecipe(row);
  const ingredients = recipe.ingredients;
  const now = new Date();
  const entryId = crypto.randomUUID();
  const pantryRows = await db.prepare(`SELECT * FROM pantry_items
    WHERE profile_id = ? ORDER BY best_before ASC, purchased_at ASC`)
    .bind(demoProfile.id)
    .all<Record<string, unknown>>();
  const pantry = pantryRows.results.map(rowToPantry);
  const updates: ReturnType<typeof db.prepare>[] = [];

  for (const ingredient of ingredients) {
    const batches = pantry.filter((item) => item.name.toLowerCase() === ingredient.pantryName.toLowerCase()
      && item.unit === ingredient.unit && item.quantity > 0);
    const available = batches.reduce((sum, item) => sum + item.quantity, 0);
    if (available + 0.0001 < ingredient.quantity) {
      throw new Error(`No hay suficiente ${ingredient.label.toLowerCase()} para registrar esta comida.`);
    }

    let remaining = ingredient.quantity;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const consumed = Math.min(batch.quantity, remaining);
      const nextQuantity = Math.max(0, Math.round((batch.quantity - consumed) * 1000) / 1000);
      const lowThreshold = batch.unit === 'unidades' ? 2 : 150;
      const daysLeft = Math.ceil((new Date(batch.bestBefore).getTime() - now.getTime()) / 86400000);
      const status = nextQuantity <= lowThreshold ? 'low' : daysLeft <= 3 ? 'soon' : 'ok';
      updates.push(db.prepare('UPDATE pantry_items SET quantity = ?, status = ? WHERE id = ? AND profile_id = ?')
        .bind(nextQuantity, status, batch.id, demoProfile.id));
      batch.quantity = nextQuantity;
      remaining -= consumed;
    }
  }
  updates.push(db.prepare('INSERT INTO meal_history (id, profile_id, recipe_id, cooked_at) VALUES (?, ?, ?, ?)')
    .bind(entryId, demoProfile.id, recipeId, now.toISOString()));
  updates.push(db.prepare(`INSERT INTO meal_entries (
    id, profile_id, recipe_id, recipe_name, meal_date, cooked_at, calories, protein, carbs, fat
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    entryId, demoProfile.id, recipe.id, recipe.name, montevideoDate(now), now.toISOString(),
    recipe.calories, recipe.protein, recipe.carbs, recipe.fat,
  ));
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

export async function resetDemoState() {
  await ensureDatabase();
  const uploads = await env.DB.prepare('SELECT object_key FROM uploads WHERE profile_id = ?')
    .bind(demoProfile.id)
    .all<{ object_key: string }>();
  await Promise.all(uploads.results.map((upload) => env.FILES.delete(upload.object_key)));
  await env.DB.batch([
    env.DB.prepare('DELETE FROM meal_entries WHERE profile_id = ?').bind(demoProfile.id),
    env.DB.prepare('DELETE FROM meal_history WHERE profile_id = ?').bind(demoProfile.id),
    env.DB.prepare('DELETE FROM uploads WHERE profile_id = ?').bind(demoProfile.id),
    env.DB.prepare('DELETE FROM pantry_items WHERE profile_id = ?').bind(demoProfile.id),
    env.DB.prepare('DELETE FROM profile_goals WHERE profile_id = ?').bind(demoProfile.id),
    env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(demoProfile.id),
  ]);
  await ensureDatabase();
}
