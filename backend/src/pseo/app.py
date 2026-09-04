"""FastAPI application factory for local and edge composition roots."""

from __future__ import annotations

import re
import uuid
from collections.abc import Awaitable, Callable
from typing import Any, cast

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from pseo.adapters.git_catalog import GitCatalogRepository
from pseo.api.problems import exception_handlers
from pseo.api.v1.router import router
from pseo.application.queries import CatalogQueries
from pseo.infrastructure.settings import Settings
from pseo.ports.catalog import CatalogRepository

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class PseoFastAPI(FastAPI):
    """FastAPI application with the frozen problem+json OpenAPI surface."""

    def openapi(self) -> dict[str, Any]:
        if self.openapi_schema is not None:
            return self.openapi_schema
        schema = get_openapi(
            title=self.title,
            version=self.version,
            openapi_version="3.1.0",
            summary=self.summary,
            description=self.description,
            routes=self.routes,
        )
        paths = schema.get("paths", {})
        if isinstance(paths, dict):
            for path_item in paths.values():
                if not isinstance(path_item, dict):
                    continue
                for method, operation in path_item.items():
                    if method not in {"get", "post", "put", "patch", "delete"}:
                        continue
                    if not isinstance(operation, dict):
                        continue
                    responses = operation.get("responses", {})
                    if not isinstance(responses, dict):
                        continue
                    for status, response in responses.items():
                        if not isinstance(response, dict) or not str(status).startswith(("4", "5")):
                            continue
                        response["content"] = {
                            "application/problem+json": {
                                "schema": {"$ref": "#/components/schemas/ProblemSchema"}
                            }
                        }
                    if method == "get":
                        success = responses.get("200")
                        if isinstance(success, dict):
                            success.setdefault("headers", {}).update(
                                {
                                    "ETag": {"schema": {"type": "string"}},
                                    "X-Content-Revision": {"schema": {"type": "string"}},
                                    "X-Request-ID": {"schema": {"type": "string"}},
                                }
                            )
                        responses.setdefault(
                            "304",
                            {
                                "description": "Not modified",
                                "headers": {
                                    "ETag": {"schema": {"type": "string"}},
                                    "X-Content-Revision": {"schema": {"type": "string"}},
                                    "X-Request-ID": {"schema": {"type": "string"}},
                                },
                            },
                        )
        schema["servers"] = [
            {
                "url": self.state.settings.public_base_url,
                "description": self.state.settings.public_base_description,
            }
        ]
        self.openapi_schema = schema
        return schema


def _request_id(request: Request) -> str:
    provided = request.headers.get("x-request-id", "")
    if REQUEST_ID_PATTERN.fullmatch(provided):
        return provided
    return f"req_{uuid.uuid4().hex}"


class RequestContextMiddleware:
    """Attach request IDs without Starlette's task-spawning BaseHTTPMiddleware."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        request_id = _request_id(request)
        request.state.request_id = request_id

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                MutableHeaders(scope=message).setdefault("X-Request-ID", request_id)
            await send(message)

        await self.app(scope, receive, send_with_request_id)


def create_app(
    *,
    repository: CatalogRepository | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    """Compose the API without network access or filesystem writes."""

    resolved_settings = settings or Settings()
    resolved_repository = repository or GitCatalogRepository(resolved_settings.repository_root)
    app = PseoFastAPI(
        title="pSEO Public Read API",
        summary="Internal-beta Prompt catalog API",
        description=(
            "Anonymous, read-only API derived from one immutable catalog revision. "
            "The beta adapter reads the verified Git publication manifest and is "
            "replaceable through the CatalogRepository port."
        ),
        version="1.0.0-beta.1",
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url=None,
    )
    app.state.catalog_queries = CatalogQueries(resolved_repository)
    app.state.settings = resolved_settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "HEAD", "OPTIONS"],
        allow_headers=["Accept", "If-None-Match", "X-Request-ID"],
        expose_headers=["ETag", "X-Content-Revision", "X-Request-ID"],
    )

    # A pure ASGI middleware is required here. Starlette's decorator-based HTTP
    # middleware uses BaseHTTPMiddleware, whose task boundary is incompatible
    # with borrowed Python proxies in the Cloudflare workerd runtime.
    app.add_middleware(RequestContextMiddleware)

    for exception_type, handler in exception_handlers().items():
        compatible_handler = cast(
            Callable[[Request, Exception], Awaitable[Response]],
            handler,
        )
        app.add_exception_handler(exception_type, compatible_handler)
    app.include_router(router)
    return app
