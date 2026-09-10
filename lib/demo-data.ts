import type { Offer, PantryItem, Profile, Recipe, TransportMode } from './types';

const isoDay = (daysFromNow: number, referenceDate: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Montevideo',
    }).formatToParts(referenceDate).map((part) => [part.type, part.value]),
  );
  return new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) + daysFromNow,
    15,
  )).toISOString();
};

const STATIC_DEMO_DATE = new Date('2026-09-08T15:00:00.000Z');

export const demoProfile: Profile = {
  id: 'public-demo',
  name: 'Demo User',
  city: 'Maldonado',
  age: 32,
  metabolicReference: 'neutral',
  heightCm: 170,
  currentWeightKg: 72,
  goalWeightKg: 68,
  goalType: 'lose_fat',
  activityLevel: 'light',
  exerciseDaysPerWeek: 3,
  exerciseMinutes: 45,
  mealPrepMinutes: 30,
  dietaryPreference: 'No preference',
  allergies: 'None',
  dislikes: '',
  calorieMin: 1825,
  calorieMax: 1925,
  proteinGrams: 130,
  carbsGrams: 208,
  fatGrams: 58,
  transportMode: 'walking',
};

export const createDemoPantry = (referenceDate = new Date()): PantryItem[] => [
  { id: 'pantry-chicken', name: 'Chicken breast', category: 'Protein', quantity: 800, unit: 'g', purchasedAt: isoDay(-1, referenceDate), bestBefore: isoDay(2, referenceDate), source: 'Ta-Ta', status: 'soon' },
  { id: 'pantry-rice', name: 'Rice', category: 'Carbohydrate', quantity: 1000, unit: 'g', purchasedAt: isoDay(-1, referenceDate), bestBefore: isoDay(180, referenceDate), source: 'Ta-Ta', status: 'ok' },
  { id: 'pantry-eggs', name: 'Eggs', category: 'Protein', quantity: 12, unit: 'units', purchasedAt: isoDay(-1, referenceDate), bestBefore: isoDay(20, referenceDate), source: 'Ta-Ta', status: 'ok' },
  { id: 'pantry-avocado', name: 'Avocado', category: 'Fruit', quantity: 3, unit: 'units', purchasedAt: isoDay(-1, referenceDate), bestBefore: isoDay(3, referenceDate), source: 'Ta-Ta', status: 'soon' },
  { id: 'pantry-tomato', name: 'Tomato', category: 'Vegetable', quantity: 1000, unit: 'g', purchasedAt: isoDay(-1, referenceDate), bestBefore: isoDay(2, referenceDate), source: 'Ta-Ta', status: 'soon' },
  { id: 'pantry-oil', name: 'Olive oil', category: 'Fat', quantity: 750, unit: 'ml', purchasedAt: isoDay(-1, referenceDate), bestBefore: isoDay(240, referenceDate), source: 'Ta-Ta', status: 'ok' },
];

export const demoPantry = createDemoPantry(STATIC_DEMO_DATE);

