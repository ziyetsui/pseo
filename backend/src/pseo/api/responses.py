"""Stable response metadata, cache identity, and conditional GET support."""

from __future__ import annotations

import hashlib
from collections.abc import Mapping
from urllib.parse import urlencode

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from pseo.api.schemas import ApiModel, ResponseMetaSchema
from pseo.application.queries import CatalogQueries


def response_meta(request: Request, queries: CatalogQueries) -> ResponseMetaSchema:
    snapshot = queries.snapshot
    return ResponseMetaSchema(
        request_id=request.state.request_id,
        content_revision=snapshot.content_revision,
        index_version=snapshot.index_version,
        ranking_version=snapshot.ranking_version,
    )


def _etag(revision: str, cache_key: str) -> str:
    digest = hashlib.sha256(f"{revision}\0{cache_key}".encode()).hexdigest()
    return f'W/"{digest}"'


def api_response(
    request: Request,
    model: ApiModel,
    *,
    content_revision: str,
    cache_key: str,
    headers: Mapping[str, str] | None = None,
) -> Response:
    etag = _etag(content_revision, cache_key)
    response_headers = {
        "ETag": etag,
        "X-Content-Revision": content_revision,
        "X-Request-ID": request.state.request_id,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        **(dict(headers) if headers else {}),
    }
    candidates = {
        item.strip() for item in request.headers.get("if-none-match", "").split(",") if item.strip()
    }
    if etag in candidates or "*" in candidates:
        return Response(status_code=304, headers=response_headers)
    return JSONResponse(
        content=model.model_dump(mode="json", by_alias=True),
        headers=response_headers,
    )


def request_cache_key(request: Request) -> str:
    pairs = sorted(request.query_params.multi_items())
    query = urlencode(pairs)
    return f"{request.url.path}?{query}" if query else request.url.path
