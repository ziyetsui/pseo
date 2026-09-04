"""Anonymous, read-only public API routes."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, Response

from pseo.api.dependencies import get_catalog_queries
from pseo.api.responses import api_response, request_cache_key, response_meta
from pseo.api.schemas import (
    CategoryProjectionSchema,
    DependencyHealthSchema,
    FacetSetSchema,
    HealthSchema,
    HomeDataSchema,
    LocaleInfoSchema,
    ModelProjectionSchema,
    ProblemSchema,
    PromptDetailSchema,
    PromptPageEnvelope,
    PublicEnvelope,
    category_projection_schema,
    facet_set_schema,
    home_schema,
    locale_schema,
    model_projection_schema,
    page_schema,
    prompt_detail_schema,
    prompt_summary_schema,
)
from pseo.application.errors import FieldIssue, InvalidQueryError
from pseo.application.queries import CatalogQueries, PromptQuery, PromptSort, Window
from pseo.domain.models import TaxonomyAxis

router = APIRouter()
Queries = Annotated[CatalogQueries, Depends(get_catalog_queries)]


class CategoryAxisParam(StrEnum):
    CONTENT_TYPE = "content-type"
    USE_CASE = "use-case"
    TECHNIQUE = "technique"
    STYLE = "style"
    SUBJECT = "subject"


def _problem_responses(*statuses: int) -> dict[int | str, dict[str, Any]]:
    return {
        status: {
            "model": ProblemSchema,
            "description": "Problem details",
        }
        for status in statuses
    }


def _check_query_keys(
    request: Request,
    *,
    allowed: set[str],
    repeatable: set[str] | None = None,
) -> None:
    repeatable = repeatable or set()
    counts: dict[str, int] = {}
    for key, _ in request.query_params.multi_items():
        if key not in allowed:
            raise InvalidQueryError(
                f"Unknown query parameter {key!r}",
                issues=(FieldIssue(key, "UNKNOWN_QUERY_PARAMETER", "Parameter is not supported"),),
            )
        counts[key] = counts.get(key, 0) + 1
    repeated = sorted(key for key, count in counts.items() if count > 1 and key not in repeatable)
    if repeated:
        key = repeated[0]
        raise InvalidQueryError(
            f"Query parameter {key!r} must not be repeated",
            issues=(FieldIssue(key, "REPEATED_QUERY_PARAMETER", "Parameter must occur once"),),
        )


@router.get(
    "/api/v1/locales",
    response_model=PublicEnvelope[list[LocaleInfoSchema]],
    responses=_problem_responses(400, 503),
    tags=["catalog"],
    summary="List configured locales",
)
async def locales(request: Request, queries: Queries) -> Response:
    _check_query_keys(request, allowed=set())
    payload = PublicEnvelope[list[LocaleInfoSchema]](
        data=[locale_schema(item) for item in queries.locales()],
        meta=response_meta(request, queries),
    )
    return api_response(
        request,
        payload,
        content_revision=queries.snapshot.content_revision,
        cache_key=request_cache_key(request),
    )


@router.get(
    "/api/v1/home",
    response_model=PublicEnvelope[HomeDataSchema],
    responses=_problem_responses(400, 404, 503),
    tags=["catalog"],
    summary="Read the L1 Prompt hub projection",
)
async def home(
    request: Request,
    queries: Queries,
    locale: Annotated[str, Query(min_length=2, max_length=35)],
) -> Response:
    _check_query_keys(request, allowed={"locale"})
    payload = PublicEnvelope[HomeDataSchema](
        data=home_schema(queries.home(locale)),
        meta=response_meta(request, queries),
    )
    return api_response(
        request,
        payload,
        content_revision=queries.snapshot.content_revision,
        cache_key=request_cache_key(request),
    )


@router.get(
    "/api/v1/prompts",
    response_model=PromptPageEnvelope,
    responses=_problem_responses(400, 429, 503),
    tags=["prompts"],
    summary="Search and filter Prompt summaries",
)
async def prompts(
    request: Request,
    queries: Queries,
    locale: Annotated[str, Query(min_length=2, max_length=35)],
    q: Annotated[str | None, Query(max_length=200)] = None,
    content_type: Annotated[list[str] | None, Query(alias="contentType")] = None,
    model: Annotated[list[str] | None, Query()] = None,
    use_case: Annotated[list[str] | None, Query(alias="useCase")] = None,
    technique: Annotated[list[str] | None, Query()] = None,
    style: Annotated[list[str] | None, Query()] = None,
    subject: Annotated[list[str] | None, Query()] = None,
    creator: Annotated[list[str] | None, Query()] = None,
    window: Annotated[Window, Query()] = Window.ALL,
    sort: Annotated[PromptSort, Query()] = PromptSort.RELEVANCE,
    cursor: Annotated[str | None, Query(max_length=1024)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 24,
) -> Response:
    repeatable = {"contentType", "model", "useCase", "technique", "style", "subject", "creator"}
    _check_query_keys(
        request,
        allowed={
            "locale",
            "q",
            *repeatable,
            "window",
            "sort",
            "cursor",
            "limit",
        },
        repeatable=repeatable,
    )
    result = queries.prompts(
        PromptQuery(
            locale=locale,
            q=q,
            content_types=tuple(content_type or ()),
            models=tuple(model or ()),
            use_cases=tuple(use_case or ()),
            techniques=tuple(technique or ()),
            styles=tuple(style or ()),
            subjects=tuple(subject or ()),
            creators=tuple(creator or ()),
            window=window,
            sort=sort,
            cursor=cursor,
            limit=limit,
        )
    )
    payload = PromptPageEnvelope(
        data=[prompt_summary_schema(item) for item in result.items],
        page=page_schema(result.page),
        facets=facet_set_schema(result.facets),
        meta=response_meta(request, queries),
    )
    return api_response(
        request,
        payload,
        content_revision=queries.snapshot.content_revision,
        cache_key=request_cache_key(request),
    )


@router.get(
    "/api/v1/prompts/{slug}",
    response_model=PublicEnvelope[PromptDetailSchema],
    responses=_problem_responses(400, 404, 410, 429, 503),
    tags=["prompts"],
    summary="Read one complete Prompt locale variant",
)
async def prompt_detail(
    slug: str,
    request: Request,
    queries: Queries,
    locale: Annotated[str, Query(min_length=2, max_length=35)],
) -> Response:
    _check_query_keys(request, allowed={"locale"})
    prompt = queries.prompt(slug, locale)
    related = tuple(
        item
        for item in queries.snapshot.prompts
        if item.locale == locale and item.id in prompt.related_prompt_ids
    )
    payload = PublicEnvelope[PromptDetailSchema](
        data=prompt_detail_schema(prompt, related),
        meta=response_meta(request, queries),
    )
    return api_response(
        request,
        payload,
        content_revision=queries.snapshot.content_revision,
        cache_key=request_cache_key(request),
    )


@router.get(
    "/api/v1/facets",
    response_model=PublicEnvelope[FacetSetSchema],
    responses=_problem_responses(400, 429, 503),
    tags=["prompts"],
    summary="Read facet counts for the current filtered result set",
)
async def facets(
    request: Request,
    queries: Queries,
    locale: Annotated[str, Query(min_length=2, max_length=35)],
    q: Annotated[str | None, Query(max_length=200)] = None,
    content_type: Annotated[list[str] | None, Query(alias="contentType")] = None,
    model: Annotated[list[str] | None, Query()] = None,
    use_case: Annotated[list[str] | None, Query(alias="useCase")] = None,
    technique: Annotated[list[str] | None, Query()] = None,
    style: Annotated[list[str] | None, Query()] = None,
    subject: Annotated[list[str] | None, Query()] = None,
    creator: Annotated[list[str] | None, Query()] = None,
    window: Annotated[Window, Query()] = Window.ALL,
) -> Response:
    repeatable = {"contentType", "model", "useCase", "technique", "style", "subject", "creator"}
    _check_query_keys(
        request,
        allowed={"locale", "q", *repeatable, "window"},
        repeatable=repeatable,
    )
    result = queries.facets(
        PromptQuery(
            locale=locale,
            q=q,
            content_types=tuple(content_type or ()),
            models=tuple(model or ()),
            use_cases=tuple(use_case or ()),
            techniques=tuple(technique or ()),
            styles=tuple(style or ()),
            subjects=tuple(subject or ()),
            creators=tuple(creator or ()),
            window=window,
        )
    )
    payload = PublicEnvelope[FacetSetSchema](
        data=facet_set_schema(result),
        meta=response_meta(request, queries),
    )
    return api_response(
        request,
        payload,
        content_revision=queries.snapshot.content_revision,
        cache_key=request_cache_key(request),
    )


@router.get(
    "/api/v1/models/{slug}",
    response_model=PublicEnvelope[ModelProjectionSchema],
    responses=_problem_responses(400, 404, 410, 503),
    tags=["projections"],
    summary="Read an L3 model projection",
)
async def model_projection(
    slug: str,
    request: Request,
    queries: Queries,
    locale: Annotated[str, Query(min_length=2, max_length=35)],
    cursor: Annotated[str | None, Query(max_length=1024)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 24,
    sort: Annotated[PromptSort, Query()] = PromptSort.VALUE,
) -> Response:
    _check_query_keys(request, allowed={"locale", "cursor", "limit", "sort"})
    result = queries.model(slug, locale, cursor=cursor, limit=limit, sort=sort)
    payload = PublicEnvelope[ModelProjectionSchema](
        data=model_projection_schema(result),
        meta=response_meta(request, queries),
    )
    return api_response(
        request,
        payload,
        content_revision=queries.snapshot.content_revision,
        cache_key=request_cache_key(request),
    )


@router.get(
    "/api/v1/categories/{axis}/{slug}",
    response_model=PublicEnvelope[CategoryProjectionSchema],
    responses=_problem_responses(400, 404, 410, 503),
    tags=["projections"],
    summary="Read an L2 category projection",
)
async def category_projection(
    axis: CategoryAxisParam,
    slug: str,
    request: Request,
    queries: Queries,
    locale: Annotated[str, Query(min_length=2, max_length=35)],
    cursor: Annotated[str | None, Query(max_length=1024)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 24,
    sort: Annotated[PromptSort, Query()] = PromptSort.VALUE,
) -> Response:
    _check_query_keys(request, allowed={"locale", "cursor", "limit", "sort"})
    result = queries.category(
        TaxonomyAxis(axis.value),
        slug,
        locale,
        cursor=cursor,
        limit=limit,
        sort=sort,
    )
    payload = PublicEnvelope[CategoryProjectionSchema](
        data=category_projection_schema(result),
        meta=response_meta(request, queries),
    )
    return api_response(
        request,
        payload,
        content_revision=queries.snapshot.content_revision,
        cache_key=request_cache_key(request),
    )


@router.get(
    "/healthz",
    response_model=HealthSchema,
    responses=_problem_responses(400, 503),
    tags=["infrastructure"],
    summary="Read process and fixture-index health",
)
async def healthz(request: Request, queries: Queries) -> Response:
    _check_query_keys(request, allowed=set())
    payload = HealthSchema(
        service="pseo-public-api",
        status="ok",
        index_revision=queries.snapshot.content_revision,
        dependencies=DependencyHealthSchema(catalog="ok"),
    )
    return api_response(
        request,
        payload,
        content_revision=queries.snapshot.content_revision,
        cache_key=request_cache_key(request),
        headers={"Cache-Control": "no-store"},
    )
