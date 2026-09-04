"""Pure query semantics for the immutable public catalog."""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass, replace
from datetime import timedelta
from enum import StrEnum

from pseo.application.errors import (
    FieldIssue,
    InvalidQueryError,
    LocaleVariantNotFoundError,
    ResourceNotFoundError,
)
from pseo.domain.models import (
    CatalogSnapshot,
    CategoryRecord,
    ContentType,
    LocaleInfo,
    LocalizedRef,
    ModelRecord,
    PromptRecord,
    TaxonomyAxis,
)
from pseo.ports.catalog import CatalogRepository


class Window(StrEnum):
    SEVEN_DAYS = "7d"
    THIRTY_DAYS = "30d"
    ALL = "all"


class PromptSort(StrEnum):
    RELEVANCE = "relevance"
    TRENDING = "trending"
    VALUE = "value"
    NEWEST = "newest"


@dataclass(frozen=True, slots=True)
class PromptQuery:
    locale: str
    q: str | None = None
    content_types: tuple[str, ...] = ()
    models: tuple[str, ...] = ()
    use_cases: tuple[str, ...] = ()
    techniques: tuple[str, ...] = ()
    styles: tuple[str, ...] = ()
    subjects: tuple[str, ...] = ()
    creators: tuple[str, ...] = ()
    window: Window = Window.ALL
    sort: PromptSort = PromptSort.RELEVANCE
    cursor: str | None = None
    limit: int = 24

    def normalized(self) -> PromptQuery:
        return replace(
            self,
            q=self.q.strip() if self.q and self.q.strip() else None,
            content_types=_unique_sorted(self.content_types),
            models=_unique_sorted(self.models),
            use_cases=_unique_sorted(self.use_cases),
            techniques=_unique_sorted(self.techniques),
            styles=_unique_sorted(self.styles),
            subjects=_unique_sorted(self.subjects),
            creators=_unique_sorted(self.creators),
        )


@dataclass(frozen=True, slots=True)
class FacetValueResult:
    id: str
    slug: str
    label: str
    count: int
    selected: bool


@dataclass(frozen=True, slots=True)
class FacetSetResult:
    models: tuple[FacetValueResult, ...]
    use_cases: tuple[FacetValueResult, ...]
    techniques: tuple[FacetValueResult, ...]
    styles: tuple[FacetValueResult, ...]
    subjects: tuple[FacetValueResult, ...]
    creators: tuple[FacetValueResult, ...]


@dataclass(frozen=True, slots=True)
class PageResult:
    next_cursor: str | None
    has_more: bool
    limit: int
    total: int


@dataclass(frozen=True, slots=True)
class PromptPageResult:
    items: tuple[PromptRecord, ...]
    page: PageResult
    facets: FacetSetResult


@dataclass(frozen=True, slots=True)
class HomeStatsResult:
    prompt_count: int
    model_count: int
    updated_at: str
    index_version: str


@dataclass(frozen=True, slots=True)
class TrendingResult:
    window: Window
    ranking_version: str
    items: tuple[PromptRecord, ...]


@dataclass(frozen=True, slots=True)
class BrowseResult:
    models: tuple[LocalizedRef, ...]
    use_cases: tuple[LocalizedRef, ...]
    techniques: tuple[LocalizedRef, ...]
    styles: tuple[LocalizedRef, ...]


@dataclass(frozen=True, slots=True)
class HomeResult:
    stats: HomeStatsResult
    featured: tuple[PromptRecord, ...]
    trending: tuple[TrendingResult, ...]
    browse: BrowseResult
    collections: tuple[LocalizedRef, ...]
    creators: tuple[LocalizedRef, ...]


@dataclass(frozen=True, slots=True)
class ProjectionResult[EntityT: ModelRecord | CategoryRecord]:
    entity: EntityT
    items: tuple[PromptRecord, ...]
    page: PageResult
    facets: FacetSetResult