export const demoRecipes: Recipe[] = [
  {
    id: 'recipe-chicken-rice',
    name: 'Chicken with rice, tomato, and avocado',
    description: 'A complete meal that prioritizes the fresh foods closest to expiry.',
    prepMinutes: 25,
    calories: 532,
    protein: 46,
    carbs: 48,
    fat: 17,
    priority: 'Uses urgent food first',
    ingredients: [
      { pantryName: 'Chicken breast', label: 'Chicken breast', quantity: 180, unit: 'g' },
      { pantryName: 'Rice', label: 'Rice', quantity: 70, unit: 'g' },
      { pantryName: 'Tomato', label: 'Tomato', quantity: 180, unit: 'g' },
      { pantryName: 'Avocado', label: 'Half an avocado', quantity: 0.5, unit: 'units' },
      { pantryName: 'Olive oil', label: 'Olive oil', quantity: 8, unit: 'ml' },
    ],
    steps: ['Cook the rice until tender.', 'Brown the chicken with half of the oil.', 'Serve with tomato, avocado, and the remaining oil.'],
  },
  {
    id: 'recipe-omelette',
    name: 'Creamy tomato omelet',
    description: 'A quick meal for a busy day using ingredients already available.',
    prepMinutes: 15,
    calories: 408,
    protein: 31,
    carbs: 13,
    fat: 25,
    priority: 'Quick',
    ingredients: [
      { pantryName: 'Eggs', label: 'Eggs', quantity: 3, unit: 'units' },
      { pantryName: 'Tomato', label: 'Tomato', quantity: 160, unit: 'g' },
      { pantryName: 'Avocado', label: 'Half an avocado', quantity: 0.5, unit: 'units' },
      { pantryName: 'Olive oil', label: 'Olive oil', quantity: 5, unit: 'ml' },
    ],
    steps: ['Whisk and season the eggs.', 'Cook over medium heat with the oil.', 'Add tomato and serve with avocado.'],
  },
  {
    id: 'recipe-bowl',
    name: 'Warm chicken and avocado bowl',
    description: 'High in protein, simple, and flexible for lunch or dinner.',
    prepMinutes: 20,
    calories: 487,
    protein: 43,
    carbs: 39,
    fat: 18,
    priority: 'High protein',
    ingredients: [
      { pantryName: 'Chicken breast', label: 'Chicken breast', quantity: 170, unit: 'g' },
      { pantryName: 'Rice', label: 'Rice', quantity: 55, unit: 'g' },
      { pantryName: 'Tomato', label: 'Tomato', quantity: 120, unit: 'g' },
      { pantryName: 'Avocado', label: 'Half an avocado', quantity: 0.5, unit: 'units' },
    ],
    steps: ['Cook the rice.', 'Slice and brown the chicken.', 'Combine everything with tomato and avocado.'],
  },
  {
    id: 'recipe-rice-eggs',
    name: 'Fried rice with egg and tomato',
    description: 'A budget-friendly meal built around pantry staples.',
    prepMinutes: 18,
    calories: 449,
    protein: 24,
    carbs: 56,
    fat: 14,
    priority: 'Budget-friendly',
    ingredients: [
      { pantryName: 'Eggs', label: 'Eggs', quantity: 2, unit: 'units' },
      { pantryName: 'Rice', label: 'Rice', quantity: 75, unit: 'g' },
      { pantryName: 'Tomato', label: 'Tomato', quantity: 150, unit: 'g' },
      { pantryName: 'Olive oil', label: 'Olive oil', quantity: 5, unit: 'ml' },
    ],
    steps: ['Cook the rice.', 'Saute the tomato and add the eggs.', 'Fold in the rice and cook for two more minutes.'],
  },
  {
    id: 'recipe-chicken-eggs',
    name: 'Chicken steak with eggs',
    description: 'Plenty of protein and straightforward preparation for a satisfying meal.',
    prepMinutes: 22,
    calories: 501,
    protein: 55,
    carbs: 12,
    fat: 25,
    priority: 'Satisfying',
    ingredients: [
      { pantryName: 'Chicken breast', label: 'Chicken breast', quantity: 200, unit: 'g' },
      { pantryName: 'Eggs', label: 'Eggs', quantity: 2, unit: 'units' },
      { pantryName: 'Tomato', label: 'Tomato', quantity: 130, unit: 'g' },
      { pantryName: 'Olive oil', label: 'Olive oil', quantity: 6, unit: 'ml' },
    ],
    steps: ['Brown the chicken on both sides.', 'Cook the eggs to your liking.', 'Serve with fresh tomato.'],
  },
];

export const createDemoOffers = (referenceDate = new Date()): Offer[] => [
  { id: 'offer-ed-chicken', supermarket: 'El Dorado', product: 'Chicken breast', unit: 'kg', price: 329, regularPrice: 399, distanceKm: 0.9, validUntil: isoDay(5, referenceDate) },
  { id: 'offer-ed-eggs', supermarket: 'El Dorado', product: 'Eggs x12', unit: 'pack', price: 189, regularPrice: 219, distanceKm: 0.9, validUntil: isoDay(5, referenceDate) },
  { id: 'offer-ed-rice', supermarket: 'El Dorado', product: 'Rice 1 kg', unit: 'pack', price: 86, regularPrice: 105, distanceKm: 0.9, validUntil: isoDay(5, referenceDate) },
  { id: 'offer-disco-chicken', supermarket: 'Disco', product: 'Chicken breast', unit: 'kg', price: 359, regularPrice: 410, distanceKm: 2.4, validUntil: isoDay(4, referenceDate) },
  { id: 'offer-disco-eggs', supermarket: 'Disco', product: 'Eggs x12', unit: 'pack', price: 205, regularPrice: 229, distanceKm: 2.4, validUntil: isoDay(4, referenceDate) },
  { id: 'offer-disco-rice', supermarket: 'Disco', product: 'Rice 1 kg', unit: 'pack', price: 94, regularPrice: 112, distanceKm: 2.4, validUntil: isoDay(4, referenceDate) },
  { id: 'offer-tata-chicken', supermarket: 'Ta-Ta', product: 'Chicken breast', unit: 'kg', price: 345, regularPrice: 399, distanceKm: 1.2, validUntil: isoDay(3, referenceDate) },
  { id: 'offer-tata-eggs', supermarket: 'Ta-Ta', product: 'Eggs x12', unit: 'pack', price: 198, regularPrice: 220, distanceKm: 1.2, validUntil: isoDay(3, referenceDate) },
  { id: 'offer-tienda-chicken', supermarket: 'Tienda Inglesa', product: 'Chicken breast', unit: 'kg', price: 389, regularPrice: 425, distanceKm: 3.7, validUntil: isoDay(6, referenceDate) },
];

export const demoOffers = createDemoOffers(STATIC_DEMO_DATE);

export const transportConfig: Record<TransportMode, { speedKmh: number; costPerKm: number; label: string }> = {
  walking: { speedKmh: 5, costPerKm: 0, label: 'Walking' },
  bicycle: { speedKmh: 14, costPerKm: 0, label: 'Bicycle' },
  car: { speedKmh: 32, costPerKm: 14, label: 'Car' },
  motorcycle: { speedKmh: 30, costPerKm: 6, label: 'Motorcycle' },
};

export const createReceiptDemoItems = (referenceDate = new Date()) => createDemoPantry(referenceDate).map((item) => ({
  ...item,
  purchasedAt: referenceDate.toISOString(),
}));
