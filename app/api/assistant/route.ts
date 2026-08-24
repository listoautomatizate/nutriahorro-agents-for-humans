import { getAppState } from '@/lib/database';

const contains = (text: string, words: string[]) => words.some((word) => text.includes(word));

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string };
    const message = body.message?.trim().toLowerCase();
    if (!message) return Response.json({ error: 'Escribi una pregunta.' }, { status: 400 });

    const agentUrl = process.env.NUTRIAHORRO_AGENT_URL?.replace(/\/$/, '');
    if (agentUrl) {
      try {
        const response = await fetch(`${agentUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: AbortSignal.timeout(12_000),
        });
        if (response.ok) return Response.json(await response.json());
      } catch {
        // Keep the product useful when the optional AWS agent is unavailable.
      }
    }

    const state = await getAppState();
    const urgent = state.pantry.filter((item) => item.status === 'soon').map((item) => item.name.toLowerCase());

    let answer = `Hoy priorizaria ${urgent.join(', ')}. La receta de ${state.recipes[0].name.toLowerCase()} aprovecha esos alimentos y demora ${state.recipes[0].prepMinutes} minutos.`;
    if (contains(message, ['oferta', 'ahorro', 'comprar', 'supermercado'])) {
      answer = 'Para esta compra conviene El Dorado: la canasta de prueba queda en $1.086 y esta a 900 metros. En modo caminando o bicicleta no agrego costo de traslado.';
    } else if (contains(message, ['vencer', 'vence', 'urgente', 'primero'])) {
      answer = `Usa primero ${urgent.join(', ')}. Guarda el pollo crudo sellado en el estante inferior y aplica primero en entrar, primero en salir dentro de cada zona segura.`;
    } else if (contains(message, ['caloria', 'proteina', 'macro'])) {
      answer = `Tu perfil de demostracion usa un rango general de ${state.profile.calorieMin} a ${state.profile.calorieMax} kcal, con ${state.profile.proteinGrams} g de proteina. Es orientativo y no sustituye una indicacion profesional.`;
    } else if (contains(message, ['rapido', 'tiempo', 'minuto'])) {
      const fastest = [...state.recipes].sort((a, b) => a.prepMinutes - b.prepMinutes)[0];
      answer = `La opcion mas rapida es ${fastest.name}: demora ${fastest.prepMinutes} minutos y usa ingredientes que ya tenes.`;
    }

    return Response.json({ answer, mode: 'demo-agent' });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'El agente no pudo responder.' }, { status: 500 });
  }
}
