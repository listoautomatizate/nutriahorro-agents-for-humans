from __future__ import annotations

import json
import os
from pathlib import Path
from threading import Lock
from typing import Any


DEFAULT_DATA_PATH = Path(__file__).parent / "data" / "demo_state.json"


class JsonStore:
    """Small demo store. Production state lives in the web app's D1 database."""

    def __init__(self, path: str | None = None) -> None:
        self.path = Path(path or os.getenv("NUTRIAHORRO_DATA_PATH", DEFAULT_DATA_PATH))
        self._lock = Lock()

    def read(self) -> dict[str, Any]:
        with self._lock:
            return json.loads(self.path.read_text(encoding="utf-8"))

    def write(self, data: dict[str, Any]) -> None:
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


store = JsonStore()
