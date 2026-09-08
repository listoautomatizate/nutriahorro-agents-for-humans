from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from copy import deepcopy
from typing import Any, Iterator

from store import store


_request_state: ContextVar[dict[str, Any] | None] = ContextVar("request_state", default=None)
_confirmed_action: ContextVar[dict[str, Any] | None] = ContextVar("confirmed_action", default=None)
_actions: ContextVar[list[dict[str, Any]] | None] = ContextVar("actions", default=None)


@contextmanager
def invocation_context(
    state: dict[str, Any] | None = None,
    confirmed_action: dict[str, Any] | None = None,
) -> Iterator[None]:
    """Keep request data isolated while Strands executes tools."""
    state_token = _request_state.set(deepcopy(state) if state else None)
    confirmed_token = _confirmed_action.set(deepcopy(confirmed_action) if confirmed_action else None)
    actions_token = _actions.set([])
    try:
        yield
    finally:
        _actions.reset(actions_token)
        _confirmed_action.reset(confirmed_token)
        _request_state.reset(state_token)


def current_state() -> dict[str, Any]:
    request_state = _request_state.get()
    return deepcopy(request_state) if request_state is not None else store.read()


def is_remote_state() -> bool:
    return _request_state.get() is not None


def current_confirmation() -> dict[str, Any] | None:
    value = _confirmed_action.get()
    return deepcopy(value) if value else None


def record_action(action: dict[str, Any]) -> None:
    actions = _actions.get()
    if actions is not None:
        actions.append(deepcopy(action))


def recorded_actions() -> list[dict[str, Any]]:
    return deepcopy(_actions.get() or [])
