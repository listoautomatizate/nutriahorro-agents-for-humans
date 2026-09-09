from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from agent import ask
from receipt import parse_receipt


app = FastAPI(title="nutrIAhorro Strands Agent", version="1.0.0")


class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    message: str = Field(min_length=1, max_length=1500)
    state: dict[str, Any] | None = None
    confirmed_action: dict[str, Any] | None = Field(default=None, alias="confirmedAction")


class ReceiptRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    filename: str = Field(min_length=1, max_length=240)
    content_type: str = Field(alias="contentType")
    data: str = Field(min_length=1)


def require_token(authorization: str | None) -> None:
    expected = os.getenv("NUTRIAHORRO_AGENT_TOKEN")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Token invalido.")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "agent": "nutrIAhorro", "framework": "Strands Agents SDK"}


@app.post("/chat")
def chat(request: ChatRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    try:
        return ask(request.message, state=request.state, confirmed_action=request.confirmed_action)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"El modelo del agente no respondio: {error}") from error


@app.post("/receipt")
def receipt(request: ReceiptRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    try:
        return parse_receipt(request.data, request.content_type, request.filename)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"El modelo no pudo leer el ticket: {error}") from error
