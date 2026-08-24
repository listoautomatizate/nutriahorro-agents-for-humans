export type TransportMode = 'walking' | 'bicycle' | 'car' | 'motorcycle';
export type GoalType = 'lose_fat' | 'maintain' | 'gain_muscle' | 'improve_fitness';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high';
export type MetabolicReference = 'female' | 'male' | 'neutral';

export type Profile = {
  id: string;
  name: string;
  city: string;
  age: number;
  metabolicReference: MetabolicReference;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  goalType: GoalType;
  activityLevel: ActivityLevel;
  exerciseDaysPerWeek: number;
  exerciseMinutes: number;
  mealPrepMinutes: number;
  dietaryPreference: string;
  allergies: string;
  dislikes: string;
  calorieMin: number;
  calorieMax: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  transportMode: TransportMode;
};

export type PantryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchasedAt: string;
  bestBefore: string;
  source: string;
  status: 'ok' | 'soon' | 'low';
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  prepMinutes: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  priority: string;
  ingredients: Array<{
    pantryName: string;
    label: string;
    quantity: number;
    unit: string;
  }>;
  steps: string[];
};

export type Offer = {
  id: string;
  supermarket: string;
  product: string;
  unit: string;
  price: number;
  regularPrice: number;
  distanceKm: number;
  validUntil: string;
};

export type ShoppingOption = {
  supermarket: string;
  distanceKm: number;
  travelMinutes: number;
  basketPrice: number;
  travelCost: number;
  effectiveCost: number;
  savings: number;
  items: Offer[];
};

export type AppState = {
  profile: Profile;
  pantry: PantryItem[];
  recipes: Recipe[];
  offers: Offer[];
  cookedRecipeIds: string[];
  lastUploadName: string | null;
};
