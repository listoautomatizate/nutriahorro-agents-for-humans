from __future__ import annotations

import json
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
        raise NotImplementedError("DemoModel no genera salidas estructuradas.")

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
            for event in _text_events(_summarize_tool_results(messages)):
                yield event
            return

        calls = _select_tools(_latest_user_text(messages))
        yield {"messageStart": {"role": "assistant"}}
        for index, (name, arguments) in enumerate(calls, start=1):
            yield {
                "contentBlockStart": {
                    "start": {
                        "toolUse": {
                            "name": name,
                            "toolUseId": f"nutriahorro-demo-{index}",
                        }
                    }
                }
            }
            yield {
                "contentBlockDelta": {
                    "delta": {"toolUse": {"input": json.dumps(arguments)}}
                }
            }
            yield {"contentBlockStop": {}}
        yield {"messageStop": {"stopReason": "tool_use"}}
        yield _metadata_event()


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
    calls: list[tuple[str, dict[str, Any]]] = []

    if _contains(message, "perfil", "objetivo", "peso", "actividad"):
        calls.append(("get_user_profile", {}))
    if _contains(message, "caloria", "proteina", "carbohidrato", "grasa", "macro", "progreso"):
        calls.append(("get_daily_progress", {}))
    if _contains(message, "despensa", "heladera", "vencer", "vence", "primero", "stock"):
        calls.append(("inspect_pantry", {"max_days_left": 4}))
    if _contains(message, "receta", "comer", "cocinar", "rapido", "minuto", "proteina"):
        calls.append(("suggest_meals", {"max_minutes": 20, "minimum_protein": 0}))
    if _contains(message, "comprar", "compra", "oferta", "ahorro", "supermercado", "conviene"):
        calls.append(("compare_nearby_shopping", {"transport": "walking"}))

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
    for block in messages[-1]["content"]:
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
        paragraphs.append(f"Usa primero {names}, porque son los alimentos mas proximos a vencer.")

    recipes = payloads.get("suggest_meals", [])
    if isinstance(recipes, list) and recipes:
        recipe = recipes[0]
        paragraphs.append(
            f"La mejor opcion rapida es {recipe['name']}: {recipe.get('calories', 0)} kcal, "
            f"{recipe.get('protein', 0)} g de proteina, {recipe.get('carbs', 0)} g de carbohidratos "
            f"y {recipe.get('fat', 0)} g de grasas en {recipe.get('minutes', 0)} minutos."
        )

    shopping = payloads.get("compare_nearby_shopping", {})
    best = shopping.get("best") if isinstance(shopping, dict) else None
    if best:
        paragraphs.append(
            f"Para la canasta de demostracion conviene {best['supermarket']}: costo efectivo "
            f"${best['effective_cost']} UYU, incluyendo el traslado en {best['transport']}."
        )

    progress = payloads.get("get_daily_progress", {})
    if isinstance(progress, dict) and progress.get("consumed"):
        consumed = progress["consumed"]
        remaining = progress.get("remaining", {})
        paragraphs.append(
            f"Hoy llevas {consumed['calories']} kcal, {consumed['protein']} g de proteina, "
            f"{consumed['carbs']} g de carbohidratos y {consumed['fat']} g de grasas. "
            f"Te quedan {remaining.get('calories', 0)} kcal para entrar en tu rango orientativo."
        )

    profile = payloads.get("get_user_profile", {})
    if isinstance(profile, dict) and profile:
        paragraphs.append(
            f"Tu objetivo configurado es {profile.get('goal', 'sin definir')} con un rango orientativo "
            f"de {profile.get('calorie_range', ['?', '?'])[0]} a "
            f"{profile.get('calorie_range', ['?', '?'])[1]} kcal."
        )

    return " ".join(paragraphs) or "Consulte las herramientas de nutrIAhorro, pero no encontre datos para responder."


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
