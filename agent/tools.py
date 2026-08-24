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

from store import store


TRANSPORT = {
    "walking": {"label": "caminando", "speed": 5, "cost_km": 0},
    "bicycle": {"label": "bicicleta", "speed": 14, "cost_km": 0},
    "car": {"label": "auto", "speed": 32, "cost_km": 14},
    "motorcycle": {"label": "moto", "speed": 30, "cost_km": 6},
}


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False)


@tool
def get_user_profile() -> str:
    """Return the user's wellness goals, location, nutrition range, and preferred transport."""
    return _json(store.read()["profile"])


@tool
def inspect_pantry(max_days_left: int = 4) -> str:
    """List pantry stock and flag items that should be prioritized.

    Args:
        max_days_left: Include items expiring in this many days in the priority list.
    """
    pantry = store.read()["pantry"]
    priority = [item for item in pantry if item["days_left"] <= max_days_left]
    low_stock = [item for item in pantry if item["quantity"] <= 1]
    return _json({"pantry": pantry, "priority": priority, "low_stock": low_stock})


@tool
def suggest_meals(max_minutes: int = 30, minimum_protein: int = 0) -> str:
    """Suggest meals compatible with available pantry items and time.

    Args:
        max_minutes: Maximum preparation time requested by the user.
        minimum_protein: Optional minimum grams of protein per meal.
    """
    return _json(_suggest_meals_data(max_minutes, minimum_protein))


def _suggest_meals_data(max_minutes: int, minimum_protein: int = 0) -> list[dict[str, Any]]:
    data = store.read()
    available = {item["name"] for item in data["pantry"] if item["quantity"] > 0}
    matches = [
        recipe for recipe in data["recipes"]
        if recipe["minutes"] <= max_minutes
        and recipe["protein"] >= minimum_protein
        and set(recipe["uses"]).issubset(available)
    ]
    urgent_names = {item["name"] for item in data["pantry"] if item["days_left"] <= 3}
    for recipe in matches:
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
        return {"error": "Transporte no disponible", "allowed": list(TRANSPORT)}
    config = TRANSPORT[transport]
    options = []
    for store_option in store.read()["shopping"]:
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
    return {"best": options[0], "comparison": options, "prices_are_demo": True}


@tool
def register_cooked_meal(recipe_id: str, confirmed: bool = False) -> str:
    """Register a cooked meal only after explicit user confirmation.

    Args:
        recipe_id: Identifier returned by suggest_meals.
        confirmed: Must be true after the user confirms they cooked the meal.
    """
    if not confirmed:
        return _json({"confirmation_required": True, "message": "Confirma que cocinaste la receta antes de descontar alimentos."})
    data = store.read()
    recipe = next((item for item in data["recipes"] if item["id"] == recipe_id), None)
    if not recipe:
        return _json({"error": "Receta no encontrada"})
    data["cooked"].append({"recipe_id": recipe_id, "cooked_at": datetime.now(timezone.utc).isoformat()})
    store.write(data)
    return _json({"registered": True, "recipe": recipe["name"]})
