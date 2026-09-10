from __future__ import annotations

import json
import re
import threading
from collections.abc import AsyncGenerator, AsyncIterable
from typing import Any, TypeVar

from pydantic import BaseModel
from strands.models.model import Model
from strands.types.content import Messages, SystemContentBlock
from strands.types.streaming import StreamEvent
from strands.types.tools import ToolChoice, ToolSpec


T = TypeVar("T", bound=BaseModel)


class DemoModel(Model):
    """Deterministic model adapter for zero-cost Strands demonstrations and tests.

    The adapter chooses read-only nutrIAhorro tools from the user's message, then
    lets the real Strands event loop execute them. It never pretends to be a
    generative model and never invokes an external API.
    """

    def __init__(self, **config: Any) -> None:
        self._config = {
            "model_id": "nutriahorro-deterministic-demo",
            "context_window_limit": 20_000,
            **config,
        }

    def update_config(self, **model_config: Any) -> None:
        self._config.update(model_config)

    def get_config(self) -> dict[str, Any]:
        return dict(self._config)

    async def structured_output(
        self,
        output_model: type[T],
        prompt: Messages,
        system_prompt: str | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[dict[str, T | Any], None]:
        if False:
            yield {}
        raise NotImplementedError("DemoModel does not generate structured output.")

    async def stream(
        self,
        messages: Messages,
        tool_specs: list[ToolSpec] | None = None,
        system_prompt: str | None = None,
        *,
        tool_choice: ToolChoice | None = None,
        system_prompt_content: list[SystemContentBlock] | None = None,
        invocation_state: dict[str, Any] | None = None,
        cancel_signal: threading.Event | None = None,
        **kwargs: Any,
    ) -> AsyncIterable[StreamEvent]:
        if _has_tool_results(messages):
            payloads = _tool_payloads(messages)
            latest_request = _latest_user_text(messages)
            recipes = payloads.get("suggest_meals", [])
            if (
                isinstance(recipes, list)
                and recipes
                and "register_cooked_meal" not in payloads
                and _contains(latest_request, "recipe", "meal", "eat", "cook", "quick", "minute", "protein")
            ):
                for event in _tool_call_events([(
                    "register_cooked_meal",
                    {"recipe_id": recipes[0]["id"], "confirmed": False},
                )]):
                    yield event
                return

            for event in _text_events(_summarize_tool_results(messages)):
                yield event
            return

        calls = _select_tools(_latest_user_text(messages))
        for event in _tool_call_events(calls):
            yield event


def _tool_call_events(calls: list[tuple[str, dict[str, Any]]]) -> list[StreamEvent]:
    events: list[StreamEvent] = [{"messageStart": {"role": "assistant"}}]
    for index, (name, arguments) in enumerate(calls, start=1):
        events.extend([
            {
                "contentBlockStart": {
                    "start": {
                        "toolUse": {
                            "name": name,
                            "toolUseId": f"nutriahorro-demo-{index}",
                        }
                    }
                }
            },
            {
                "contentBlockDelta": {
                    "delta": {"toolUse": {"input": json.dumps(arguments)}}
                }
            },
            {"contentBlockStop": {}},
        ])
    events.extend([
        {"messageStop": {"stopReason": "tool_use"}},
        _metadata_event(),
    ])
    return events


def _latest_user_text(messages: Messages) -> str:
    for message in reversed(messages):
        if message["role"] != "user":
            continue
        for block in message["content"]:
            if "text" in block:
                return str(block["text"]).lower()
    return ""


def _has_tool_results(messages: Messages) -> bool:
    return bool(
        messages
        and messages[-1]["role"] == "user"
        and any("toolResult" in block for block in messages[-1]["content"])
    )


def _select_tools(message: str) -> list[tuple[str, dict[str, Any]]]:
    confirmation = re.search(r"recipe_id\s+([a-z0-9-]+).*confirmed\s*=\s*true", message)
    if confirmation:
        return [("register_cooked_meal", {"recipe_id": confirmation.group(1), "confirmed": True})]

    calls: list[tuple[str, dict[str, Any]]] = []
    wants_recipe = _contains(message, "recipe", "meal", "eat", "cook", "quick", "minute", "protein")

    if wants_recipe or _contains(message, "profile", "goal", "weight", "activity"):
        calls.append(("get_user_profile", {}))
    if _contains(message, "calorie", "protein", "carb", "fat", "macro", "progress"):
        calls.append(("get_daily_progress", {}))
    if wants_recipe or _contains(message, "pantry", "fridge", "expire", "expiry", "first", "stock"):
        calls.append(("inspect_pantry", {"max_days_left": 4}))
    if wants_recipe:
        minute_match = re.search(r"\b(\d{1,3})\s*(?:min|minute|minutes)\b", message)
        max_minutes = min(180, max(5, int(minute_match.group(1)))) if minute_match else 30
        minimum_protein = 35 if _contains(message, "high protein", "more protein", "most protein") else 0
        calls.append(("suggest_meals", {"max_minutes": max_minutes, "minimum_protein": minimum_protein}))
    if _contains(message, "buy", "shop", "shopping", "deal", "offer", "save", "supermarket", "grocery"):
        transport = (
            "motorcycle" if _contains(message, "motorcycle", "motorbike")
            else "car" if _contains(message, "car", "drive")
            else "bicycle" if _contains(message, "bicycle", "bike", "cycling")
            else "walking"
        )
        calls.append(("compare_nearby_shopping", {"transport": transport}))

    if not calls:
        calls = [
            ("inspect_pantry", {"max_days_left": 4}),
            ("suggest_meals", {"max_minutes": 20, "minimum_protein": 0}),
            ("get_daily_progress", {}),
        ]
    return _deduplicate(calls)


def _contains(text: str, *terms: str) -> bool:
    return any(term in text for term in terms)


def _deduplicate(calls: list[tuple[str, dict[str, Any]]]) -> list[tuple[str, dict[str, Any]]]:
    seen: set[str] = set()
    result = []
    for call in calls:
        if call[0] not in seen:
            seen.add(call[0])
            result.append(call)
    return result


def _tool_names(messages: Messages) -> dict[str, str]:
    names: dict[str, str] = {}
    for message in messages:
        for block in message["content"]:
            tool_use = block.get("toolUse")
            if tool_use:
                names[str(tool_use["toolUseId"])] = str(tool_use["name"])
    return names


def _tool_payloads(messages: Messages) -> dict[str, Any]:
    names = _tool_names(messages)
    payloads: dict[str, Any] = {}
    for message in messages:
        if message["role"] != "user":
            continue
        for block in message["content"]:
            tool_result = block.get("toolResult")
            if not tool_result:
                continue
            tool_name = names.get(str(tool_result["toolUseId"]), "unknown")
            for content in tool_result.get("content", []):
                raw = content.get("text")
                if raw is None:
                    continue
                try:
                    payloads[tool_name] = json.loads(raw)
                except (TypeError, json.JSONDecodeError):
                    payloads[tool_name] = raw
    return payloads


def _summarize_tool_results(messages: Messages) -> str:
    payloads = _tool_payloads(messages)
    paragraphs: list[str] = []

    pantry = payloads.get("inspect_pantry", {})
    priority = pantry.get("priority", []) if isinstance(pantry, dict) else []
    if priority:
        names = ", ".join(str(item["name"]) for item in priority[:3])
        paragraphs.append(f"Use {names} first because they are closest to expiry.")

    recipes = payloads.get("suggest_meals", [])
    if isinstance(recipes, list) and recipes:
        recipe = recipes[0]
        paragraphs.append(
            f"The best quick option is {recipe['name']}: {recipe.get('calories', 0)} kcal, "
            f"{recipe.get('protein', 0)} g of protein, {recipe.get('carbs', 0)} g of carbohydrates, "
            f"and {recipe.get('fat', 0)} g of fat in {recipe.get('minutes', 0)} minutes."
        )

    shopping = payloads.get("compare_nearby_shopping", {})
    best = shopping.get("best") if isinstance(shopping, dict) else None
    if best:
        paragraphs.append(
            f"For the demo basket, {best['supermarket']} has the lowest effective cost: "
            f"UYU {best['effective_cost']}, including round-trip travel by {best['transport']}."
        )

    progress = payloads.get("get_daily_progress", {})
    if isinstance(progress, dict) and progress.get("consumed"):
        consumed = progress["consumed"]
        remaining = progress.get("remaining", {})
        paragraphs.append(
            f"Today you have logged {consumed['calories']} kcal, {consumed['protein']} g of protein, "
            f"{consumed['carbs']} g of carbohydrates, and {consumed['fat']} g of fat. "
            f"You need {remaining.get('calories', 0)} kcal to reach your general target range."
        )

    profile = payloads.get("get_user_profile", {})
    if isinstance(profile, dict) and profile:
        paragraphs.append(
            f"Your configured goal is {profile.get('goal', 'not set')} with a general range "
            f"of {profile.get('calorie_range', ['?', '?'])[0]} to "
            f"{profile.get('calorie_range', ['?', '?'])[1]} kcal."
        )

    registration = payloads.get("register_cooked_meal", {})
    if isinstance(registration, dict) and registration.get("confirmation_required"):
        paragraphs.append("I can log it and update both your nutrition progress and pantry, but I need your confirmation first.")
    elif isinstance(registration, dict) and registration.get("registered"):
        paragraphs.append(
            f"Done. I logged {registration.get('recipe', 'the meal')}; the app will update calories, "
            "protein, carbohydrates, fat, and pantry quantities."
        )

    return " ".join(paragraphs) or "I checked nutrIAhorro's tools, but I could not find enough data to answer."


def _text_events(text: str) -> list[StreamEvent]:
    return [
        {"messageStart": {"role": "assistant"}},
        {"contentBlockStart": {"start": {}}},
        {"contentBlockDelta": {"delta": {"text": text}}},
        {"contentBlockStop": {}},
        {"messageStop": {"stopReason": "end_turn"}},
        _metadata_event(),
    ]


def _metadata_event() -> StreamEvent:
    return {
        "metadata": {
            "usage": {"inputTokens": 0, "outputTokens": 0, "totalTokens": 0},
            "metrics": {"latencyMs": 0},
        }
    }
