from __future__ import annotations

import os

from strands import Agent
from strands.models import BedrockModel

from tools import (
    compare_nearby_shopping,
    get_daily_progress,
    get_user_profile,
    inspect_pantry,
    register_cooked_meal,
    suggest_meals,
)
from runtime_context import invocation_context, recorded_actions


SYSTEM_PROMPT = """
You are nutrIAhorro, an everyday food, pantry, and savings agent for people in Uruguay.
Always respond in clear, concise English.

Goals:
- Help people use food nearing expiry first without compromising safety.
- Suggest feasible meals based on pantry stock, available time, and user preferences.
- Compare the effective shopping cost: basket price plus round-trip travel.
- Track daily calories, protein, carbohydrates, and fat.

Rules:
- Consult tools before claiming that stock, a deal, or a distance is available.
- Never present demo prices as real or current offers.
- Ask for confirmation before deducting food, logging a meal, or changing preferences.
- Whenever you describe a recipe, include calories, protein, carbohydrates, and fat.
- Whenever you describe daily progress, show both consumed and remaining values for all four metrics.
- Do not diagnose, prescribe diets, or contradict medical guidance.
- For allergies, pregnancy, medical conditions, or symptoms, advise consulting a professional.
- For food safety, separate raw food from ready-to-eat food and keep raw chicken sealed on the bottom shelf.
""".strip()


def selected_model_provider() -> str:
    provider = os.getenv("NUTRIAHORRO_MODEL_PROVIDER", "bedrock").strip().lower()
    if provider not in {"bedrock", "openai", "demo"}:
        raise ValueError("NUTRIAHORRO_MODEL_PROVIDER must be 'bedrock', 'openai', or 'demo'.")
    return provider


def build_model():
    provider = selected_model_provider()
    if provider == "demo":
        from demo_model import DemoModel

        return DemoModel()
    if provider == "openai":
        from strands.models.openai import OpenAIModel

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is required to use the OpenAI provider.")
        return OpenAIModel(
            client_args={"api_key": api_key},
            model_id=os.getenv("OPENAI_MODEL_ID", "gpt-4.1-mini"),
            params={"max_tokens": 900, "temperature": 0.2},
        )
    return BedrockModel(
        model_id=os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        temperature=0.2,
        max_tokens=900,
    )


def build_agent(callback_handler=None) -> Agent:
    return Agent(
        model=build_model(),
        system_prompt=SYSTEM_PROMPT,
        tools=[
            get_user_profile,
            inspect_pantry,
            get_daily_progress,
            suggest_meals,
            compare_nearby_shopping,
            register_cooked_meal,
        ],
        callback_handler=callback_handler,
    )


def ask(
    message: str,
    state: dict | None = None,
    confirmed_action: dict | None = None,
) -> dict:
    used_tools: list[str] = []

    def capture_tools(**kwargs) -> None:
        tool_use = kwargs.get("current_tool_use")
        if isinstance(tool_use, dict):
            name = tool_use.get("name")
            if name and name not in used_tools:
                used_tools.append(str(name))

    with invocation_context(state=state, confirmed_action=confirmed_action):
        response = build_agent(callback_handler=capture_tools)(message)
        actions = recorded_actions()
    return {
        "answer": str(response),
        "mode": f"strands-{selected_model_provider()}",
        "tools": used_tools,
        "actions": actions,
    }
