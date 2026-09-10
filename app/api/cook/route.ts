import { cookRecipe, getAppState } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { recipeId?: string };
    if (!body.recipeId) return Response.json({ error: 'Select a recipe first.' }, { status: 400 });
    await cookRecipe(body.recipeId);
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'The meal could not be logged.' }, { status: 500 });
  }
}
