from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from agent import ask
from tools import prepare_daily_summary


app = FastAPI(title="nutrIAhorro Strands Agent", version="1.0.0")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1500)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "agent": "nutrIAhorro", "framework": "Strands Agents SDK"}


@app.post("/chat")
def chat(request: ChatRequest) -> dict[str, str]:
    try:
        return {"answer": ask(request.message), "mode": "strands-bedrock"}
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Bedrock no respondio: {error}") from error


@app.get("/summary")
def summary() -> dict[str, str]:
    return {"message": prepare_daily_summary(), "mode": "strands-tool"}
