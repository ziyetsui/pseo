"""Uvicorn composition root for the read-only internal-beta API."""

from __future__ import annotations

from pseo.app import PseoFastAPI, create_app

app = create_app()

__all__ = ["PseoFastAPI", "app", "create_app"]
