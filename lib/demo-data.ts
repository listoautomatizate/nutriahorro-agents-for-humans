import type { Offer, PantryItem, Profile, Recipe, TransportMode } from './types';

const isoDay = (daysFromNow: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

export const demoProfile: Profile = {
  id: 'public-demo',
  name: 'Usuario Demo',
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
  dietaryPreference: 'Sin preferencia',
  allergies: 'Ninguna',
  dislikes: '',
  calorieMin: 1825,
  calorieMax: 1925,
  proteinGrams: 130,
  carbsGrams: 208,
  fatGrams: 58,
  transportMode: 'walking',
};

export const demoPantry: PantryItem[] = [
  { id: 'pantry-chicken', name: 'Pechuga de pollo', category: 'Proteina', quantity: 800, unit: 'g', purchasedAt: isoDay(-1), bestBefore: isoDay(2), source: 'Ta-Ta', status: 'soon' },
  { id: 'pantry-rice', name: 'Arroz', category: 'Carbohidrato', quantity: 1000, unit: 'g', purchasedAt: isoDay(-1), bestBefore: isoDay(180), source: 'Ta-Ta', status: 'ok' },
  { id: 'pantry-eggs', name: 'Huevos', category: 'Proteina', quantity: 12, unit: 'unidades', purchasedAt: isoDay(-1), bestBefore: isoDay(20), source: 'Ta-Ta', status: 'ok' },
  { id: 'pantry-avocado', name: 'Palta', category: 'Fruta', quantity: 3, unit: 'unidades', purchasedAt: isoDay(-1), bestBefore: isoDay(3), source: 'Ta-Ta', status: 'soon' },
  { id: 'pantry-tomato', name: 'Tomate', category: 'Verdura', quantity: 1000, unit: 'g', purchasedAt: isoDay(-1), bestBefore: isoDay(2), source: 'Ta-Ta', status: 'soon' },
  { id: 'pantry-oil', name: 'Aceite de oliva', category: 'Grasa', quantity: 750, unit: 'ml', purchasedAt: isoDay(-1), bestBefore: isoDay(240), source: 'Ta-Ta', status: 'ok' },
];

export const demoRecipes: Recipe[] = [
  {
    id: 'recipe-chicken-rice',
    name: 'Pollo con arroz, tomate y palta',
    description: 'Un plato completo que prioriza los frescos con vencimiento mas cercano.',
    prepMinutes: 25,
    calories: 532,
    protein: 46,
    carbs: 48,
    fat: 17,
    priority: 'Usa lo mas urgente',
    ingredients: [
      { pantryName: 'Pechuga de pollo', label: 'Pechuga de pollo', quantity: 180, unit: 'g' },
      { pantryName: 'Arroz', label: 'Arroz', quantity: 70, unit: 'g' },
      { pantryName: 'Tomate', label: 'Tomate', quantity: 180, unit: 'g' },
      { pantryName: 'Palta', label: 'Media palta', quantity: 0.5, unit: 'unidades' },
      { pantryName: 'Aceite de oliva', label: 'Aceite de oliva', quantity: 8, unit: 'ml' },
    ],
    steps: ['Cocina el arroz hasta que quede tierno.', 'Dora el pollo con la mitad del aceite.', 'Sirve con tomate, palta y el resto del aceite.'],
  },
  {
    id: 'recipe-omelette',
    name: 'Omelette cremoso con tomate',
    description: 'Rapido para un dia con poco tiempo y usando ingredientes disponibles.',
    prepMinutes: 15,
    calories: 408,
    protein: 31,
    carbs: 13,
    fat: 25,
    priority: 'Rapida',
    ingredients: [
      { pantryName: 'Huevos', label: 'Huevos', quantity: 3, unit: 'unidades' },
      { pantryName: 'Tomate', label: 'Tomate', quantity: 160, unit: 'g' },
      { pantryName: 'Palta', label: 'Media palta', quantity: 0.5, unit: 'unidades' },
      { pantryName: 'Aceite de oliva', label: 'Aceite de oliva', quantity: 5, unit: 'ml' },
    ],
    steps: ['Bate los huevos y condimenta.', 'Cocina a fuego medio con el aceite.', 'Agrega tomate y sirve con la palta.'],
  },
  {
    id: 'recipe-bowl',
    name: 'Bowl tibio de pollo y palta',
    description: 'Alto en proteina, sencillo y flexible para el almuerzo o la cena.',
    prepMinutes: 20,
    calories: 487,
    protein: 43,
    carbs: 39,
    fat: 18,
    priority: 'Alta en proteina',
    ingredients: [
      { pantryName: 'Pechuga de pollo', label: 'Pechuga de pollo', quantity: 170, unit: 'g' },
      { pantryName: 'Arroz', label: 'Arroz', quantity: 55, unit: 'g' },
      { pantryName: 'Tomate', label: 'Tomate', quantity: 120, unit: 'g' },
      { pantryName: 'Palta', label: 'Media palta', quantity: 0.5, unit: 'unidades' },
    ],
    steps: ['Cocina el arroz.', 'Corta y dora el pollo.', 'Combina todo con tomate y palta.'],
  },
  {
    id: 'recipe-rice-eggs',
    name: 'Arroz salteado con huevo y tomate',
    description: 'Una comida economica que aprovecha los basicos de la despensa.',
    prepMinutes: 18,
    calories: 449,
    protein: 24,
    carbs: 56,
    fat: 14,
    priority: 'Economica',
    ingredients: [
      { pantryName: 'Huevos', label: 'Huevos', quantity: 2, unit: 'unidades' },
      { pantryName: 'Arroz', label: 'Arroz', quantity: 75, unit: 'g' },
      { pantryName: 'Tomate', label: 'Tomate', quantity: 150, unit: 'g' },
      { pantryName: 'Aceite de oliva', label: 'Aceite de oliva', quantity: 5, unit: 'ml' },
    ],
    steps: ['Cocina el arroz.', 'Saltea el tomate y agrega los huevos.', 'Integra el arroz y cocina dos minutos mas.'],
  },
  {
    id: 'recipe-chicken-eggs',
    name: 'Churrasco de pollo con huevo',
    description: 'Proteina abundante y preparacion directa para una comida saciante.',
    prepMinutes: 22,
    calories: 501,
    protein: 55,
    carbs: 12,
    fat: 25,
    priority: 'Saciante',
    ingredients: [
      { pantryName: 'Pechuga de pollo', label: 'Pechuga de pollo', quantity: 200, unit: 'g' },
      { pantryName: 'Huevos', label: 'Huevos', quantity: 2, unit: 'unidades' },
      { pantryName: 'Tomate', label: 'Tomate', quantity: 130, unit: 'g' },
      { pantryName: 'Aceite de oliva', label: 'Aceite de oliva', quantity: 6, unit: 'ml' },
    ],
    steps: ['Dora el pollo por ambos lados.', 'Cocina los huevos a tu gusto.', 'Sirve con tomate fresco.'],
  },
];

export const demoOffers: Offer[] = [
  { id: 'offer-ed-chicken', supermarket: 'El Dorado', product: 'Pechuga de pollo', unit: 'kg', price: 329, regularPrice: 399, distanceKm: 0.9, validUntil: isoDay(5) },
  { id: 'offer-ed-eggs', supermarket: 'El Dorado', product: 'Huevos x12', unit: 'pack', price: 189, regularPrice: 219, distanceKm: 0.9, validUntil: isoDay(5) },
  { id: 'offer-ed-rice', supermarket: 'El Dorado', product: 'Arroz 1 kg', unit: 'pack', price: 86, regularPrice: 105, distanceKm: 0.9, validUntil: isoDay(5) },
  { id: 'offer-disco-chicken', supermarket: 'Disco', product: 'Pechuga de pollo', unit: 'kg', price: 359, regularPrice: 410, distanceKm: 2.4, validUntil: isoDay(4) },
  { id: 'offer-disco-eggs', supermarket: 'Disco', product: 'Huevos x12', unit: 'pack', price: 205, regularPrice: 229, distanceKm: 2.4, validUntil: isoDay(4) },
  { id: 'offer-disco-rice', supermarket: 'Disco', product: 'Arroz 1 kg', unit: 'pack', price: 94, regularPrice: 112, distanceKm: 2.4, validUntil: isoDay(4) },
  { id: 'offer-tata-chicken', supermarket: 'Ta-Ta', product: 'Pechuga de pollo', unit: 'kg', price: 345, regularPrice: 399, distanceKm: 1.2, validUntil: isoDay(3) },
  { id: 'offer-tata-eggs', supermarket: 'Ta-Ta', product: 'Huevos x12', unit: 'pack', price: 198, regularPrice: 220, distanceKm: 1.2, validUntil: isoDay(3) },
  { id: 'offer-tienda-chicken', supermarket: 'Tienda Inglesa', product: 'Pechuga de pollo', unit: 'kg', price: 389, regularPrice: 425, distanceKm: 3.7, validUntil: isoDay(6) },
];

export const transportConfig: Record<TransportMode, { speedKmh: number; costPerKm: number; label: string }> = {
  walking: { speedKmh: 5, costPerKm: 0, label: 'Caminando' },
  bicycle: { speedKmh: 14, costPerKm: 0, label: 'Bicicleta' },
  car: { speedKmh: 32, costPerKm: 14, label: 'Auto' },
  motorcycle: { speedKmh: 30, costPerKm: 6, label: 'Moto' },
};

export const receiptDemoItems = demoPantry.map((item) => ({
  ...item,
  purchasedAt: new Date().toISOString(),
}));
