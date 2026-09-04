"""Read the verified Git publication snapshot without inventing catalog data.

The internal beta has one shared fixture: the repository's validated Markdown
and generated route manifest.  This adapter reads that fixture in place, fails
closed on publication-state drift, and maps it onto the public catalog port.
It never writes the repository and never performs network I/O.
"""

from __future__ import annotations

import hashlib
from collections import defaultdict
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from pseo.domain.models import (
    CatalogSnapshot,
    CategoryRecord,
    ContentType,
    Evidence,
    LocaleInfo,
    LocaleVariantRef,
    LocalizedRef,
    Media,
    MediaType,
    Metrics,
    ModelRecord,
    ParameterType,
    PromptExample,
    PromptParameter,
    PromptRecord,
    PromptVariable,
    SeoMetadata,
    SourcePlatform,
    SourceSummary,
    TaxonomyAxis,
    WorkflowStep,
)

DEFAULT_REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
INDEX_VERSION = "git-static-v1"
RANKING_VERSION = "unranked-v1"
_EMPTY_CATALOG_GENERATED_AT = datetime(1970, 1, 1, tzinfo=UTC)


class _InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class _SiteConfig(_InputModel):
    schema_version: int = Field(alias="schemaVersion")
    site_name: str = Field(alias="siteName")
    canonical_origin: str = Field(alias="canonicalOrigin")
    default_locale: str = Field(alias="defaultLocale")
    locales: tuple[str, ...]
    published_locales: tuple[str, ...] = Field(alias="publishedLocales")


class _Route(_InputModel):
    artifact_id: str | None = Field(default=None, alias="artifactId")
    kind: str
    locale: str
    path: str


class _RouteManifest(_InputModel):
    schema_version: int = Field(alias="schemaVersion")
    content_revision: str = Field(alias="contentRevision")
    published_locales: tuple[str, ...] = Field(alias="publishedLocales")
    routes: tuple[_Route, ...]


class _BuildFile(_InputModel):
    bytes: int
    path: str
    sha256: str


class _BuildManifest(_InputModel):
    schema_version: int = Field(alias="schemaVersion")
    content_revision: str = Field(alias="contentRevision")
    published_locales: tuple[str, ...] = Field(alias="publishedLocales")
    supported_locales: tuple[str, ...] = Field(alias="supportedLocales")
    counts: dict[str, int]
    files: tuple[_BuildFile, ...]


class _TaxonomySelector(_InputModel):
    field: Literal["contentType", "models"]
    value: str


class _TaxonomyModel(_InputModel):
    official_url: str | None = Field(alias="officialUrl")
    capabilities: tuple[str, ...]
    inputs: tuple[str, ...]
    outputs: tuple[str, ...]
    limitations: tuple[str, ...]


class _TaxonomySeo(_InputModel):
    title: str
    description: str
    canonical: str
    robots: Literal["index,follow", "noindex,nofollow"]


class _TaxonomyItem(_InputModel):
    axis: Literal["content-type", "model"]
    description: str
    href: str
    id: str
    locale: str
    member_count: int = Field(alias="memberCount", ge=0)
    member_ids: tuple[str, ...] = Field(alias="memberIds")
    model: _TaxonomyModel | None
    name: str
    selector: _TaxonomySelector
    seo: _TaxonomySeo
    slug: str
    updated_at: datetime = Field(alias="updatedAt")


class _TaxonomyIndex(_InputModel):
    content_revision: str = Field(alias="contentRevision")
    items: tuple[_TaxonomyItem, ...]
    locale: str
    schema_version: Literal[1] = Field(alias="schemaVersion")
    total: int = Field(ge=0)


class _GitVariable(_InputModel):
    key: str
    label: str
    required: bool
    default_value: str | None = Field(alias="defaultValue")
    options: tuple[str, ...]


class _GitPromptBody(_InputModel):
    language: str
    text: str
    variables: tuple[_GitVariable, ...]


