"""Immutable domain objects for the public prompt catalog."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class ContentType(StrEnum):
    """Supported public Prompt output families."""

    IMAGE = "image"
    VIDEO = "video"
    TEXT = "text"
    OTHER = "other"


class SourcePlatform(StrEnum):
    """Public provenance providers allowed by the frozen API."""

    X = "x"
    RSS = "rss"
    URL = "url"
    MANUAL = "manual"


class MediaType(StrEnum):
    """Public media variants."""

    IMAGE = "image"
    VIDEO = "video"


class ParameterType(StrEnum):
    """Prompt parameter input kinds."""

    TEXT = "text"
    NUMBER = "number"
    ENUM = "enum"
    BOOLEAN = "boolean"


class TaxonomyAxis(StrEnum):
    """Closed taxonomy axes used by public filters."""

    MODEL = "model"
    CONTENT_TYPE = "content-type"
    USE_CASE = "use-case"
    TECHNIQUE = "technique"
    STYLE = "style"
    SUBJECT = "subject"


@dataclass(frozen=True, slots=True)
class LocaleInfo:
    locale: str
    display_name: str
    is_default: bool
    enabled: bool


@dataclass(frozen=True, slots=True)
class LocaleVariantRef:
    locale: str
    slug: str
    href: str


@dataclass(frozen=True, slots=True)
class LocalizedRef:
    id: str
    slug: str
    name: str
    href: str


@dataclass(frozen=True, slots=True)
class Media:
    asset_id: str
    media_type: MediaType
    url: str
    width: int
    height: int
    alt: str
    poster_url: str | None = None


@dataclass(frozen=True, slots=True)
class SourceSummary:
    platform: SourcePlatform
    source_id: str
    url: str
    author_handle: str | None
    observed_at: datetime


@dataclass(frozen=True, slots=True)
class Metrics:
    likes: int | None
    bookmarks: int | None
    comments: int | None
    reposts: int | None
    views: int | None
    observed_at: datetime


@dataclass(frozen=True, slots=True)
class PromptVariable:
    key: str
    label: str
    required: bool
    default_value: str | None
    options: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class PromptParameter:
    key: str
    label: str
    parameter_type: ParameterType
    required: bool
    options: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class PromptExample:
    id: str
    input_text: str | None
    output: Media
    caption: str | None


@dataclass(frozen=True, slots=True)
class WorkflowStep:
    position: int
    title: str
    body: str


@dataclass(frozen=True, slots=True)
class Evidence:
    evidence_type: str
    url: str | None
    confidence: float | None


@dataclass(frozen=True, slots=True)
class SeoMetadata:
    title: str
    description: str
    canonical_url: str
    hreflang: tuple[tuple[str, str], ...]
    robots: str


@dataclass(frozen=True, slots=True)
class PromptRecord:
    """One published locale variant of a Prompt Artifact."""

    id: str
    locale: str
    slug: str
    title: str
    summary: str
    content_type: ContentType
    prompt_text: str
    prompt_language: str
    outcome_type: str
    purpose: str
    platforms: tuple[str, ...]
    characteristics: tuple[str, ...]
    variables: tuple[PromptVariable, ...]
    required_inputs: tuple[str, ...]
    optional_inputs: tuple[str, ...]
    parameters: tuple[PromptParameter, ...]
    examples: tuple[PromptExample, ...]
    workflow: tuple[WorkflowStep, ...]
    models: tuple[LocalizedRef, ...]
    use_cases: tuple[LocalizedRef, ...]
    techniques: tuple[LocalizedRef, ...]
    styles: tuple[LocalizedRef, ...]
    subjects: tuple[LocalizedRef, ...]
    creator: LocalizedRef | None
    media: tuple[Media, ...]
    source: SourceSummary
    metrics: Metrics
    evidence: tuple[Evidence, ...]
    locale_variants: tuple[LocaleVariantRef, ...]
    related_prompt_ids: tuple[str, ...]
    can_copy: bool
    try_url: str | None
    published_at: datetime
    updated_at: datetime
    seo: SeoMetadata
    revision: str
    featured: bool = False


@dataclass(frozen=True, slots=True)
class ModelRecord:
    id: str
    locale: str
    slug: str
    name: str
    description: str
    locale_variants: tuple[LocaleVariantRef, ...]
    seo: SeoMetadata
    official_url: str | None
    updated_at: datetime
    capabilities: tuple[str, ...]
    inputs: tuple[str, ...]
    outputs: tuple[str, ...]
    limitations: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class CategoryRecord:
    id: str
    locale: str
    axis: TaxonomyAxis
    slug: str
    name: str
    description: str
    locale_variants: tuple[LocaleVariantRef, ...]
    seo: SeoMetadata
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class CatalogSnapshot:
    """One immutable, internally consistent read snapshot."""

    content_revision: str
    index_version: str
    ranking_version: str
    generated_at: datetime
    locales: tuple[LocaleInfo, ...]
    prompts: tuple[PromptRecord, ...]
    models: tuple[ModelRecord, ...]
    categories: tuple[CategoryRecord, ...]
