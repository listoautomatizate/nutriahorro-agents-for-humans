import { getAppState, updateProfile } from '@/lib/database';
import { calculateNutritionTargets } from '@/lib/nutrition';
import type { ActivityLevel, GoalType, MetabolicReference, Profile } from '@/lib/types';

const goals: GoalType[] = ['lose_fat', 'maintain', 'gain_muscle', 'improve_fitness'];
const activityLevels: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'high'];
const metabolicReferences: MetabolicReference[] = ['female', 'male', 'neutral'];

const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;

export async function POST(request: Request) {
  try {
    const current = await getAppState();
    const body = await request.json() as Partial<Profile>;
    const profile: Profile = {
      ...current.profile,
      name: String(body.name ?? '').trim(),
      city: String(body.city ?? '').trim(),
      age: Number(body.age),
      metabolicReference: body.metabolicReference as MetabolicReference,
      heightCm: Number(body.heightCm),
      currentWeightKg: Number(body.currentWeightKg),
      goalWeightKg: Number(body.goalWeightKg),
      goalType: body.goalType as GoalType,
      activityLevel: body.activityLevel as ActivityLevel,
      exerciseDaysPerWeek: Number(body.exerciseDaysPerWeek),
      exerciseMinutes: Number(body.exerciseMinutes),
      mealPrepMinutes: Number(body.mealPrepMinutes),
      dietaryPreference: String(body.dietaryPreference ?? 'No preference').trim(),
      allergies: String(body.allergies ?? '').trim(),
      dislikes: String(body.dislikes ?? '').trim(),
    };

    if (!profile.name || !profile.city) return Response.json({ error: 'Enter your name and city.' }, { status: 400 });
    if (!inRange(profile.age, 18, 100)) return Response.json({ error: 'Age must be between 18 and 100.' }, { status: 400 });
    if (!inRange(profile.heightCm, 120, 230)) return Response.json({ error: 'Check the height you entered.' }, { status: 400 });
    if (!inRange(profile.currentWeightKg, 35, 300) || !inRange(profile.goalWeightKg, 35, 300)) return Response.json({ error: 'Check your current and goal weights.' }, { status: 400 });
    if (!goals.includes(profile.goalType) || !activityLevels.includes(profile.activityLevel) || !metabolicReferences.includes(profile.metabolicReference)) return Response.json({ error: 'Select valid options to calculate your targets.' }, { status: 400 });
    if (!inRange(profile.exerciseDaysPerWeek, 0, 7) || !inRange(profile.exerciseMinutes, 0, 300) || !inRange(profile.mealPrepMinutes, 5, 180)) return Response.json({ error: 'Check your exercise and cooking time.' }, { status: 400 });
    if (profile.goalType === 'lose_fat' && profile.goalWeightKg >= profile.currentWeightKg) return Response.json({ error: 'For a fat-loss goal, your goal weight must be below your current weight.' }, { status: 400 });
    if (profile.goalType === 'gain_muscle' && profile.goalWeightKg <= profile.currentWeightKg) return Response.json({ error: 'For a muscle-gain goal, your goal weight must be above your current weight.' }, { status: 400 });

    Object.assign(profile, calculateNutritionTargets(profile));
    await updateProfile(profile);
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Your goals could not be saved.' }, { status: 500 });
  }
}
