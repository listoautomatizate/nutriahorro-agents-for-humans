from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Callable, TypeVar

try:
    from strands import tool
except ImportError:  # Allows offline unit tests before AWS dependencies are installed.
    F = TypeVar("F", bound=Callable[..., Any])

    def tool(function: F) -> F:
        return function

from runtime_context import (
    current_confirmation,
    current_state,
    is_remote_state,
    record_action,
)
from store import store


TRANSPORT = {
    "walking": {"label": "walking", "speed": 5, "cost_km": 0},
    "bicycle": {"label": "bicycle", "speed": 14, "cost_km": 0},
    "car": {"label": "car", "speed": 32, "cost_km": 14},
    "motorcycle": {"label": "motorcycle", "speed": 30, "cost_km": 6},
}


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False)


def _profile(data: dict[str, Any]) -> dict[str, Any]:
    profile = data["profile"]
    if "calorieMin" not in profile:
        return profile
    return {
        "name": profile["name"],
        "city": profile["city"],
        "age": profile["age"],
        "height_cm": profile["heightCm"],
        "current_weight_kg": profile["currentWeightKg"],
        "goal_weight_kg": profile["goalWeightKg"],
        "goal": profile["goalType"],
        "activity_level": profile["activityLevel"],
        "exercise_days_per_week": profile["exerciseDaysPerWeek"],
        "exercise_minutes": profile["exerciseMinutes"],
        "meal_prep_minutes": profile["mealPrepMinutes"],
        "dietary_preference": profile["dietaryPreference"],
        "allergies": profile["allergies"],
        "dislikes": profile["dislikes"],
        "calorie_range": [profile["calorieMin"], profile["calorieMax"]],
        "protein_grams": profile["proteinGrams"],
        "carbs_grams": profile["carbsGrams"],
        "fat_grams": profile["fatGrams"],
        "transport": profile["transportMode"],
    }


def _days_left(item: dict[str, Any]) -> int:
    if "days_left" in item:
        return int(item["days_left"])
    best_before = str(item.get("bestBefore", ""))
    try:
        deadline = datetime.fromisoformat(best_before.replace("Z", "+00:00"))
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        return max(-999, (deadline.date() - datetime.now(timezone.utc).date()).days)
    except ValueError:
        return 999


def _pantry(data: dict[str, Any]) -> list[dict[str, Any]]:
    return [{**item, "days_left": _days_left(item)} for item in data["pantry"]]


def _recipe_minutes(recipe: dict[str, Any]) -> int:
    return int(recipe.get("minutes", recipe.get("prepMinutes", 0)))


def _recipe_uses(recipe: dict[str, Any]) -> list[str]:
    if "uses" in recipe:
        return list(recipe["uses"])
    return [str(item["pantryName"]) for item in recipe.get("ingredients", [])]


@tool
def get_user_profile() -> str:
    """Return the user's wellness goals, location, nutrition range, and preferred transport."""
    return _json(_profile(current_state()))


@tool
def inspect_pantry(max_days_left: int = 4) -> str:
    """List pantry stock and flag items that should be prioritized.

    Args:
        max_days_left: Include items expiring in this many days in the priority list.
    """
    pantry = _pantry(current_state())
    priority = [item for item in pantry if item["days_left"] <= max_days_left]
    low_stock = [
        item for item in pantry
        if item["quantity"] <= (2 if item.get("unit") == "units" else 150)
    ]
    return _json({"pantry": pantry, "priority": priority, "low_stock": low_stock})


@tool
def get_daily_progress() -> str:
    """Return today's consumed and remaining calories, protein, carbohydrates, and fat."""
    return _json(_daily_progress_data())


def _daily_progress_data() -> dict[str, Any]:
    data = current_state()
    if "dailyIntake" in data:
        return data["dailyIntake"]

    targets = _profile(data)
    recipes = {recipe["id"]: recipe for recipe in data["recipes"]}
    consumed = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    meals = []
    for entry in data.get("cooked", []):
        recipe = recipes.get(entry.get("recipe_id"))
        if not recipe:
            continue
        meal = {
            "recipe_id": recipe["id"],
            "recipe_name": recipe["name"],
            "cooked_at": entry.get("cooked_at"),
            **{nutrient: int(recipe.get(nutrient, 0)) for nutrient in consumed},
        }
        meals.append(meal)
        for nutrient in consumed:
            consumed[nutrient] += meal[nutrient]
    calorie_min, calorie_max = targets["calorie_range"]
    status = "below" if consumed["calories"] < calorie_min else "in-range" if consumed["calories"] <= calorie_max else "over"
    return {
        "consumed": consumed,
        "remaining": {
            "calories": calorie_min - consumed["calories"] if status == "below" else 0 if status == "in-range" else calorie_max - consumed["calories"],
            "protein": targets["protein_grams"] - consumed["protein"],
            "carbs": targets["carbs_grams"] - consumed["carbs"],
            "fat": targets["fat_grams"] - consumed["fat"],
        },
        "calorieStatus": status,
        "meals": meals,
    }


@tool
def suggest_meals(max_minutes: int = 30, minimum_protein: int = 0) -> str:
    """Suggest meals compatible with available pantry items and time.

    Args:
        max_minutes: Maximum preparation time requested by the user.
        minimum_protein: Optional minimum grams of protein per meal.
    """
    return _json(_suggest_meals_data(max_minutes, minimum_protein))


