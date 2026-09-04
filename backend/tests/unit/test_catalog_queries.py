from __future__ import annotations

import pytest

from pseo.adapters.fixture_catalog import FixtureCatalogRepository
from pseo.application.errors import InvalidQueryError, LocaleVariantNotFoundError
from pseo.application.queries import CatalogQueries, PromptQuery, PromptSort
from pseo.domain.models import TaxonomyAxis

GOLDEN_ID = "prm_2063814043631280180"
GOLDEN_SLUG = "country-miniature-stamp-poster"


@pytest.fixture
def queries() -> CatalogQueries:
    return CatalogQueries(FixtureCatalogRepository())


def test_home_uses_published_git_counts_without_invented_rails(
    queries: CatalogQueries,
) -> None:
    home = queries.home("zh-CN")

    assert home.stats.prompt_count == 1
    assert home.stats.model_count == 2
    assert [item.slug for item in home.browse.models] == ["gpt-image-2", "nano-banana-pro"]
    assert home.featured == ()
    assert all(group.items == () for group in home.trending)


def test_supported_but_unpublished_locale_fails_closed(queries: CatalogQueries) -> None:
    with pytest.raises(LocaleVariantNotFoundError) as captured:
        queries.prompts(PromptQuery(locale="en"))

    assert captured.value.issues[0].code == "LOCALE_NOT_PUBLISHED"


def test_same_axis_is_or_and_cross_axis_is_and(queries: CatalogQueries) -> None:
    same_axis = queries.prompts(
        PromptQuery(
            locale="zh-CN",
            use_cases=("country-city-poster", "not-present"),
        )
    )
    cross_axis = queries.prompts(
        PromptQuery(
            locale="zh-CN",
            use_cases=("country-city-poster", "not-present"),
            models=("not-present",),
        )
    )

    assert [item.id for item in same_axis.items] == [GOLDEN_ID]
    assert cross_axis.items == ()


def test_search_matches_full_prompt_and_taxonomy_text(queries: CatalogQueries) -> None:
    result = queries.prompts(PromptQuery(locale="zh-CN", q="COUNTRY"))

    assert [item.id for item in result.items] == [GOLDEN_ID]


def test_cursor_rejects_malformed_payload(queries: CatalogQueries) -> None:
    with pytest.raises(InvalidQueryError, match="malformed"):
        queries.prompts(PromptQuery(locale="zh-CN", cursor="not-a-cursor"))


def test_published_detail_has_only_ready_locale_variants(queries: CatalogQueries) -> None:
    prompt = queries.prompt(GOLDEN_SLUG, "zh-CN")

    assert prompt.id == GOLDEN_ID
    assert prompt.slug == GOLDEN_SLUG
    assert [(item.locale, item.slug) for item in prompt.locale_variants] == [("zh-CN", GOLDEN_SLUG)]
    assert prompt.media == ()
    assert prompt.examples == ()
    assert prompt.metrics.likes is None


def test_facets_are_computed_from_published_result_set(queries: CatalogQueries) -> None:
    facets = queries.facets(PromptQuery(locale="zh-CN", content_types=("image",)))

    assert [(item.slug, item.count) for item in facets.models] == [("gpt-image-2", 1)]


def test_model_and_category_projections_share_prompt_query_semantics(
    queries: CatalogQueries,
) -> None:
    model = queries.model(
        "gpt-image-2",
        "zh-CN",
        cursor=None,
        limit=24,
        sort=PromptSort.VALUE,
    )
    category = queries.category(
        TaxonomyAxis.CONTENT_TYPE,
        "image",
        "zh-CN",
        cursor=None,
        limit=24,
        sort=PromptSort.VALUE,
    )

    assert [item.id for item in model.items] == [GOLDEN_ID]
    assert [item.id for item in category.items] == [GOLDEN_ID]


def test_standalone_model_projection_keeps_an_honest_empty_member_set(
    queries: CatalogQueries,
) -> None:
    model = queries.model(
        "nano-banana-pro",
        "zh-CN",
        cursor=None,
        limit=24,
        sort=PromptSort.VALUE,
    )

    assert model.entity.id == "mdl_nano_banana_pro"
    assert model.entity.name == "Nano Banana Pro"
    assert model.items == ()
    assert model.page.total == 0
