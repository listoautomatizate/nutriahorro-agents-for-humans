import { cookRecipe, getAppState } from '@/lib/database';
import { getAgentEnvironment } from '@/lib/agent-environment';

const contains = (text: string, words: string[]) => words.some((word) => text.includes(word));

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string; confirmedAction?: Record<string, unknown> };
    const originalMessage = body.message?.trim();
    if (!originalMessage) return Response.json({ error: 'Escribi una pregunta.' }, { status: 400 });
    const message = originalMessage.toLowerCase();
    const state = await getAppState();

    const { url: agentUrl, token: agentToken } = getAgentEnvironment();
    if (agentUrl) {
      try {
        const response = await fetch(`${agentUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          },
          body: JSON.stringify({ message: originalMessage, state, confirmedAction: body.confirmedAction }),
          signal: AbortSignal.timeout(25_000),
        });
        if (response.ok) {
          const result = await response.json() as {
            answer?: string;
            actions?: Array<{ type?: string; recipe_id?: string; status?: string }>;
            [key: string]: unknown;
          };
          const approved = result.actions?.find((action) => action.type === 'cook_recipe' && action.status === 'approved' && action.recipe_id);
          if (approved?.recipe_id) {
            await cookRecipe(approved.recipe_id);
            return Response.json({ ...result, state: await getAppState() });
          }
          return Response.json(result);
        }
      } catch {
        // Keep the product useful when the optional AWS agent is unavailable.
      }
    }

    const urgent = state.pantry.filter((item) => item.status === 'soon').map((item) => item.name.toLowerCase());

    let answer = `Hoy priorizaria ${urgent.join(', ')}. La receta de ${state.recipes[0].name.toLowerCase()} aprovecha esos alimentos y demora ${state.recipes[0].prepMinutes} minutos.`;
    if (contains(message, ['oferta', 'ahorro', 'comprar', 'supermercado'])) {
      answer = 'Para esta compra conviene El Dorado: la canasta de prueba queda en $1.086 y esta a 900 metros. En modo caminando o bicicleta no agrego costo de traslado.';
    } else if (contains(message, ['vencer', 'vence', 'urgente', 'primero'])) {
      answer = `Usa primero ${urgent.join(', ')}. Guarda el pollo crudo sellado en el estante inferior y aplica primero en entrar, primero en salir dentro de cada zona segura.`;
    } else if (contains(message, ['caloria', 'proteina', 'macro'])) {
      const { consumed, remaining } = state.dailyIntake;
      const calorieText = state.dailyIntake.calorieStatus === 'over'
        ? `superaste el maximo por ${Math.abs(remaining.calories)} kcal`
        : state.dailyIntake.calorieStatus === 'in-range'
          ? 'ya estas dentro de tu rango calorico'
          : `te faltan ${remaining.calories} kcal para entrar en tu rango`;
      const macroText = (value: number, nutrient: string) => value >= 0
        ? `te quedan ${value} g de ${nutrient}`
        : `superaste la meta de ${nutrient} por ${Math.abs(value)} g`;
      answer = `Hoy llevas ${consumed.calories} kcal, ${consumed.protein} g de proteina, ${consumed.carbs} g de carbohidratos y ${consumed.fat} g de grasas; ${calorieText}. En tus metas orientativas, ${macroText(remaining.protein, 'proteina')}, ${macroText(remaining.carbs, 'carbohidratos')} y ${macroText(remaining.fat, 'grasas')}.`;
    } else if (contains(message, ['rapido', 'tiempo', 'minuto'])) {
      const fastest = [...state.recipes].sort((a, b) => a.prepMinutes - b.prepMinutes)[0];
      answer = `La opcion mas rapida es ${fastest.name}: demora ${fastest.prepMinutes} minutos y usa ingredientes que ya tenes.`;
    }

    return Response.json({ answer, mode: 'demo-agent', tools: ['memoria-local'], actions: [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'El agente no pudo responder.' }, { status: 500 });
  }
}
