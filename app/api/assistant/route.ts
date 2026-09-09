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

    if (body.confirmedAction?.type === 'cook_recipe' && typeof body.confirmedAction.recipe_id === 'string') {
      const recipe = state.recipes.find((item) => item.id === body.confirmedAction?.recipe_id);
      if (!recipe) return Response.json({ error: 'No encontre esa receta.' }, { status: 404 });
      await cookRecipe(recipe.id);
      return Response.json({
        answer: `Listo. Registre ${recipe.name}. Actualice tus calorias y macros del dia y desconte las cantidades exactas de la despensa.`,
        mode: 'local-fallback',
        tools: ['register_cooked_meal'],
        actions: [{ type: 'cook_recipe', recipe_id: recipe.id, recipe_name: recipe.name, status: 'approved' }],
        state: await getAppState(),
      });
    }

    const urgent = state.pantry.filter((item) => item.status === 'soon').map((item) => item.name.toLowerCase());
    const wantsMeal = contains(message, ['receta', 'comer', 'cocinar', 'rapido', 'rápido', 'minuto']);
    const wantsProtein = contains(message, ['alto en proteina', 'alto en proteína', 'alta en proteina', 'alta en proteína', 'mas proteina', 'más proteína']);

    let answer = `Hoy priorizaria ${urgent.join(', ')}. La receta de ${state.recipes[0].name.toLowerCase()} aprovecha esos alimentos y demora ${state.recipes[0].prepMinutes} minutos.`;
    let tools = ['inspect_pantry', 'suggest_meals', 'get_daily_progress'];
    let actions: Array<{ type: 'cook_recipe'; recipe_id: string; recipe_name: string; status: 'confirmation_required' }> = [];
    if (contains(message, ['oferta', 'ahorro', 'comprar', 'supermercado'])) {
      answer = 'Para esta compra conviene El Dorado: la canasta de prueba queda en $1.086 y esta a 900 metros. En modo caminando o bicicleta no agrego costo de traslado.';
      tools = ['inspect_pantry', 'compare_nearby_shopping'];
    } else if (contains(message, ['vencer', 'vence', 'urgente', 'primero'])) {
      answer = `Usa primero ${urgent.join(', ')}. Guarda el pollo crudo sellado en el estante inferior y aplica primero en entrar, primero en salir dentro de cada zona segura.`;
      tools = ['inspect_pantry'];
    } else if (wantsMeal) {
      const requestedMinutes = Number(message.match(/\b(\d{1,3})\s*(?:min|minuto|minutos)\b/)?.[1] || state.profile.mealPrepMinutes);
      const candidates = state.recipes.filter((recipe) => recipe.prepMinutes <= requestedMinutes);
      const recipe = (wantsProtein
        ? [...candidates].sort((a, b) => b.protein - a.protein)[0]
        : [...candidates].sort((a, b) => a.prepMinutes - b.prepMinutes)[0]) || state.recipes[0];
      answer = `Te recomiendo ${recipe.name}: demora ${recipe.prepMinutes} minutos, usa alimentos que ya tenes y aporta ${recipe.calories} kcal, ${recipe.protein} g de proteina, ${recipe.carbs} g de carbohidratos y ${recipe.fat} g de grasas. ${wantsProtein ? 'Es la opcion con mas proteina que entra en tu tiempo disponible.' : 'Es la opcion mas rapida que entra en tu tiempo disponible.'} Puedo registrarla, pero primero necesito tu confirmacion.`;
      tools = ['get_user_profile', 'inspect_pantry', 'get_daily_progress', 'suggest_meals'];
      actions = [{ type: 'cook_recipe', recipe_id: recipe.id, recipe_name: recipe.name, status: 'confirmation_required' }];
    } else if (contains(message, ['caloria', 'caloría', 'proteina', 'proteína', 'macro'])) {
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
      tools = ['get_daily_progress'];
    }

    return Response.json({ answer, mode: 'local-fallback', tools, actions });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'El agente no pudo responder.' }, { status: 500 });
  }
}
