import { cookRecipe, getAppState } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { recipeId?: string };
    if (!body.recipeId) return Response.json({ error: 'Falta seleccionar una receta.' }, { status: 400 });
    await cookRecipe(body.recipeId);
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo registrar la comida.' }, { status: 500 });
  }
}
