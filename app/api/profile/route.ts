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
      dietaryPreference: String(body.dietaryPreference ?? 'Sin preferencia').trim(),
      allergies: String(body.allergies ?? '').trim(),
      dislikes: String(body.dislikes ?? '').trim(),
    };

    if (!profile.name || !profile.city) return Response.json({ error: 'Completa tu nombre y ciudad.' }, { status: 400 });
    if (!inRange(profile.age, 18, 100)) return Response.json({ error: 'La edad debe estar entre 18 y 100 anos.' }, { status: 400 });
    if (!inRange(profile.heightCm, 120, 230)) return Response.json({ error: 'Revisa la altura ingresada.' }, { status: 400 });
    if (!inRange(profile.currentWeightKg, 35, 300) || !inRange(profile.goalWeightKg, 35, 300)) return Response.json({ error: 'Revisa el peso actual y el objetivo.' }, { status: 400 });
    if (!goals.includes(profile.goalType) || !activityLevels.includes(profile.activityLevel) || !metabolicReferences.includes(profile.metabolicReference)) return Response.json({ error: 'Selecciona opciones validas para calcular tu objetivo.' }, { status: 400 });
    if (!inRange(profile.exerciseDaysPerWeek, 0, 7) || !inRange(profile.exerciseMinutes, 0, 300) || !inRange(profile.mealPrepMinutes, 5, 180)) return Response.json({ error: 'Revisa el tiempo de ejercicio y cocina.' }, { status: 400 });
    if (profile.goalType === 'lose_fat' && profile.goalWeightKg >= profile.currentWeightKg) return Response.json({ error: 'Para perder grasa, el peso objetivo debe ser menor al actual.' }, { status: 400 });
    if (profile.goalType === 'gain_muscle' && profile.goalWeightKg <= profile.currentWeightKg) return Response.json({ error: 'Para ganar masa, el peso objetivo debe ser mayor al actual.' }, { status: 400 });

    Object.assign(profile, calculateNutritionTargets(profile));
    await updateProfile(profile);
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudieron guardar tus objetivos.' }, { status: 500 });
  }
}
