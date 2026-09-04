"""Typed FastAPI dependency accessors."""

from __future__ import annotations

from typing import cast

from fastapi import Request

from pseo.application.queries import CatalogQueries


def get_catalog_queries(request: Request) -> CatalogQueries:
    return cast(CatalogQueries, request.app.state.catalog_queries)
