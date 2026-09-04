from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
GOLDEN_ID = "prm_2063814043631280180"
GOLDEN_SLUG = "country-miniature-stamp-poster"


def _json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _golden_frontmatter() -> dict[str, Any]:
    path = REPOSITORY_ROOT / f"content/prompts/{GOLDEN_ID}/zh-CN.md"
    lines = path.read_text(encoding="utf-8").splitlines()
    closing = lines.index("---", 1)
    value = json.loads("\n".join(lines[1:closing]))
    assert isinstance(value, dict)
    return value


def _manifest_revision() -> str:
    manifest = _json(REPOSITORY_ROOT / "infra/generated/static/route-manifest.json")
    revision = manifest["contentRevision"]
    assert isinstance(revision, str)
    return revision


def test_locales_match_supported_and_published_git_state(client: TestClient) -> None:
    response = client.get("/api/v1/locales")

    assert response.status_code == 200
    payload = response.json()
    assert [(item["locale"], item["default"], item["enabled"]) for item in payload["data"]] == [
        ("en", False, False),
        ("zh-CN", True, True),
    ]
    assert payload["data"][0]["displayName"] == "English"
    assert "display_name" not in payload["data"][0]
    assert payload["meta"]["contentRevision"] == _manifest_revision()


def test_home_and_prompt_count_match_generated_index(client: TestClient) -> None:
    home = client.get("/api/v1/home", params={"locale": "zh-CN"}).json()
    prompts = client.get("/api/v1/prompts", params={"locale": "zh-CN"}).json()
    index = _json(REPOSITORY_ROOT / "infra/generated/static/zh-CN/prompts/index.json")

    assert home["data"]["stats"]["promptCount"] == prompts["page"]["total"] == index["total"]
    assert home["data"]["stats"]["modelCount"] == 2
    assert [item["slug"] for item in home["data"]["browse"]["models"]] == [
        "gpt-image-2",
        "nano-banana-pro",
    ]
    assert home["data"]["featured"] == []
    assert all(group["items"] == [] for group in home["data"]["trending"])
    assert home["meta"]["contentRevision"] == prompts["meta"]["contentRevision"]


def test_prompt_list_supports_repeated_or_filters(client: TestClient) -> None:
    response = client.get(
        "/api/v1/prompts",
        params=[
            ("locale", "zh-CN"),
            ("model", "not-present"),
            ("model", "gpt-image-2"),
            ("contentType", "image"),
        ],
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["data"]] == [GOLDEN_ID]


def test_detail_is_full_git_prompt_without_invented_optional_data(client: TestClient) -> None:
    response = client.get(
        f"/api/v1/prompts/{GOLDEN_SLUG}",
        params={"locale": "zh-CN"},
    )

    assert response.status_code == 200
    detail = response.json()["data"]
    frontmatter = _golden_frontmatter()
    assert detail["summary"]["id"] == GOLDEN_ID
    assert detail["prompt"]["text"] == frontmatter["prompt"]["text"]
    assert detail["localeVariants"] == [
        {
            "locale": "zh-CN",
            "slug": GOLDEN_SLUG,
            "href": f"/zh-CN/prompts/{GOLDEN_SLUG}",
        }
    ]
    assert detail["summary"]["media"] == []
    assert detail["examples"] == []
    assert detail["relations"]["creator"] is None
    assert all(
        detail["summary"]["metrics"][key] is None
        for key in ("likes", "bookmarks", "comments", "reposts", "views")
    )
    assert detail["evidence"][0]["confidence"] is None
    assert detail["actions"] == frontmatter["actions"]
    assert detail["summary"]["models"][0]["href"] == "/zh-CN/prompts/models/gpt-image-2"
    assert detail["summary"]["useCases"][0]["href"] == (
        "/zh-CN/prompts/use-cases/country-city-poster"
    )
    assert detail["revision"] == frontmatter["publication"]["sourceRevision"]
    assert response.headers["x-content-revision"] == _manifest_revision()


def test_facets_report_selected_values_and_current_counts(client: TestClient) -> None:
    response = client.get(
        "/api/v1/facets",
        params={"locale": "zh-CN", "contentType": "image", "model": "gpt-image-2"},
    )

    assert response.status_code == 200
    model = response.json()["data"]["models"][0]
    assert model == {
        "id": "mdl_gpt_image_2",
        "slug": "gpt-image-2",
        "label": "gpt-image-2",
        "count": 1,
        "selected": True,
    }


