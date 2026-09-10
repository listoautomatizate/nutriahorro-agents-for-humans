import { cookRecipe, getAppState } from '@/lib/database';
import { getAgentEnvironment } from '@/lib/agent-environment';

const contains = (text: string, words: string[]) => words.some((word) => text.includes(word));

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string; confirmedAction?: Record<string, unknown> };
    const originalMessage = body.message?.trim();
    if (!originalMessage) return Response.json({ error: 'Write a question.' }, { status: 400 });
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
      if (!recipe) return Response.json({ error: 'I could not find that recipe.' }, { status: 404 });
      await cookRecipe(recipe.id);
      return Response.json({
        answer: `Done. I logged ${recipe.name}, updated today's calories and macros, and deducted the exact pantry quantities.`,
        mode: 'local-fallback',
        tools: ['register_cooked_meal'],
        actions: [{ type: 'cook_recipe', recipe_id: recipe.id, recipe_name: recipe.name, status: 'approved' }],
        state: await getAppState(),
      });
    }

    const urgent = state.pantry.filter((item) => item.status === 'soon').map((item) => item.name.toLowerCase());
    const wantsMeal = contains(message, ['recipe', 'meal', 'eat', 'cook', 'quick', 'minute']);
    const wantsProtein = contains(message, ['high protein', 'more protein', 'most protein']);

    let answer = `Today I would prioritize ${urgent.join(', ')}. ${state.recipes[0].name} uses those foods and takes ${state.recipes[0].prepMinutes} minutes.`;
    let tools = ['inspect_pantry', 'suggest_meals', 'get_daily_progress'];
    let actions: Array<{ type: 'cook_recipe'; recipe_id: string; recipe_name: string; status: 'confirmation_required' }> = [];
    if (contains(message, ['deal', 'offer', 'save', 'saving', 'buy', 'shop', 'supermarket', 'grocery'])) {
      answer = 'El Dorado is the best option for this shop: the demo basket costs UYU 1,086 and the store is 900 meters away. Walking or cycling adds no travel cost.';
      tools = ['inspect_pantry', 'compare_nearby_shopping'];
    } else if (contains(message, ['expire', 'expiry', 'urgent', 'first', 'use soon'])) {
      answer = `Use ${urgent.join(', ')} first. Keep raw chicken sealed on the bottom shelf and follow first in, first out within each safe storage zone.`;
      tools = ['inspect_pantry'];
    } else if (wantsMeal) {
      const requestedMinutes = Number(message.match(/\b(\d{1,3})\s*(?:min|minute|minutes)\b/)?.[1] || state.profile.mealPrepMinutes);
      const candidates = state.recipes.filter((recipe) => recipe.prepMinutes <= requestedMinutes);
      const recipe = (wantsProtein
        ? [...candidates].sort((a, b) => b.protein - a.protein)[0]
        : [...candidates].sort((a, b) => a.prepMinutes - b.prepMinutes)[0]) || state.recipes[0];
      answer = `I recommend ${recipe.name}. It takes ${recipe.prepMinutes} minutes, uses food you already have, and provides ${recipe.calories} kcal, ${recipe.protein} g of protein, ${recipe.carbs} g of carbs, and ${recipe.fat} g of fat. ${wantsProtein ? 'It is the highest-protein option that fits your available time.' : 'It is the quickest option that fits your available time.'} I can log it, but I need your confirmation first.`;
      tools = ['get_user_profile', 'inspect_pantry', 'get_daily_progress', 'suggest_meals'];
      actions = [{ type: 'cook_recipe', recipe_id: recipe.id, recipe_name: recipe.name, status: 'confirmation_required' }];
    } else if (contains(message, ['calorie', 'protein', 'carb', 'fat', 'macro', 'progress'])) {
      const { consumed, remaining } = state.dailyIntake;
      const calorieText = state.dailyIntake.calorieStatus === 'over'
        ? `you are ${Math.abs(remaining.calories)} kcal over your maximum`
        : state.dailyIntake.calorieStatus === 'in-range'
          ? 'you are within your calorie range'
          : `you need ${remaining.calories} kcal to reach your range`;
      const macroText = (value: number, nutrient: string) => value >= 0
        ? `you have ${value} g of ${nutrient} remaining`
        : `you are ${Math.abs(value)} g over your ${nutrient} target`;
      answer = `Today you have logged ${consumed.calories} kcal, ${consumed.protein} g of protein, ${consumed.carbs} g of carbs, and ${consumed.fat} g of fat; ${calorieText}. Against your general targets, ${macroText(remaining.protein, 'protein')}, ${macroText(remaining.carbs, 'carbs')}, and ${macroText(remaining.fat, 'fat')}.`;
      tools = ['get_daily_progress'];
    }

    return Response.json({ answer, mode: 'local-fallback', tools, actions });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'The agent could not respond.' }, { status: 500 });
  }
}
