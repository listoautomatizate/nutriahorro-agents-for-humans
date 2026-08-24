import { getAppState } from '@/lib/database';

export async function GET() {
  try {
    const agentUrl = process.env.NUTRIAHORRO_AGENT_URL?.replace(/\/$/, '');
    if (agentUrl) {
      try {
        const response = await fetch(`${agentUrl}/summary`, {
          signal: AbortSignal.timeout(12_000),
        });
        if (response.ok) return Response.json(await response.json());
      } catch {
        // Fall through so WhatsApp delivery never depends on a single service.
      }
    }

    const state = await getAppState();
    const urgent = state.pantry.filter((item) => item.status === 'soon');
    const low = state.pantry.filter((item) => item.status === 'low' || item.quantity <= 1);
    const recipe = state.recipes.find((item) => !state.cookedRecipeIds.includes(item.id)) || state.recipes[0];
    const message = [
      `Hola ${state.profile.name}, este es tu resumen de nutrIAhorro:`,
      '',
      `Prioriza hoy: ${urgent.length ? urgent.map((item) => item.name).join(', ') : 'no hay productos urgentes'}.`,
      `Comida sugerida: ${recipe.name} (${recipe.prepMinutes} min, ${recipe.calories} kcal).`,
      `Poco stock: ${low.length ? low.map((item) => item.name).join(', ') : 'ningun producto'}.`,
      'Compra conveniente: El Dorado, a 900 m. Ahorro estimado de la canasta: $238.',
      '',
      'Los objetivos nutricionales son orientativos y no reemplazan asesoramiento profesional.',
    ].join('\n');
    return Response.json({ message });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo preparar el resumen.' }, { status: 500 });
  }
}
