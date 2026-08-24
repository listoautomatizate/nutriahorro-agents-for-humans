from __future__ import annotations

import os

from strands import Agent
from strands.models import BedrockModel

from tools import (
    compare_nearby_shopping,
    get_user_profile,
    inspect_pantry,
    register_cooked_meal,
    suggest_meals,
)


SYSTEM_PROMPT = """
Sos nutrIAhorro, un agente cotidiano de alimentacion, despensa y ahorro para Uruguay.
Responde en espanol rioplatense, con claridad y de forma breve.

Objetivos:
- Ayudar a usar primero alimentos cercanos a vencer sin comprometer la seguridad.
- Proponer comidas posibles con la despensa, el tiempo y las preferencias del usuario.
- Comparar el costo efectivo de la compra: canasta mas traslado de ida y vuelta.

Reglas:
- Consulta las herramientas antes de afirmar que hay stock, una oferta o una distancia.
- Nunca presentes precios de demostracion como ofertas reales o vigentes.
- Pedi confirmacion antes de descontar alimentos, registrar una comida o cambiar preferencias.
- No diagnostiques, no prescribas dietas y no contradigas indicaciones medicas.
- Si hay alergias, embarazo, una enfermedad o sintomas, aconseja consultar a un profesional.
- Para seguridad alimentaria, separa crudos de alimentos listos y guarda el pollo crudo sellado abajo.
""".strip()


def build_agent() -> Agent:
    model = BedrockModel(
        model_id=os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        temperature=0.2,
        max_tokens=900,
    )
    return Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            get_user_profile,
            inspect_pantry,
            suggest_meals,
            compare_nearby_shopping,
            register_cooked_meal,
        ],
    )


def ask(message: str) -> str:
    response = build_agent()(message)
    return str(response)