def test_model_and_category_projection_contracts(client: TestClient) -> None:
    model = client.get("/api/v1/models/gpt-image-2", params={"locale": "zh-CN"})
    standalone = client.get("/api/v1/models/nano-banana-pro", params={"locale": "zh-CN"})
    category = client.get(
        "/api/v1/categories/content-type/image",
        params={"locale": "zh-CN"},
    )

    assert model.status_code == standalone.status_code == category.status_code == 200
    assert model.json()["data"]["entity"]["officialUrl"] is None
    assert model.json()["data"]["entity"]["capabilities"] == []
    assert model.json()["data"]["entity"]["seo"]["canonicalUrl"].endswith(
        "/zh-CN/prompts/models/gpt-image-2"
    )
    assert model.json()["data"]["page"]["total"] == 1
    assert standalone.json()["data"]["entity"]["id"] == "mdl_nano_banana_pro"
    assert standalone.json()["data"]["entity"]["name"] == "Nano Banana Pro"
    assert standalone.json()["data"]["entity"]["description"].startswith("Nano Banana Pro 的模型页")
    assert standalone.json()["data"]["items"] == []
    assert standalone.json()["data"]["page"]["total"] == 0
    assert category.json()["data"]["entity"]["axis"] == "content-type"
    assert category.json()["data"]["entity"]["name"] == "图片 Prompt"
    assert category.json()["data"]["entity"]["seo"]["canonicalUrl"].endswith("/zh-CN/prompts/image")
    assert category.json()["data"]["page"]["total"] == 1


def test_conditional_get_uses_canonical_content_revision(client: TestClient) -> None:
    first = client.get("/api/v1/home", params={"locale": "zh-CN"})
    second = client.get(
        "/api/v1/home",
        params={"locale": "zh-CN"},
        headers={"If-None-Match": first.headers["etag"]},
    )

    assert first.status_code == 200
    assert second.status_code == 304
    assert second.content == b""
    assert second.headers["etag"] == first.headers["etag"]
    assert second.headers["x-content-revision"] == first.headers["x-content-revision"]
    assert second.headers["x-content-revision"] == _manifest_revision()


def test_conditional_get_distinguishes_search_text_from_query_parameters(
    client: TestClient,
) -> None:
    literal_search = client.get(
        "/api/v1/prompts",
        params={"locale": "zh-CN", "q": "COUNTRY&sort=newest"},
    )
    filtered_search = client.get(
        "/api/v1/prompts",
        params={"locale": "zh-CN", "q": "COUNTRY", "sort": "newest"},
        headers={"If-None-Match": literal_search.headers["etag"]},
    )

    assert literal_search.status_code == 200
    assert literal_search.json()["data"] == []
    assert filtered_search.status_code == 200
    assert [item["id"] for item in filtered_search.json()["data"]] == [GOLDEN_ID]
    assert filtered_search.headers["etag"] != literal_search.headers["etag"]

    reordered_search = client.get(
        "/api/v1/prompts",
        params=[("sort", "newest"), ("q", "COUNTRY"), ("locale", "zh-CN")],
        headers={"If-None-Match": filtered_search.headers["etag"]},
    )
    assert reordered_search.status_code == 304


def test_unknown_query_is_problem_json(client: TestClient) -> None:
    response = client.get(
        "/api/v1/prompts",
        params={"locale": "zh-CN", "unknownFilter": "value"},
    )

    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/problem+json")
    problem = response.json()
    assert problem["code"] == "INVALID_QUERY"
    assert problem["errors"][0]["code"] == "UNKNOWN_QUERY_PARAMETER"
    assert problem["traceId"] == response.headers["x-request-id"]


def test_missing_locale_is_a_400_problem(client: TestClient) -> None:
    response = client.get("/api/v1/home")

    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_QUERY"
    assert response.headers["content-type"].startswith("application/problem+json")


def test_unpublished_english_catalog_fails_closed(client: TestClient) -> None:
    response = client.get(
        f"/api/v1/prompts/{GOLDEN_SLUG}",
        params={"locale": "en"},
    )

    assert response.status_code == 404
    problem = response.json()
    assert problem["code"] == "LOCALE_VARIANT_NOT_FOUND"
    assert problem["errors"][0]["code"] == "LOCALE_NOT_PUBLISHED"


def test_healthz_exposes_generated_manifest_revision(client: TestClient) -> None:
    response = client.get("/healthz", headers={"X-Request-ID": "req_contract_test"})

    assert response.status_code == 200
    assert response.json() == {
        "service": "pseo-public-api",
        "status": "ok",
        "indexRevision": _manifest_revision(),
        "dependencies": {"catalog": "ok"},
    }
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-request-id"] == "req_contract_test"


def test_openapi_is_31_and_documents_problem_media_type(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    required_paths = {
        "/api/v1/locales",
        "/api/v1/home",
        "/api/v1/prompts",
        "/api/v1/prompts/{slug}",
        "/api/v1/facets",
        "/api/v1/models/{slug}",
        "/api/v1/categories/{axis}/{slug}",
        "/healthz",
    }

    assert schema["openapi"] == "3.1.0"
    assert required_paths <= set(schema["paths"])
    error_content = schema["paths"]["/api/v1/prompts"]["get"]["responses"]["400"]["content"]
    assert set(error_content) == {"application/problem+json"}
    assert "304" in schema["paths"]["/api/v1/prompts"]["get"]["responses"]
    assert schema["servers"] == [{"url": "http://127.0.0.1:8000", "description": "Local beta"}]
