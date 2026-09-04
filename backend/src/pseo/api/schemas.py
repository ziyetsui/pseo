"""Closed Pydantic response models and explicit domain mappings."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime
from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field

from pseo.application.queries import (
    FacetSetResult,
    FacetValueResult,
    HomeResult,
    PageResult,
    ProjectionResult,
)
from pseo.domain.models import (
    CategoryRecord,
    LocaleInfo,
    LocaleVariantRef,
    LocalizedRef,
    Media,
    Metrics,
    ModelRecord,
    PromptRecord,
    SeoMetadata,
    SourceSummary,
)


def _to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(item.capitalize() for item in tail)


class ApiModel(BaseModel):
    """Closed camelCase API model."""

    model_config: ClassVar[ConfigDict] = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class LocaleVariantRefSchema(ApiModel):
    locale: str
    slug: str
    href: str


class LocalizedRefSchema(ApiModel):
    id: str
    slug: str
    name: str
    href: str


class MediaSchema(ApiModel):
    asset_id: str
    type: Literal["image", "video"]
    url: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    alt: str
    poster_url: str | None


class SourceSummarySchema(ApiModel):
    platform: Literal["x", "rss", "url", "manual"]
    source_id: str
    url: str
    author_handle: str | None
    observed_at: str


class MetricsSchema(ApiModel):
    likes: int | None
    bookmarks: int | None
    comments: int | None
    reposts: int | None
    views: int | None
    observed_at: str


class FacetValueSchema(ApiModel):
    id: str
    slug: str
    label: str
    count: int = Field(ge=0)
    selected: bool


class FacetSetSchema(ApiModel):
    models: list[FacetValueSchema]
    use_cases: list[FacetValueSchema]
    techniques: list[FacetValueSchema]
    styles: list[FacetValueSchema]
    subjects: list[FacetValueSchema]
    creators: list[FacetValueSchema]


class PromptSummarySchema(ApiModel):
    id: str
    slug: str
    href: str
    locale: str
    title: str
    excerpt: str
    content_type: Literal["image", "video", "text", "other"]
    prompt_preview: str
    models: list[LocalizedRefSchema]
    use_cases: list[LocalizedRefSchema]
    techniques: list[LocalizedRefSchema]
    styles: list[LocalizedRefSchema]
    subjects: list[LocalizedRefSchema]
    media: list[MediaSchema]
    source: SourceSummarySchema
    metrics: MetricsSchema
    published_at: str
    updated_at: str


class PromptIdentitySchema(ApiModel):
    title: str
    summary: str
    content_type: str


class PromptOutcomeSchema(ApiModel):
    output_type: str
    purpose: str
    platforms: list[str]
    characteristics: list[str]


class PromptVariableSchema(ApiModel):
    key: str
    label: str
    required: bool
    default_value: str | None
    options: list[str]


class PromptBodySchema(ApiModel):
    language: str
    text: str
    variables: list[PromptVariableSchema]


class PromptInputsSchema(ApiModel):
    required: list[str]
    optional: list[str]


class PromptParameterSchema(ApiModel):
    key: str
    label: str
    type: Literal["text", "number", "enum", "boolean"]
    required: bool
    options: list[str]


class PromptExampleSchema(ApiModel):
    id: str
    input: str | None
    output: MediaSchema
    caption: str | None


class WorkflowStepSchema(ApiModel):
    position: int = Field(ge=1)
    title: str
    body: str


class EvidenceSchema(ApiModel):
    type: str
    url: str | None
    confidence: float | None


class PromptRelationsSchema(ApiModel):
    models: list[LocalizedRefSchema]
    use_cases: list[LocalizedRefSchema]
    techniques: list[LocalizedRefSchema]
    styles: list[LocalizedRefSchema]
    subjects: list[LocalizedRefSchema]
    creator: LocalizedRefSchema | None
    related_prompts: list[PromptSummarySchema]


class PromptActionsSchema(ApiModel):
    can_copy: bool
    try_url: str | None


class SeoSchema(ApiModel):
    title: str
    description: str
    canonical_url: str
    hreflang: dict[str, str]
    robots: Literal["index,follow", "noindex,nofollow"]


class PromptDetailSchema(ApiModel):
    summary: PromptSummarySchema
    locale_variants: list[LocaleVariantRefSchema]
    identity: PromptIdentitySchema
    outcome: PromptOutcomeSchema
    prompt: PromptBodySchema
    inputs: PromptInputsSchema
    parameters: list[PromptParameterSchema]
    examples: list[PromptExampleSchema]
    workflow: list[WorkflowStepSchema]
    variations: list[PromptSummarySchema]
    source: SourceSummarySchema
    evidence: list[EvidenceSchema]
    relations: PromptRelationsSchema
    actions: PromptActionsSchema
    seo: SeoSchema
    revision: str


class ResponseMetaSchema(ApiModel):
    request_id: str
    content_revision: str
    index_version: str
    ranking_version: str


class PublicEnvelope[DataT](ApiModel):
    data: DataT
    meta: ResponseMetaSchema


class PageSchema(ApiModel):
    next_cursor: str | None
    has_more: bool
    limit: int
    total: int


class PromptPageEnvelope(ApiModel):
    data: list[PromptSummarySchema]
    page: PageSchema
    facets: FacetSetSchema | None
    meta: ResponseMetaSchema


class HomeStatsSchema(ApiModel):
    prompt_count: int
    model_count: int
    updated_at: str
    index_version: str


class TrendingSchema(ApiModel):
    window: Literal["7d", "30d", "all"]
    ranking_version: str
    items: list[PromptSummarySchema]


class BrowseSchema(ApiModel):
    models: list[LocalizedRefSchema]
    use_cases: list[LocalizedRefSchema]
    techniques: list[LocalizedRefSchema]
    styles: list[LocalizedRefSchema]


class HomeDataSchema(ApiModel):
    stats: HomeStatsSchema
    featured: list[PromptSummarySchema]
    trending: list[TrendingSchema]
    browse: BrowseSchema
    collections: list[LocalizedRefSchema]
    creators: list[LocalizedRefSchema]


class LocaleInfoSchema(ApiModel):
    locale: str
    display_name: str
    default: bool
    enabled: bool
    href: str


class ProjectionBaseSchema(ApiModel):
    id: str
    slug: str
    name: str
    description: str
    locale_variants: list[LocaleVariantRefSchema]
    seo: SeoSchema


class ModelEntitySchema(ProjectionBaseSchema):
    official_url: str | None
    updated_at: str
    capabilities: list[str]
    inputs: list[str]
    outputs: list[str]
    limitations: list[str]


class CategoryEntitySchema(ProjectionBaseSchema):
    axis: Literal["content-type", "use-case", "technique", "style", "subject"]
    updated_at: str


class ModelProjectionSchema(ApiModel):
    entity: ModelEntitySchema
    items: list[PromptSummarySchema]
    page: PageSchema
    facets: FacetSetSchema


class CategoryProjectionSchema(ApiModel):
    entity: CategoryEntitySchema
    items: list[PromptSummarySchema]
    page: PageSchema
    facets: FacetSetSchema


class DependencyHealthSchema(ApiModel):
    catalog: Literal["ok"]


class HealthSchema(ApiModel):
    service: str
    status: Literal["ok"]
    index_revision: str
    dependencies: DependencyHealthSchema


class ProblemLocaleMetaSchema(ApiModel):
    locale_variants: list[LocaleVariantRefSchema]


class ProblemFieldErrorSchema(ApiModel):
    path: str
    code: str
    message: str
    meta: ProblemLocaleMetaSchema | None = None


class ProblemSchema(ApiModel):
    type: str
    title: str
    status: int
    code: str
    detail: str
    instance: str
    trace_id: str
    errors: list[ProblemFieldErrorSchema]


def timestamp(value: datetime) -> str:
    rendered = value.isoformat()
    return rendered.replace("+00:00", "Z")


def locale_variant_schema(value: LocaleVariantRef) -> LocaleVariantRefSchema:
    return LocaleVariantRefSchema(locale=value.locale, slug=value.slug, href=value.href)


def localized_ref_schema(value: LocalizedRef) -> LocalizedRefSchema:
    return LocalizedRefSchema(id=value.id, slug=value.slug, name=value.name, href=value.href)


def media_schema(value: Media) -> MediaSchema:
    return MediaSchema(
        asset_id=value.asset_id,
        type=value.media_type.value,
        url=value.url,
        width=value.width,
        height=value.height,
        alt=value.alt,
        poster_url=value.poster_url,
    )


def source_schema(value: SourceSummary) -> SourceSummarySchema:
    return SourceSummarySchema(
        platform=value.platform.value,
        source_id=value.source_id,
        url=value.url,
        author_handle=value.author_handle,
        observed_at=timestamp(value.observed_at),
    )


def metrics_schema(value: Metrics) -> MetricsSchema:
    return MetricsSchema(
        likes=value.likes,
        bookmarks=value.bookmarks,
        comments=value.comments,
        reposts=value.reposts,
        views=value.views,
        observed_at=timestamp(value.observed_at),
    )


def prompt_summary_schema(value: PromptRecord) -> PromptSummarySchema:
    preview_limit = 180
    preview = value.prompt_text
    if len(preview) > preview_limit:
        preview = f"{preview[: preview_limit - 1].rstrip()}…"
    return PromptSummarySchema(
        id=value.id,
        slug=value.slug,
        href=f"/{value.locale}/prompts/{value.slug}",
        locale=value.locale,
        title=value.title,
        excerpt=value.summary,
        content_type=value.content_type.value,
        prompt_preview=preview,
        models=[localized_ref_schema(item) for item in value.models],
        use_cases=[localized_ref_schema(item) for item in value.use_cases],
        techniques=[localized_ref_schema(item) for item in value.techniques],
        styles=[localized_ref_schema(item) for item in value.styles],
        subjects=[localized_ref_schema(item) for item in value.subjects],
        media=[media_schema(item) for item in value.media],
        source=source_schema(value.source),
        metrics=metrics_schema(value.metrics),
        published_at=timestamp(value.published_at),
        updated_at=timestamp(value.updated_at),
    )


def prompt_detail_schema(
    value: PromptRecord, related: Iterable[PromptRecord]
) -> PromptDetailSchema:
    related_items = [prompt_summary_schema(item) for item in related]
    return PromptDetailSchema(
        summary=prompt_summary_schema(value),
        locale_variants=[locale_variant_schema(item) for item in value.locale_variants],
        identity=PromptIdentitySchema(
            title=value.title,
            summary=value.summary,
            content_type=value.content_type.value,
        ),
        outcome=PromptOutcomeSchema(
            output_type=value.outcome_type,
            purpose=value.purpose,
            platforms=list(value.platforms),
            characteristics=list(value.characteristics),
        ),
        prompt=PromptBodySchema(
            language=value.prompt_language,
            text=value.prompt_text,
            variables=[
                PromptVariableSchema(
                    key=item.key,
                    label=item.label,
                    required=item.required,
                    default_value=item.default_value,
                    options=list(item.options),
                )
                for item in value.variables
            ],
        ),
        inputs=PromptInputsSchema(
            required=list(value.required_inputs), optional=list(value.optional_inputs)
        ),
        parameters=[
            PromptParameterSchema(
                key=item.key,
                label=item.label,
                type=item.parameter_type.value,
                required=item.required,
                options=list(item.options),
            )
            for item in value.parameters
        ],
        examples=[
            PromptExampleSchema(
                id=item.id,
                input=item.input_text,
                output=media_schema(item.output),
                caption=item.caption,
            )
            for item in value.examples
        ],
        workflow=[
            WorkflowStepSchema(position=item.position, title=item.title, body=item.body)
            for item in value.workflow
        ],
        variations=[],
        source=source_schema(value.source),
        evidence=[
            EvidenceSchema(
                type=item.evidence_type,
                url=item.url,
                confidence=item.confidence,
            )
            for item in value.evidence
        ],
        relations=PromptRelationsSchema(
            models=[localized_ref_schema(item) for item in value.models],
            use_cases=[localized_ref_schema(item) for item in value.use_cases],
            techniques=[localized_ref_schema(item) for item in value.techniques],
            styles=[localized_ref_schema(item) for item in value.styles],
            subjects=[localized_ref_schema(item) for item in value.subjects],
            creator=localized_ref_schema(value.creator) if value.creator is not None else None,
            related_prompts=related_items,
        ),
        actions=PromptActionsSchema(can_copy=value.can_copy, try_url=value.try_url),
        seo=seo_schema(value.seo),
        revision=value.revision,
    )


def seo_schema(value: SeoMetadata) -> SeoSchema:
    return SeoSchema(
        title=value.title,
        description=value.description,
        canonical_url=value.canonical_url,
        hreflang=dict(value.hreflang),
        robots=value.robots,
    )


def facet_value_schema(value: FacetValueResult) -> FacetValueSchema:
    return FacetValueSchema(
        id=value.id,
        slug=value.slug,
        label=value.label,
        count=value.count,
        selected=value.selected,
    )


def facet_set_schema(value: FacetSetResult) -> FacetSetSchema:
    return FacetSetSchema(
        models=[facet_value_schema(item) for item in value.models],
        use_cases=[facet_value_schema(item) for item in value.use_cases],
        techniques=[facet_value_schema(item) for item in value.techniques],
        styles=[facet_value_schema(item) for item in value.styles],
        subjects=[facet_value_schema(item) for item in value.subjects],
        creators=[facet_value_schema(item) for item in value.creators],
    )


def page_schema(value: PageResult) -> PageSchema:
    return PageSchema(
        next_cursor=value.next_cursor,
        has_more=value.has_more,
        limit=value.limit,
        total=value.total,
    )


def home_schema(value: HomeResult) -> HomeDataSchema:
    return HomeDataSchema(
        stats=HomeStatsSchema(
            prompt_count=value.stats.prompt_count,
            model_count=value.stats.model_count,
            updated_at=value.stats.updated_at,
            index_version=value.stats.index_version,
        ),
        featured=[prompt_summary_schema(item) for item in value.featured],
        trending=[
            TrendingSchema(
                window=item.window.value,
                ranking_version=item.ranking_version,
                items=[prompt_summary_schema(prompt) for prompt in item.items],
            )
            for item in value.trending
        ],
        browse=BrowseSchema(
            models=[localized_ref_schema(item) for item in value.browse.models],
            use_cases=[localized_ref_schema(item) for item in value.browse.use_cases],
            techniques=[localized_ref_schema(item) for item in value.browse.techniques],
            styles=[localized_ref_schema(item) for item in value.browse.styles],
        ),
        collections=[localized_ref_schema(item) for item in value.collections],
        creators=[localized_ref_schema(item) for item in value.creators],
    )


def locale_schema(value: LocaleInfo) -> LocaleInfoSchema:
    return LocaleInfoSchema(
        locale=value.locale,
        display_name=value.display_name,
        default=value.is_default,
        enabled=value.enabled,
        href=f"/{value.locale}/prompts",
    )


def model_projection_schema(value: ProjectionResult[ModelRecord]) -> ModelProjectionSchema:
    entity = value.entity
    return ModelProjectionSchema(
        entity=ModelEntitySchema(
            id=entity.id,
            slug=entity.slug,
            name=entity.name,
            description=entity.description,
            locale_variants=[locale_variant_schema(item) for item in entity.locale_variants],
            seo=seo_schema(entity.seo),
            official_url=entity.official_url,
            updated_at=timestamp(entity.updated_at),
            capabilities=list(entity.capabilities),
            inputs=list(entity.inputs),
            outputs=list(entity.outputs),
            limitations=list(entity.limitations),
        ),
        items=[prompt_summary_schema(item) for item in value.items],
        page=page_schema(value.page),
        facets=facet_set_schema(value.facets),
    )


def category_projection_schema(
    value: ProjectionResult[CategoryRecord],
) -> CategoryProjectionSchema:
    entity = value.entity
    return CategoryProjectionSchema(
        entity=CategoryEntitySchema(
            id=entity.id,
            slug=entity.slug,
            name=entity.name,
            description=entity.description,
            locale_variants=[locale_variant_schema(item) for item in entity.locale_variants],
            seo=seo_schema(entity.seo),
            axis=entity.axis.value,
            updated_at=timestamp(entity.updated_at),
        ),
        items=[prompt_summary_schema(item) for item in value.items],
        page=page_schema(value.page),
        facets=facet_set_schema(value.facets),
    )
