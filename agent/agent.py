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
Sos nutrIAhorro, un agente cotidiano de alimentacion, despensa y ahorro para Uruguay.
Responde en espanol rioplatense, con claridad y de forma breve.

Objetivos:
- Ayudar a usar primero alimentos cercanos a vencer sin comprometer la seguridad.
- Proponer comidas posibles con la despensa, el tiempo y las preferencias del usuario.
- Comparar el costo efectivo de la compra: canasta mas traslado de ida y vuelta.
- Acompanar el progreso diario de calorias, proteina, carbohidratos y grasas.

Reglas:
- Consulta las herramientas antes de afirmar que hay stock, una oferta o una distancia.
- Nunca presentes precios de demostracion como ofertas reales o vigentes.
- Pedi confirmacion antes de descontar alimentos, registrar una comida o cambiar preferencias.
- Cuando informes una receta, incluye siempre calorias, proteina, carbohidratos y grasas.
- Cuando informes el progreso diario, muestra consumido y restante de las cuatro metricas.
- No diagnostiques, no prescribas dietas y no contradigas indicaciones medicas.
- Si hay alergias, embarazo, una enfermedad o sintomas, aconseja consultar a un profesional.
- Para seguridad alimentaria, separa crudos de alimentos listos y guarda el pollo crudo sellado abajo.
""".strip()


def selected_model_provider() -> str:
    provider = os.getenv("NUTRIAHORRO_MODEL_PROVIDER", "bedrock").strip().lower()
    if provider not in {"bedrock", "openai"}:
        raise ValueError("NUTRIAHORRO_MODEL_PROVIDER debe ser 'bedrock' u 'openai'.")
    return provider


def build_model():
    provider = selected_model_provider()
    if provider == "openai":
        from strands.models.openai import OpenAIModel

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("Falta OPENAI_API_KEY para usar el proveedor OpenAI.")
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
