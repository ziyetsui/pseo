"""RFC 9457-style problem details mapping."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import cast

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from pseo.api.schemas import (
    ProblemFieldErrorSchema,
    ProblemLocaleMetaSchema,
    ProblemSchema,
    locale_variant_schema,
)
from pseo.application.errors import (
    CatalogError,
    ContentGoneError,
    InvalidQueryError,
    LocaleVariantNotFoundError,
    ResourceNotFoundError,
)

Handler = Callable[[Request, Exception], Awaitable[JSONResponse]]


def _trace_id(request: Request) -> str:
    return cast(str, getattr(request.state, "request_id", "req_unknown"))


def _problem_type(code: str) -> str:
    return f"https://ancher.space/problems/{code.casefold().replace('_', '-')}"


def problem_response(
    request: Request,
    *,
    status: int,
    code: str,
    title: str,
    detail: str,
    errors: list[ProblemFieldErrorSchema] | None = None,
) -> JSONResponse:
    problem = ProblemSchema(
        type=_problem_type(code),
        title=title,
        status=status,
        code=code,
        detail=detail,
        instance=request.url.path + (f"?{request.url.query}" if request.url.query else ""),
        trace_id=_trace_id(request),
        errors=errors or [],
    )
    return JSONResponse(
        status_code=status,
        content=problem.model_dump(mode="json", by_alias=True),
        media_type="application/problem+json",
        headers={"X-Request-ID": _trace_id(request)},
    )


async def catalog_error_handler(request: Request, exc: CatalogError) -> JSONResponse:
    status = 500
    if isinstance(exc, InvalidQueryError):
        status = 400
    elif isinstance(exc, LocaleVariantNotFoundError | ResourceNotFoundError):
        status = 404
    elif isinstance(exc, ContentGoneError):
        status = 410
    errors = [
        ProblemFieldErrorSchema(
            path=issue.path,
            code=issue.code,
            message=issue.message,
            meta=(
                ProblemLocaleMetaSchema(
                    locale_variants=[locale_variant_schema(item) for item in issue.locale_variants]
                )
                if issue.locale_variants
                else None
            ),
        )
        for issue in exc.issues
    ]
    return problem_response(
        request,
        status=status,
        code=exc.code,
        title=exc.title,
        detail=exc.detail,
        errors=errors,
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors: list[ProblemFieldErrorSchema] = []
    for item in exc.errors():
        locations = [str(value) for value in item.get("loc", ()) if value not in {"query", "path"}]
        errors.append(
            ProblemFieldErrorSchema(
                path=".".join(locations) or "request",
                code=str(item.get("type", "VALIDATION_ERROR")).upper(),
                message=str(item.get("msg", "Invalid request value")),
            )
        )
    return problem_response(
        request,
        status=400,
        code="INVALID_QUERY",
        title="Invalid query",
        detail="One or more request values are invalid.",
        errors=errors,
    )


async def http_error_handler(
    request: Request, exc: StarletteHTTPException | HTTPException
) -> JSONResponse:
    if exc.status_code == 404:
        code, title = "RESOURCE_NOT_FOUND", "Resource not found"
    elif exc.status_code == 405:
        code, title = "METHOD_NOT_ALLOWED", "Method not allowed"
    else:
        code, title = "HTTP_ERROR", "HTTP error"
    return problem_response(
        request,
        status=exc.status_code,
        code=code,
        title=title,
        detail=str(exc.detail),
    )


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    del exc
    return problem_response(
        request,
        status=500,
        code="INTERNAL_SERVER_ERROR",
        title="Internal server error",
        detail="The request could not be completed.",
    )


def exception_handlers() -> dict[type[Exception], Handler]:
    return {
        CatalogError: cast(Handler, catalog_error_handler),
        RequestValidationError: cast(Handler, validation_error_handler),
        StarletteHTTPException: cast(Handler, http_error_handler),
        Exception: unexpected_error_handler,
    }