class _GitOutcome(_InputModel):
    output_type: str = Field(alias="outputType")
    purpose: str
    platforms: tuple[str, ...]
    characteristics: tuple[str, ...]


class _GitMedia(_InputModel):
    asset_id: str = Field(alias="assetId")
    media_type: str = Field(alias="type")
    url: str
    width: int
    height: int
    alt: str
    poster_url: str | None = Field(alias="posterUrl")


class _GitMetrics(_InputModel):
    likes: int | None
    bookmarks: int | None
    comments: int | None
    reposts: int | None
    views: int | None
    observed_at: datetime = Field(alias="observedAt")


class _GitInputs(_InputModel):
    required: tuple[str, ...]
    optional: tuple[str, ...]


class _GitParameter(_InputModel):
    key: str
    label: str
    parameter_type: str = Field(alias="type")
    required: bool
    options: tuple[str, ...]


class _GitExample(_InputModel):
    id: str
    input_text: str | None = Field(alias="input")
    output: _GitMedia
    caption: str | None


class _GitWorkflowStep(_InputModel):
    position: int
    title: str
    body: str


class _GitCreator(_InputModel):
    id: str
    slug: str
    name: str


class _GitActions(_InputModel):
    can_copy: bool = Field(alias="canCopy")
    try_url: str | None = Field(alias="tryUrl")


class _GitSource(_InputModel):
    platform: str
    source_id: str = Field(alias="sourceId")
    url: str
    author_handle: str | None = Field(alias="authorHandle")
    published_date: date = Field(alias="publishedDate")
    observed_at: datetime = Field(alias="observedAt")


class _GitEvidence(_InputModel):
    evidence_type: str = Field(alias="type")
    url: str | None
    confidence: float | None


class _GitSeo(_InputModel):
    title: str
    description: str
    canonical: str
    robots: str


class _GitPublication(_InputModel):
    published_at: datetime = Field(alias="publishedAt")
    updated_at: datetime = Field(alias="updatedAt")
    source_revision: str = Field(alias="sourceRevision")


class _GitTranslation(_InputModel):
    status: str
    translated_from_revision: str | None = Field(alias="translatedFromRevision")
    reviewer: str | None


class _GitPrompt(_InputModel):
    schema_version: int = Field(alias="schemaVersion")
    id: str
    content_kind: str = Field(alias="type")
    locale: str
    source_locale: str = Field(alias="sourceLocale")
    slug: str
    title: str
    summary: str
    status: str
    indexable: bool
    content_type: str = Field(alias="contentType")
    models: tuple[str, ...]
    use_cases: tuple[str, ...] = Field(alias="useCases")
    techniques: tuple[str, ...]
    styles: tuple[str, ...]
    subjects: tuple[str, ...]
    prompt: _GitPromptBody
    outcome: _GitOutcome
    media: tuple[_GitMedia, ...]
    metrics: _GitMetrics
    inputs: _GitInputs
    parameters: tuple[_GitParameter, ...]
    examples: tuple[_GitExample, ...]
    workflow: tuple[_GitWorkflowStep, ...]
    creator: _GitCreator | None
    related_prompt_ids: tuple[str, ...] = Field(alias="relatedPromptIds")
    actions: _GitActions
    source: _GitSource
    evidence: tuple[_GitEvidence, ...]
    seo: _GitSeo
    publication: _GitPublication
    translation: _GitTranslation


def _read_model[ModelT: BaseModel](path: Path, model: type[ModelT]) -> ModelT:
    try:
        payload = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(f"Required publication artifact is unreadable: {path}") from exc
    return model.model_validate_json(payload)


def _read_frontmatter(path: Path) -> _GitPrompt:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise RuntimeError(f"Published Prompt source is unreadable: {path}") from exc
    if not lines or lines[0].strip() != "---":
        raise RuntimeError(f"Published Prompt has no JSON frontmatter: {path}")
    try:
        closing = lines.index("---", 1)
    except ValueError as exc:
        raise RuntimeError(f"Published Prompt frontmatter is not closed: {path}") from exc
    return _GitPrompt.model_validate_json("\n".join(lines[1:closing]))


