import type { ActivityLevel, GoalType, MetabolicReference, Profile } from './types';

export type NutritionTargetInput = Pick<Profile,
  'age' | 'metabolicReference' | 'heightCm' | 'currentWeightKg' | 'goalType' | 'activityLevel' | 'exerciseDaysPerWeek' | 'exerciseMinutes'
>;

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

const goalFactors: Record<GoalType, number> = {
  lose_fat: 0.85,
  maintain: 1,
  gain_muscle: 1.1,
  improve_fitness: 0.95,
};

const metabolicOffsets: Record<MetabolicReference, number> = {
  female: -161,
  male: 5,
  neutral: -78,
};

const proteinPerKg: Record<GoalType, number> = {
  lose_fat: 1.8,
  maintain: 1.5,
  gain_muscle: 1.8,
  improve_fitness: 1.6,
};

const roundTo25 = (value: number) => Math.round(value / 25) * 25;

export function calculateNutritionTargets(input: NutritionTargetInput) {
  const bmr = (10 * input.currentWeightKg) + (6.25 * input.heightCm) - (5 * input.age) + metabolicOffsets[input.metabolicReference];
  const averageExerciseHours = (input.exerciseDaysPerWeek * input.exerciseMinutes) / (7 * 60);
  const movementFactor = activityFactors[input.activityLevel] + Math.min(0.25, averageExerciseHours * 0.15);
  const centerCalories = Math.max(1200, roundTo25(bmr * movementFactor * goalFactors[input.goalType]));
  const proteinGrams = Math.round(input.currentWeightKg * proteinPerKg[input.goalType]);
  const fatGrams = Math.max(40, Math.round(input.currentWeightKg * 0.8));
  const carbsGrams = Math.max(80, Math.round((centerCalories - (proteinGrams * 4) - (fatGrams * 9)) / 4));

  return {
    calorieMin: Math.max(1200, centerCalories - 50),
    calorieMax: centerCalories + 50,
    proteinGrams,
    carbsGrams,
    fatGrams,
  };
}