def _unique_sorted(values: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(sorted({item.strip() for item in values if item.strip()}))


def _matches_refs(refs: tuple[LocalizedRef, ...], selected: tuple[str, ...]) -> bool:
    if not selected:
        return True
    allowed = set(selected)
    return any(ref.slug in allowed or ref.id in allowed for ref in refs)


def _metric_value(prompt: PromptRecord) -> int:
    metrics = prompt.metrics
    return (
        (metrics.likes or 0)
        + (metrics.bookmarks or 0) * 2
        + (metrics.comments or 0)
        + (metrics.reposts or 0) * 2
    )


def _has_observed_metrics(prompt: PromptRecord) -> bool:
    metrics = prompt.metrics
    return any(
        value is not None
        for value in (
            metrics.likes,
            metrics.bookmarks,
            metrics.comments,
            metrics.reposts,
            metrics.views,
        )
    )


class CatalogQueries:
    """Read-only catalog use cases over one publication snapshot."""

    def __init__(self, repository: CatalogRepository) -> None:
        self._repository = repository

    @property
    def snapshot(self) -> CatalogSnapshot:
        return self._repository.snapshot()

    def locales(self) -> tuple[LocaleInfo, ...]:
        return self.snapshot.locales

    def require_locale(self, locale: str) -> None:
        locale_info = next(
            (item for item in self.snapshot.locales if item.locale == locale),
            None,
        )
        if locale_info is None:
            raise ResourceNotFoundError(
                f"Locale {locale!r} is not supported",
                issues=(
                    FieldIssue(
                        "locale",
                        "LOCALE_NOT_SUPPORTED",
                        "Locale is not supported",
                    ),
                ),
            )
        if not locale_info.enabled:
            raise LocaleVariantNotFoundError(
                f"Locale {locale!r} has no published catalog",
                issues=(
                    FieldIssue(
                        "locale",
                        "LOCALE_NOT_PUBLISHED",
                        "Requested locale is supported but not published",
                    ),
                ),
            )

    def home(self, locale: str) -> HomeResult:
        self.require_locale(locale)
        snapshot = self.snapshot
        prompts = tuple(item for item in snapshot.prompts if item.locale == locale)
        models = tuple(item for item in snapshot.models if item.locale == locale)
        featured = tuple(item for item in prompts if item.featured)[:1]
        trending = tuple(
            TrendingResult(
                window=window,
                ranking_version=snapshot.ranking_version,
                items=self._sort(
                    tuple(
                        item
                        for item in self._apply_window(prompts, window)
                        if _has_observed_metrics(item)
                    ),
                    PromptSort.TRENDING,
                    None,
                )[:4],
            )
            for window in (Window.SEVEN_DAYS, Window.THIRTY_DAYS, Window.ALL)
        )
        return HomeResult(
            stats=HomeStatsResult(
                prompt_count=len(prompts),
                model_count=len(models),
                updated_at=snapshot.generated_at.isoformat().replace("+00:00", "Z"),
                index_version=snapshot.index_version,
            ),
            featured=featured,
            trending=trending,
            browse=BrowseResult(
                models=_model_refs(models),
                use_cases=_collect_refs(prompts, "use_cases"),
                techniques=_collect_refs(prompts, "techniques"),
                styles=_collect_refs(prompts, "styles"),
            ),
            collections=(),
            creators=_collect_creators(prompts),
        )

    def prompts(self, query: PromptQuery) -> PromptPageResult:
        query = query.normalized()
        self.require_locale(query.locale)
        self._validate_query(query)
        matched = self._filter(query)
        facets = self._facets(matched, query)
        ordered = self._sort(matched, query.sort, query.q)
        offset = self._decode_cursor(query)
        page_items = ordered[offset : offset + query.limit]
        next_offset = offset + len(page_items)
        has_more = next_offset < len(ordered)
        return PromptPageResult(
            items=page_items,
            page=PageResult(
                next_cursor=self._encode_cursor(query, next_offset) if has_more else None,
                has_more=has_more,
                limit=query.limit,
                total=len(ordered),
            ),
            facets=facets,
        )

    def facets(self, query: PromptQuery) -> FacetSetResult:
        query = replace(query.normalized(), cursor=None)
        self.require_locale(query.locale)
        self._validate_query(query)
        return self._facets(self._filter(query), query)

    def prompt(self, slug: str, locale: str) -> PromptRecord:
        self.require_locale(locale)
        for prompt in self.snapshot.prompts:
            if prompt.locale == locale and prompt.slug == slug:
                return prompt
        matching_artifact = next(
            (
                prompt
                for prompt in self.snapshot.prompts
                if prompt.slug == slug or any(ref.slug == slug for ref in prompt.locale_variants)
            ),
            None,
        )
        if matching_artifact is not None:
            raise LocaleVariantNotFoundError(
                f"{locale} variant is not published at this slug",
                issues=(
                    FieldIssue(
                        "locale",
                        "VARIANT_NOT_PUBLISHED",
                        "Requested locale variant is not published at this slug",
                        matching_artifact.locale_variants,
                    ),
                ),
            )
        raise ResourceNotFoundError(f"Prompt {slug!r} was not found")

    def model(
        self,
        slug: str,
        locale: str,
        *,
        cursor: str | None,
        limit: int,
        sort: PromptSort,
    ) -> ProjectionResult[ModelRecord]:
        self.require_locale(locale)
        entity = next(
            (item for item in self.snapshot.models if item.locale == locale and item.slug == slug),
            None,
        )
        if entity is None:
            self._raise_projection_missing(self.snapshot.models, slug, locale, "Model")
        assert entity is not None
        page = self.prompts(
            PromptQuery(locale=locale, models=(slug,), cursor=cursor, limit=limit, sort=sort)
        )
        return ProjectionResult(entity=entity, items=page.items, page=page.page, facets=page.facets)

    def category(
        self,
        axis: TaxonomyAxis,
        slug: str,
        locale: str,
        *,
        cursor: str | None,
        limit: int,
        sort: PromptSort,
    ) -> ProjectionResult[CategoryRecord]:
        self.require_locale(locale)
        entity = next(
            (
                item
                for item in self.snapshot.categories
                if item.locale == locale and item.axis == axis and item.slug == slug
            ),
            None,
        )
        if entity is None:
            candidates = tuple(item for item in self.snapshot.categories if item.axis == axis)
            self._raise_projection_missing(candidates, slug, locale, "Category")
        assert entity is not None
        prompt_query = PromptQuery(
            locale=locale,
            cursor=cursor,
            limit=limit,
            sort=sort,
        )
        if axis == TaxonomyAxis.CONTENT_TYPE:
            prompt_query = replace(prompt_query, content_types=(slug,))
        elif axis == TaxonomyAxis.USE_CASE:
            prompt_query = replace(prompt_query, use_cases=(slug,))
        elif axis == TaxonomyAxis.TECHNIQUE:
            prompt_query = replace(prompt_query, techniques=(slug,))
        elif axis == TaxonomyAxis.STYLE:
            prompt_query = replace(prompt_query, styles=(slug,))
        elif axis == TaxonomyAxis.SUBJECT:
            prompt_query = replace(prompt_query, subjects=(slug,))
        else:
            raise InvalidQueryError("Model categories use /api/v1/models/{slug}")
        page = self.prompts(prompt_query)
        return ProjectionResult(entity=entity, items=page.items, page=page.page, facets=page.facets)

    def _raise_projection_missing(
        self,
        records: tuple[ModelRecord, ...] | tuple[CategoryRecord, ...],
        slug: str,
        locale: str,
        label: str,
    ) -> None:
        alternate = next(
            (
                item
                for item in records
                if item.slug == slug or any(ref.slug == slug for ref in item.locale_variants)
            ),
            None,
        )
        if alternate is not None:
            raise LocaleVariantNotFoundError(
                f"{label} has no {locale} variant at this slug",
                issues=(
                    FieldIssue(
                        "locale",
                        "VARIANT_NOT_PUBLISHED",
                        "Requested locale variant is not published at this slug",
                        alternate.locale_variants,
                    ),
                ),
            )
        raise ResourceNotFoundError(f"{label} {slug!r} was not found")

    def _validate_query(self, query: PromptQuery) -> None:
        if not 1 <= query.limit <= 50:
            raise InvalidQueryError(
                "limit must be between 1 and 50",
                issues=(FieldIssue("limit", "OUT_OF_RANGE", "Use a value from 1 to 50"),),
            )
        allowed_types = {item.value for item in ContentType}
        invalid_types = sorted(set(query.content_types) - allowed_types)
        if invalid_types:
            raise InvalidQueryError(
                f"Unsupported contentType: {', '.join(invalid_types)}",
                issues=(FieldIssue("contentType", "INVALID_ENUM", "Unsupported content type"),),
            )

    def _apply_window(
        self, prompts: tuple[PromptRecord, ...], window: Window
    ) -> tuple[PromptRecord, ...]:
        if window == Window.ALL:
            return prompts
        days = 7 if window == Window.SEVEN_DAYS else 30
        threshold = self.snapshot.generated_at - timedelta(days=days)
        return tuple(item for item in prompts if item.metrics.observed_at >= threshold)

    def _filter(self, query: PromptQuery) -> tuple[PromptRecord, ...]:
        prompts = tuple(item for item in self.snapshot.prompts if item.locale == query.locale)
        prompts = self._apply_window(prompts, query.window)
        selected_types = set(query.content_types)
        selected_creators = set(query.creators)
        result: list[PromptRecord] = []
        for prompt in prompts:
            if selected_types and prompt.content_type.value not in selected_types:
                continue
            if not _matches_refs(prompt.models, query.models):
                continue
            if not _matches_refs(prompt.use_cases, query.use_cases):
                continue
            if not _matches_refs(prompt.techniques, query.techniques):
                continue
            if not _matches_refs(prompt.styles, query.styles):
                continue
            if not _matches_refs(prompt.subjects, query.subjects):
                continue
            if selected_creators and (
                prompt.creator is None
                or (
                    prompt.creator.slug not in selected_creators
                    and prompt.creator.id not in selected_creators
                )
            ):
                continue
            if query.q and query.q.casefold() not in _search_text(prompt):
                continue
            result.append(prompt)
        return tuple(result)

    def _sort(
        self,
        prompts: tuple[PromptRecord, ...],
        sort: PromptSort,
        query: str | None,
    ) -> tuple[PromptRecord, ...]:
        needle = query.casefold() if query else None

        def key(item: PromptRecord) -> tuple[float, float, str]:
            if sort == PromptSort.NEWEST:
                return (-item.published_at.timestamp(), 0.0, item.id)
            if sort in (PromptSort.TRENDING, PromptSort.VALUE):
                return (-_metric_value(item), -item.published_at.timestamp(), item.id)
            if needle is not None:
                return (
                    -_search_text(item).count(needle),
                    -_metric_value(item),
                    item.id,
                )
            return (-int(item.featured), -_metric_value(item), item.id)

        return tuple(sorted(prompts, key=key))

    def _facets(self, prompts: tuple[PromptRecord, ...], query: PromptQuery) -> FacetSetResult:
        return FacetSetResult(
            models=_facet_values(prompts, "models", query.models),
            use_cases=_facet_values(prompts, "use_cases", query.use_cases),
            techniques=_facet_values(prompts, "techniques", query.techniques),
            styles=_facet_values(prompts, "styles", query.styles),
            subjects=_facet_values(prompts, "subjects", query.subjects),
            creators=_creator_facets(prompts, query.creators),
        )

    def _cursor_signature(self, query: PromptQuery) -> str:
        values = {
            "locale": query.locale,
            "q": query.q,
            "contentTypes": query.content_types,
            "models": query.models,
            "useCases": query.use_cases,
            "techniques": query.techniques,
            "styles": query.styles,
            "subjects": query.subjects,
            "creators": query.creators,
            "window": query.window.value,
            "sort": query.sort.value,
            "limit": query.limit,
        }
        encoded = json.dumps(values, sort_keys=True, separators=(",", ":")).encode()
        return hashlib.sha256(encoded).hexdigest()[:24]

    def _encode_cursor(self, query: PromptQuery, offset: int) -> str:
        payload = {
            "offset": offset,
            "revision": self.snapshot.content_revision,
            "query": self._cursor_signature(query),
        }
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        return base64.urlsafe_b64encode(encoded).decode().rstrip("=")

    def _decode_cursor(self, query: PromptQuery) -> int:
        if query.cursor is None:
            return 0
        try:
            padding = "=" * (-len(query.cursor) % 4)
            decoded = base64.urlsafe_b64decode(f"{query.cursor}{padding}")
            payload = json.loads(decoded)
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise InvalidQueryError("cursor is malformed") from exc
        if not isinstance(payload, dict) or set(payload) != {"offset", "revision", "query"}:
            raise InvalidQueryError("cursor has an unsupported shape")
        offset = payload["offset"]
        if not isinstance(offset, int) or isinstance(offset, bool) or offset < 0:
            raise InvalidQueryError("cursor offset is invalid")
        if payload["revision"] != self.snapshot.content_revision:
            raise InvalidQueryError("cursor belongs to a stale content revision")
        if payload["query"] != self._cursor_signature(query):
            raise InvalidQueryError("cursor does not belong to this query")
        return offset


def _search_text(prompt: PromptRecord) -> str:
    refs = (
        *prompt.models,
        *prompt.use_cases,
        *prompt.techniques,
        *prompt.styles,
        *prompt.subjects,
    )
    values = [
        prompt.title,
        prompt.summary,
        prompt.prompt_text,
        *(ref.name for ref in refs),
        *(ref.slug for ref in refs),
    ]
    if prompt.creator is not None:
        values.extend((prompt.creator.name, prompt.creator.slug))
    return " ".join(values).casefold()


def _collect_refs(prompts: tuple[PromptRecord, ...], attribute: str) -> tuple[LocalizedRef, ...]:
    refs: dict[str, LocalizedRef] = {}
    for prompt in prompts:
        values = getattr(prompt, attribute)
        if not isinstance(values, tuple):
            continue
        for ref in values:
            if isinstance(ref, LocalizedRef):
                refs[ref.id] = ref
    return tuple(sorted(refs.values(), key=lambda item: (item.name.casefold(), item.id)))


def _model_refs(models: tuple[ModelRecord, ...]) -> tuple[LocalizedRef, ...]:
    refs: list[LocalizedRef] = []
    for model in models:
        variant = next(
            (item for item in model.locale_variants if item.locale == model.locale),
            None,
        )
        if variant is None:
            continue
        refs.append(
            LocalizedRef(
                id=model.id,
                slug=model.slug,
                name=model.name,
                href=variant.href,
            )
        )
    return tuple(sorted(refs, key=lambda item: (item.name.casefold(), item.id)))


def _collect_creators(prompts: tuple[PromptRecord, ...]) -> tuple[LocalizedRef, ...]:
    refs = {prompt.creator.id: prompt.creator for prompt in prompts if prompt.creator is not None}
    return tuple(sorted(refs.values(), key=lambda item: (item.name.casefold(), item.id)))


def _facet_values(
    prompts: tuple[PromptRecord, ...], attribute: str, selected: tuple[str, ...]
) -> tuple[FacetValueResult, ...]:
    counts: dict[str, tuple[LocalizedRef, int]] = {}
    for prompt in prompts:
        values = getattr(prompt, attribute)
        if not isinstance(values, tuple):
            continue
        for ref in values:
            if not isinstance(ref, LocalizedRef):
                continue
            previous = counts.get(ref.id)
            counts[ref.id] = (ref, (previous[1] if previous else 0) + 1)
    chosen = set(selected)
    return tuple(
        FacetValueResult(
            id=ref.id,
            slug=ref.slug,
            label=ref.name,
            count=count,
            selected=ref.id in chosen or ref.slug in chosen,
        )
        for ref, count in sorted(counts.values(), key=lambda item: (-item[1], item[0].name))
    )


def _creator_facets(
    prompts: tuple[PromptRecord, ...], selected: tuple[str, ...]
) -> tuple[FacetValueResult, ...]:
    counts: dict[str, tuple[LocalizedRef, int]] = {}
    for prompt in prompts:
        if prompt.creator is None:
            continue
        previous = counts.get(prompt.creator.id)
        counts[prompt.creator.id] = (prompt.creator, (previous[1] if previous else 0) + 1)
    chosen = set(selected)
    return tuple(
        FacetValueResult(
            id=ref.id,
            slug=ref.slug,
            label=ref.name,
            count=count,
            selected=ref.id in chosen or ref.slug in chosen,
        )
        for ref, count in sorted(counts.values(), key=lambda item: (-item[1], item[0].name))
    )