def _calculate_content_revision(repository_root: Path) -> str:
    """Mirror the compiler's byte-level revision algorithm and catch stale manifests."""

    inputs = [
        ("content/site.json", repository_root / "content/site.json"),
        ("content/surfaces.json", repository_root / "content/surfaces.json"),
        ("schemas/content.schema.json", repository_root / "schemas/content.schema.json"),
        ("schemas/site.schema.json", repository_root / "schemas/site.schema.json"),
        ("schemas/surfaces.schema.json", repository_root / "schemas/surfaces.schema.json"),
        ("schemas/taxonomy.schema.json", repository_root / "schemas/taxonomy.schema.json"),
    ]
    content_root = repository_root / "content"
    article_paths = tuple((content_root / "articles").glob("*/*.md"))
    article_taxonomy_paths = tuple(
        path
        for axis in ("article-author", "article-category", "article-tag")
        for path in (content_root / "taxonomies" / axis).glob("*/*.json")
    )
    if article_paths or article_taxonomy_paths:
        inputs.append(
            ("schemas/article.schema.json", repository_root / "schemas/article.schema.json")
        )
    inputs.extend(
        (f"content/{path.relative_to(content_root).as_posix()}", path)
        for path in (content_root / "prompts").glob("*/*.md")
    )
    inputs.extend(
        (f"content/{path.relative_to(content_root).as_posix()}", path) for path in article_paths
    )
    inputs.extend(
        (f"content/{path.relative_to(content_root).as_posix()}", path)
        for path in (content_root / "taxonomies").glob("*/*/*.json")
    )
    digest = hashlib.sha256()
    for logical_path, path in sorted(inputs, key=lambda item: item[0].encode("utf-8")):
        try:
            payload = path.read_bytes()
        except OSError as exc:
            raise RuntimeError(f"Content revision input is unreadable: {path}") from exc
        digest.update(logical_path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(payload)
        digest.update(b"\0")
    return f"sha256:{digest.hexdigest()}"


def _locale_name(locale: str) -> str:
    return {"en": "English", "zh-CN": "简体中文"}.get(locale, locale)


def _term_id(axis: TaxonomyAxis, slug: str) -> str:
    prefix = {
        TaxonomyAxis.MODEL: "mdl",
        TaxonomyAxis.CONTENT_TYPE: "cty",
        TaxonomyAxis.USE_CASE: "usc",
        TaxonomyAxis.TECHNIQUE: "tec",
        TaxonomyAxis.STYLE: "sty",
        TaxonomyAxis.SUBJECT: "sub",
    }[axis]
    return f"{prefix}_{slug.replace('-', '_')}"


def _term_href(locale: str, axis: TaxonomyAxis, slug: str) -> str:
    if axis == TaxonomyAxis.MODEL:
        return f"/{locale}/prompts/models/{slug}"
    if axis == TaxonomyAxis.CONTENT_TYPE:
        return f"/{locale}/prompts/{slug}"
    segment = {
        TaxonomyAxis.USE_CASE: "use-cases",
        TaxonomyAxis.TECHNIQUE: "techniques",
        TaxonomyAxis.STYLE: "styles",
        TaxonomyAxis.SUBJECT: "subjects",
    }[axis]
    return f"/{locale}/prompts/{segment}/{slug}"


def _term(locale: str, axis: TaxonomyAxis, slug: str) -> LocalizedRef:
    return LocalizedRef(
        id=_term_id(axis, slug),
        slug=slug,
        name=slug,
        href=_term_href(locale, axis, slug),
    )


def _media(value: _GitMedia) -> Media:
    return Media(
        asset_id=value.asset_id,
        media_type=MediaType(value.media_type),
        url=value.url,
        width=value.width,
        height=value.height,
        alt=value.alt,
        poster_url=value.poster_url,
    )


def _creator(locale: str, value: _GitCreator | None) -> LocalizedRef | None:
    if value is None:
        return None
    return LocalizedRef(
        id=value.id,
        slug=value.slug,
        name=value.name,
        href=f"/{locale}/prompts/creators/{value.slug}",
    )


def _published_variants(
    prompt: _GitPrompt,
    documents: tuple[_GitPrompt, ...],
) -> tuple[LocaleVariantRef, ...]:
    return tuple(
        LocaleVariantRef(
            locale=item.locale,
            slug=item.slug,
            href=f"/{item.locale}/prompts/{item.slug}",
        )
        for item in sorted(documents, key=lambda value: value.locale)
        if item.id == prompt.id
    )


def _prompt_record(
    prompt: _GitPrompt,
    documents: tuple[_GitPrompt, ...],
    canonical_origin: str,
) -> PromptRecord:
    variants = _published_variants(prompt, documents)
    hreflang = tuple((item.locale, f"{canonical_origin}{item.href}") for item in variants)
    return PromptRecord(
        id=prompt.id,
        locale=prompt.locale,
        slug=prompt.slug,
        title=prompt.title,
        summary=prompt.summary,
        content_type=ContentType(prompt.content_type),
        prompt_text=prompt.prompt.text,
        prompt_language=prompt.prompt.language,
        outcome_type=prompt.outcome.output_type,
        purpose=prompt.outcome.purpose,
        platforms=prompt.outcome.platforms,
        characteristics=prompt.outcome.characteristics,
        variables=tuple(
            PromptVariable(
                key=item.key,
                label=item.label,
                required=item.required,
                default_value=item.default_value,
                options=item.options,
            )
            for item in prompt.prompt.variables
        ),
        required_inputs=prompt.inputs.required,
        optional_inputs=prompt.inputs.optional,
        parameters=tuple(
            PromptParameter(
                key=item.key,
                label=item.label,
                parameter_type=ParameterType(item.parameter_type),
                required=item.required,
                options=item.options,
            )
            for item in prompt.parameters
        ),
        examples=tuple(
            PromptExample(
                id=item.id,
                input_text=item.input_text,
                output=_media(item.output),
                caption=item.caption,
            )
            for item in prompt.examples
        ),
        workflow=tuple(
            WorkflowStep(position=item.position, title=item.title, body=item.body)
            for item in prompt.workflow
        ),
        models=tuple(_term(prompt.locale, TaxonomyAxis.MODEL, item) for item in prompt.models),
        use_cases=tuple(
            _term(prompt.locale, TaxonomyAxis.USE_CASE, item) for item in prompt.use_cases
        ),
        techniques=tuple(
            _term(prompt.locale, TaxonomyAxis.TECHNIQUE, item) for item in prompt.techniques
        ),
        styles=tuple(_term(prompt.locale, TaxonomyAxis.STYLE, item) for item in prompt.styles),
        subjects=tuple(
            _term(prompt.locale, TaxonomyAxis.SUBJECT, item) for item in prompt.subjects
        ),
        creator=_creator(prompt.locale, prompt.creator),
        media=tuple(_media(item) for item in prompt.media),
        source=SourceSummary(
            platform=SourcePlatform(prompt.source.platform),
            source_id=prompt.source.source_id,
            url=prompt.source.url,
            author_handle=prompt.source.author_handle,
            observed_at=prompt.source.observed_at,
        ),
        metrics=Metrics(
            likes=prompt.metrics.likes,
            bookmarks=prompt.metrics.bookmarks,
            comments=prompt.metrics.comments,
            reposts=prompt.metrics.reposts,
            views=prompt.metrics.views,
            observed_at=prompt.metrics.observed_at,
        ),
        evidence=tuple(
            Evidence(
                evidence_type=item.evidence_type,
                url=item.url,
                confidence=item.confidence,
            )
            for item in prompt.evidence
        ),
        locale_variants=variants,
        related_prompt_ids=prompt.related_prompt_ids,
        can_copy=prompt.actions.can_copy,
        try_url=prompt.actions.try_url,
        published_at=prompt.publication.published_at,
        updated_at=prompt.publication.updated_at,
        seo=SeoMetadata(
            title=prompt.seo.title,
            description=prompt.seo.description,
            canonical_url=prompt.seo.canonical,
            hreflang=hreflang,
            robots=prompt.seo.robots,
        ),
        revision=prompt.publication.source_revision,
        featured=False,
    )


def _projection_seo(
    *,
    canonical_origin: str,
    locale: str,
    axis: TaxonomyAxis,
    slug: str,
) -> SeoMetadata:
    href = _term_href(locale, axis, slug)
    return SeoMetadata(
        title=f"{slug} Prompt projection",
        description=(
            "Derived from published Prompt metadata; standalone editorial content is absent."
        ),
        canonical_url=f"{canonical_origin}{href}",
        hreflang=((locale, f"{canonical_origin}{href}"),),
        robots="noindex,nofollow",
    )


def _taxonomy_variants(
    item: _TaxonomyItem,
    taxonomies: tuple[_TaxonomyItem, ...],
) -> tuple[LocaleVariantRef, ...]:
    return tuple(
        LocaleVariantRef(locale=value.locale, slug=value.slug, href=value.href)
        for value in sorted(taxonomies, key=lambda value: value.locale)
        if value.id == item.id
    )


def _taxonomy_seo(
    item: _TaxonomyItem,
    taxonomies: tuple[_TaxonomyItem, ...],
) -> SeoMetadata:
    hreflang = tuple(
        (value.locale, value.seo.canonical)
        for value in sorted(taxonomies, key=lambda value: value.locale)
        if value.id == item.id
    )
    return SeoMetadata(
        title=item.seo.title,
        description=item.seo.description,
        canonical_url=item.seo.canonical,
        hreflang=hreflang,
        robots=item.seo.robots,
    )


def _derived_models(
    prompts: tuple[PromptRecord, ...], canonical_origin: str
) -> tuple[ModelRecord, ...]:
    grouped: dict[tuple[str, str], list[PromptRecord]] = defaultdict(list)
    for prompt in prompts:
        for model in prompt.models:
            grouped[(prompt.locale, model.slug)].append(prompt)
    records: list[ModelRecord] = []
    for (locale, slug), members in sorted(grouped.items()):
        records.append(
            ModelRecord(
                id=_term_id(TaxonomyAxis.MODEL, slug),
                locale=locale,
                slug=slug,
                name=slug,
                description=(
                    f"Derived from {len(members)} published Prompt record(s); "
                    "standalone model editorial metadata is not published."
                ),
                locale_variants=(
                    LocaleVariantRef(
                        locale=locale, slug=slug, href=_term_href(locale, TaxonomyAxis.MODEL, slug)
                    ),
                ),
                seo=_projection_seo(
                    canonical_origin=canonical_origin,
                    locale=locale,
                    axis=TaxonomyAxis.MODEL,
                    slug=slug,
                ),
                official_url=None,
                updated_at=max(item.updated_at for item in members),
                capabilities=(),
                inputs=(),
                outputs=(),
                limitations=(),
            )
        )
    return tuple(records)


def _models(
    prompts: tuple[PromptRecord, ...],
    taxonomies: tuple[_TaxonomyItem, ...],
    canonical_origin: str,
) -> tuple[ModelRecord, ...]:
    records: dict[tuple[str, str], ModelRecord] = {}
    for item in taxonomies:
        if item.axis != TaxonomyAxis.MODEL.value:
            continue
        if item.model is None:
            raise RuntimeError(f"Model taxonomy has no model metadata: {item.id}/{item.locale}")
        records[(item.locale, item.slug)] = ModelRecord(
            id=item.id,
            locale=item.locale,
            slug=item.slug,
            name=item.name,
            description=item.description,
            locale_variants=_taxonomy_variants(item, taxonomies),
            seo=_taxonomy_seo(item, taxonomies),
            official_url=item.model.official_url,
            updated_at=item.updated_at,
            capabilities=item.model.capabilities,
            inputs=item.model.inputs,
            outputs=item.model.outputs,
            limitations=item.model.limitations,
        )
    for model_record in _derived_models(prompts, canonical_origin):
        records.setdefault((model_record.locale, model_record.slug), model_record)
    return tuple(records[key] for key in sorted(records))


def _derived_categories(
    prompts: tuple[PromptRecord, ...], canonical_origin: str
) -> tuple[CategoryRecord, ...]:
    grouped: dict[tuple[str, TaxonomyAxis, str], list[PromptRecord]] = defaultdict(list)
    for prompt in prompts:
        grouped[(prompt.locale, TaxonomyAxis.CONTENT_TYPE, prompt.content_type.value)].append(
            prompt
        )
        for axis, values in (
            (TaxonomyAxis.USE_CASE, prompt.use_cases),
            (TaxonomyAxis.TECHNIQUE, prompt.techniques),
            (TaxonomyAxis.STYLE, prompt.styles),
            (TaxonomyAxis.SUBJECT, prompt.subjects),
        ):
            for value in values:
                grouped[(prompt.locale, axis, value.slug)].append(prompt)
    records: list[CategoryRecord] = []
    for (locale, axis, slug), members in sorted(
        grouped.items(), key=lambda item: (item[0][0], item[0][1].value, item[0][2])
    ):
        records.append(
            CategoryRecord(
                id=_term_id(axis, slug),
                locale=locale,
                axis=axis,
                slug=slug,
                name=slug,
                description=(
                    f"Derived from {len(members)} published Prompt record(s); "
                    "standalone taxonomy editorial metadata is not published."
                ),
                locale_variants=(
                    LocaleVariantRef(locale=locale, slug=slug, href=_term_href(locale, axis, slug)),
                ),
                seo=_projection_seo(
                    canonical_origin=canonical_origin,
                    locale=locale,
                    axis=axis,
                    slug=slug,
                ),
                updated_at=max(item.updated_at for item in members),
            )
        )
    return tuple(records)


def _categories(
    prompts: tuple[PromptRecord, ...],
    taxonomies: tuple[_TaxonomyItem, ...],
    canonical_origin: str,
) -> tuple[CategoryRecord, ...]:
    records = {
        (item.locale, TaxonomyAxis(item.axis), item.slug): CategoryRecord(
            id=item.id,
            locale=item.locale,
            axis=TaxonomyAxis(item.axis),
            slug=item.slug,
            name=item.name,
            description=item.description,
            locale_variants=_taxonomy_variants(item, taxonomies),
            seo=_taxonomy_seo(item, taxonomies),
            updated_at=item.updated_at,
        )
        for item in taxonomies
        if item.axis != TaxonomyAxis.MODEL.value
    }
    for category_record in _derived_categories(prompts, canonical_origin):
        records.setdefault(
            (category_record.locale, category_record.axis, category_record.slug), category_record
        )
    keys = sorted(records, key=lambda value: (value[0], value[1].value, value[2]))
    return tuple(records[key] for key in keys)


def _taxonomy_members(
    item: _TaxonomyItem,
    documents: tuple[_GitPrompt, ...],
) -> tuple[str, ...]:
    members: list[str] = []
    for document in documents:
        if document.locale != item.locale:
            continue
        if (
            item.selector.field == "contentType" and document.content_type == item.selector.value
        ) or (item.selector.field == "models" and item.selector.value in document.models):
            members.append(document.id)
    return tuple(sorted(members))


def _verify_build_artifact(
    generated_root: Path,
    build: _BuildManifest,
    logical_path: str,
) -> None:
    entries = tuple(item for item in build.files if item.path == logical_path)
    if len(entries) != 1:
        raise RuntimeError(f"Build manifest does not uniquely list {logical_path}")
    path = generated_root / logical_path
    try:
        payload = path.read_bytes()
    except OSError as exc:
        raise RuntimeError(f"Generated build artifact is unreadable: {path}") from exc
    entry = entries[0]
    calculated = f"sha256:{hashlib.sha256(payload).hexdigest()}"
    if entry.bytes != len(payload) or entry.sha256 != calculated:
        raise RuntimeError(f"Generated build artifact integrity drift: {logical_path}")


def _load_taxonomies(
    *,
    generated_root: Path,
    build: _BuildManifest,
    routes: _RouteManifest,
    documents: tuple[_GitPrompt, ...],
    canonical_origin: str,
) -> tuple[_TaxonomyItem, ...]:
    items: list[_TaxonomyItem] = []
    expected_files = {f"{locale}/taxonomies/index.json" for locale in build.published_locales}
    listed_files = tuple(
        item.path for item in build.files if item.path.endswith("/taxonomies/index.json")
    )
    if set(listed_files) != expected_files or len(listed_files) != len(expected_files):
        raise RuntimeError("Build manifest taxonomy indexes do not match published locales")

    for locale in build.published_locales:
        index = _read_model(generated_root / locale / "taxonomies/index.json", _TaxonomyIndex)
        if index.content_revision != build.content_revision:
            raise RuntimeError(f"Taxonomy index revision drift: {locale}")
        if index.locale != locale:
            raise RuntimeError(f"Taxonomy index locale drift: {locale}")
        if index.total != len(index.items):
            raise RuntimeError(f"Taxonomy index total drift: {locale}")
        if any(item.locale != locale for item in index.items):
            raise RuntimeError(f"Taxonomy item locale drift: {locale}")
        items.extend(index.items)

    taxonomies = tuple(items)
    identities = [(item.id, item.locale) for item in taxonomies]
    slugs = [(item.axis, item.locale, item.slug) for item in taxonomies]
    hrefs = [item.href for item in taxonomies]
    if (
        len(set(identities)) != len(identities)
        or len(set(slugs)) != len(slugs)
        or len(set(hrefs)) != len(hrefs)
    ):
        raise RuntimeError("Taxonomy index contains duplicate identities")

    taxonomy_routes = tuple(
        route for route in routes.routes if route.kind in {"content-type-gallery", "model-detail"}
    )
    if len(taxonomy_routes) != len(taxonomies):
        raise RuntimeError("Taxonomy routes and indexes contain different record counts")

    for item in taxonomies:
        try:
            axis = TaxonomyAxis(item.axis)
        except ValueError as exc:
            raise RuntimeError(f"Unsupported generated taxonomy axis: {item.axis}") from exc
        expected_selector = "models" if axis == TaxonomyAxis.MODEL else "contentType"
        expected_kind = "model-detail" if axis == TaxonomyAxis.MODEL else "content-type-gallery"
        expected_prefix = "mdl_" if axis == TaxonomyAxis.MODEL else "cty_"
        expected_path = _term_href(item.locale, axis, item.slug)
        matching_routes = tuple(
            route
            for route in taxonomy_routes
            if route.artifact_id == item.id and route.locale == item.locale
        )
        if (
            item.locale not in build.published_locales
            or not item.id.startswith(expected_prefix)
            or item.selector.field != expected_selector
            or item.selector.value != item.slug
            or item.href != expected_path
            or item.seo.canonical != f"{canonical_origin}{expected_path}"
            or item.seo.robots != "noindex,nofollow"
            or len(matching_routes) != 1
            or matching_routes[0].kind != expected_kind
            or matching_routes[0].path != item.href
            or (axis == TaxonomyAxis.MODEL) != (item.model is not None)
        ):
            raise RuntimeError(f"Taxonomy route drift: {item.id}/{item.locale}")
        expected_members = _taxonomy_members(item, documents)
        if item.member_count != len(item.member_ids) or item.member_ids != expected_members:
            raise RuntimeError(f"Taxonomy membership drift: {item.id}/{item.locale}")
    for logical_path in sorted(expected_files):
        _verify_build_artifact(generated_root, build, logical_path)
    return taxonomies


def load_git_snapshot(repository_root: Path) -> CatalogSnapshot:
    """Build one immutable snapshot from already-validated Git artifacts."""

    site = _read_model(repository_root / "content/site.json", _SiteConfig)
    generated_root = repository_root / "infra/generated/static"
    routes = _read_model(generated_root / "route-manifest.json", _RouteManifest)
    build = _read_model(generated_root / "build-manifest.json", _BuildManifest)
    if not routes.content_revision.startswith("sha256:"):
        raise RuntimeError("Route manifest contentRevision is not a canonical digest")
    if routes.content_revision != build.content_revision:
        raise RuntimeError("Route and build manifests use different content revisions")
    calculated_revision = _calculate_content_revision(repository_root)
    if routes.content_revision != calculated_revision:
        raise RuntimeError("Generated manifests are stale for the current Git content")
    if routes.published_locales != site.published_locales:
        raise RuntimeError("Site and route manifests disagree on published locales")
    if build.supported_locales != site.locales or build.published_locales != site.published_locales:
        raise RuntimeError("Site and build manifests disagree on locale state")

    documents: list[_GitPrompt] = []
    for route in routes.routes:
        if route.kind != "prompt-detail":
            continue
        if route.artifact_id is None:
            raise RuntimeError("Published Prompt route is missing artifactId")
        path = repository_root / "content/prompts" / route.artifact_id / f"{route.locale}.md"
        document = _read_frontmatter(path)
        expected_path = f"/{document.locale}/prompts/{document.slug}"
        if document.id != route.artifact_id or document.locale != route.locale:
            raise RuntimeError(f"Prompt route identity drift: {route.path}")
        if route.path != expected_path:
            raise RuntimeError(f"Prompt route slug drift: {route.path}")
        if (
            document.locale not in site.published_locales
            or document.status != "published"
            or not document.indexable
            or document.translation.status != "ready"
        ):
            raise RuntimeError(f"Route exposes a non-publishable Prompt: {route.path}")
        documents.append(document)

    published_documents = tuple(documents)
    counts = {locale: 0 for locale in site.published_locales}
    for document in published_documents:
        counts[document.locale] += 1
    if counts != build.counts:
        raise RuntimeError("Build counts do not match published Prompt routes")

    taxonomies = _load_taxonomies(
        generated_root=generated_root,
        build=build,
        routes=routes,
        documents=published_documents,
        canonical_origin=site.canonical_origin,
    )

    prompts = tuple(
        _prompt_record(
            item,
            published_documents,
            site.canonical_origin,
        )
        for item in published_documents
    )
    record_timestamps = tuple(item.updated_at for item in prompts) + tuple(
        item.updated_at for item in taxonomies
    )
    return CatalogSnapshot(
        content_revision=routes.content_revision,
        index_version=INDEX_VERSION,
        ranking_version=RANKING_VERSION,
        generated_at=max(record_timestamps, default=_EMPTY_CATALOG_GENERATED_AT),
        locales=tuple(
            LocaleInfo(
                locale=locale,
                display_name=_locale_name(locale),
                is_default=locale == site.default_locale,
                enabled=locale in site.published_locales,
            )
            for locale in site.locales
        ),
        prompts=prompts,
        models=_models(prompts, taxonomies, site.canonical_origin),
        categories=_categories(prompts, taxonomies, site.canonical_origin),
    )


class GitCatalogRepository:
    """Catalog port backed by the repository's verified, generated snapshot."""

    def __init__(self, repository_root: Path | None = None) -> None:
        self._snapshot = load_git_snapshot(repository_root or DEFAULT_REPOSITORY_ROOT)

    def snapshot(self) -> CatalogSnapshot:
        return self._snapshot