def _suggest_meals_data(max_minutes: int, minimum_protein: int = 0) -> list[dict[str, Any]]:
    data = current_state()
    inventory: dict[tuple[str, str], float] = {}
    available = set()
    for item in data["pantry"]:
        if item["quantity"] <= 0:
            continue
        available.add(item["name"])
        key = (str(item["name"]).lower(), str(item.get("unit", "")))
        inventory[key] = inventory.get(key, 0) + float(item["quantity"])

    def has_enough_stock(recipe: dict[str, Any]) -> bool:
        ingredients = recipe.get("ingredients", [])
        if not ingredients:
            return set(_recipe_uses(recipe)).issubset(available)
        return all(
            inventory.get((str(ingredient["pantryName"]).lower(), str(ingredient["unit"])), 0)
            >= float(ingredient["quantity"])
            for ingredient in ingredients
        )

    matches = [
        recipe for recipe in data["recipes"]
        if _recipe_minutes(recipe) <= max_minutes
        and recipe["protein"] >= minimum_protein
        and has_enough_stock(recipe)
    ]
    urgent_names = {item["name"] for item in _pantry(data) if item["days_left"] <= 3}
    for recipe in matches:
        recipe["minutes"] = _recipe_minutes(recipe)
        recipe["uses"] = _recipe_uses(recipe)
        recipe["urgent_items_used"] = sorted(set(recipe["uses"]) & urgent_names)
    matches.sort(key=lambda recipe: (-len(recipe["urgent_items_used"]), recipe["minutes"]))
    return matches[:5]


@tool
def compare_nearby_shopping(transport: str = "walking") -> str:
    """Compare supermarket baskets including round-trip transport cost.

    Args:
        transport: One of walking, bicycle, car, or motorcycle.
    """
    return _json(_compare_nearby_shopping_data(transport))


def _compare_nearby_shopping_data(transport: str) -> dict[str, Any]:
    if transport not in TRANSPORT:
        return {"error": "Transportation mode unavailable", "allowed": list(TRANSPORT)}
    config = TRANSPORT[transport]
    data = current_state()
    options = []
    shopping = data.get("shopping") or _shopping_from_offers(data.get("offers", []))
    for store_option in shopping:
        travel_cost = round(store_option["distance_km"] * 2 * config["cost_km"])
        effective = store_option["basket_price"] + travel_cost
        options.append({
            **store_option,
            "transport": config["label"],
            "travel_minutes": max(1, round(store_option["distance_km"] / config["speed"] * 60)),
            "travel_cost": travel_cost,
            "effective_cost": effective,
        })
    options.sort(key=lambda option: option["effective_cost"])
    if not options:
        return {"error": "No supermarkets are available to compare", "comparison": []}
    return {"best": options[0], "comparison": options, "prices_are_demo": True, "currency": "UYU"}


def _shopping_from_offers(offers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for offer in offers:
        grouped.setdefault(str(offer["supermarket"]), []).append(offer)
    extras = {"El Dorado": 482, "Disco": 666, "Ta-Ta": 592, "Tienda Inglesa": 728}
    return [
        {
            "supermarket": supermarket,
            "distance_km": float(items[0].get("distanceKm", 0)),
            "basket_price": round(sum(float(item["price"]) for item in items) + extras.get(supermarket, 600)),
            "offers": items,
        }
        for supermarket, items in grouped.items()
    ]


@tool
def register_cooked_meal(recipe_id: str, confirmed: bool = False) -> str:
    """Register a cooked meal only after explicit user confirmation.

    Args:
        recipe_id: Identifier returned by suggest_meals.
        confirmed: Must be true after the user confirms they cooked the meal.
    """
    data = current_state()
    recipe = next((item for item in data["recipes"] if item["id"] == recipe_id), None)
    if not recipe:
        return _json({"error": "Recipe not found"})

    confirmation = current_confirmation()
    explicitly_confirmed = bool(
        confirmed
        and confirmation
        and confirmation.get("type") == "cook_recipe"
        and confirmation.get("recipe_id") == recipe_id
    )
    if is_remote_state() and not explicitly_confirmed:
        action = {"type": "cook_recipe", "recipe_id": recipe_id, "recipe_name": recipe["name"]}
        record_action({**action, "status": "confirmation_required"})
        return _json({
            "confirmation_required": True,
            "message": "The user must confirm this action in the interface.",
            "action": action,
        })
    if not confirmed:
        return _json({"confirmation_required": True, "message": "Confirm that you cooked the recipe before pantry items are deducted."})

    if is_remote_state():
        action = {"type": "cook_recipe", "recipe_id": recipe_id, "recipe_name": recipe["name"], "status": "approved"}
        record_action(action)
        return _json({"registered": True, "recipe": recipe["name"], "action": action})

    # The file-backed store is only used for local development.
    ingredients = recipe.get("ingredients", [])
    by_name = {item["name"].lower(): item for item in data["pantry"]}
    for ingredient in ingredients:
        pantry_item = by_name.get(str(ingredient["pantryName"]).lower())
        if pantry_item:
            pantry_item["quantity"] = max(0, float(pantry_item["quantity"]) - float(ingredient["quantity"]))
    data.setdefault("cooked", []).append({"recipe_id": recipe_id, "cooked_at": datetime.now(timezone.utc).isoformat()})
    store.write(data)
    return _json({"registered": True, "recipe": recipe["name"], "daily_progress": _daily_progress_data()})
