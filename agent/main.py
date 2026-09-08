from __future__ import annotations

from typing import Any

from bedrock_agentcore.runtime import BedrockAgentCoreApp

from agent import ask
from receipt import parse_receipt


app = BedrockAgentCoreApp()


@app.entrypoint
def invoke(payload: dict[str, Any], context: Any) -> dict[str, Any]:
    action = payload.get("action", "chat")
    if action == "parse_receipt":
        return parse_receipt(
            data=str(payload.get("data", "")),
            content_type=str(payload.get("contentType", "")),
            filename=str(payload.get("filename", "ticket.jpg")),
        )
    if action != "chat":
        raise ValueError("Accion no reconocida.")
    message = payload.get("message")
    if not isinstance(message, str) or not message.strip():
        raise ValueError("El mensaje debe ser texto y no puede estar vacio.")
    return ask(
        message=message.strip(),
        state=payload.get("state") if isinstance(payload.get("state"), dict) else None,
        confirmed_action=payload.get("confirmedAction") if isinstance(payload.get("confirmedAction"), dict) else None,
    )


if __name__ == "__main__":
    app.run()
