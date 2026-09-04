from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from pseo.adapters.git_catalog import (
    GitCatalogRepository,
    _calculate_content_revision,
    _GitPrompt,
    _locale_name,
    _prompt_record,
    _term_href,
    load_git_snapshot,
)
from pseo.domain.models import MediaType, TaxonomyAxis

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
GOLDEN_ID = "prm_2063814043631280180"


def _read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _frontmatter(path: Path) -> dict[str, Any]:
    lines = path.read_text(encoding="utf-8").splitlines()
    closing = lines.index("---", 1)
    value = json.loads("\n".join(lines[1:closing]))
    assert isinstance(value, dict)
    return value


def _replace_frontmatter(path: Path, value: dict[str, Any]) -> None:
    lines = path.read_text(encoding="utf-8").splitlines()
    closing = lines.index("---", 1)
    rendered = ["---", json.dumps(value, ensure_ascii=False, indent=2), *lines[closing:]]
    path.write_text("\n".join(rendered) + "\n", encoding="utf-8")


def _repository_copy(tmp_path: Path) -> Path:
    root = tmp_path / "repository"
    shutil.copytree(REPOSITORY_ROOT / "content", root / "content")
    shutil.copytree(REPOSITORY_ROOT / "schemas", root / "schemas")
    shutil.copytree(
        REPOSITORY_ROOT / "infra/generated/static",
        root / "infra/generated/static",
    )
    return root


def _set_manifest_revision(root: Path, revision: str) -> None:
    for name in ("build-manifest.json", "route-manifest.json"):
        path = root / "infra/generated/static" / name
        value = _read_json(path)
        value["contentRevision"] = revision
        _write_json(path, value)


def _compiler_content_revision(root: Path) -> str:
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node is required to compare the compiler revision")
    completed = subprocess.run(  # noqa: S603 - fixed compiler and isolated paths
        [
            node,
            str(REPOSITORY_ROOT / "infra/bin/content.mjs"),
            "validate",
            "--content",
            str(root / "content"),
            "--schemas",
            str(root / "schemas"),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stderr
    marker = " revision="
    assert marker in completed.stdout
    return completed.stdout.rsplit(marker, maxsplit=1)[1].strip()


def _compile_static(root: Path) -> None:
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node is required to regenerate the shared content fixture")
    output = root / "infra/generated/static"
    shutil.rmtree(output, ignore_errors=True)
    if output.as_posix().startswith("/private/var/"):
        # Node's os.tmpdir() reports /var/... while pytest resolves the same
        # macOS directory through /private/var/.... Keep the safety check exact.
        output = Path(output.as_posix().removeprefix("/private"))

    completed = subprocess.run(  # noqa: S603 - fixed compiler and isolated paths
        [
            node,
            str(REPOSITORY_ROOT / "infra/bin/content.mjs"),
            "build",
            "--content",
            str(root / "content"),
            "--schemas",
            str(root / "schemas"),
            "--output",
            str(output),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stderr


def _install_draft_article_tag(root: Path, *, tag_id: str, slug: str) -> None:
    source = root / "content/taxonomies/article-category/atc_case_studies/zh-CN.json"
    value = _read_json(source)
    value.update(
        {
            "id": tag_id,
            "axis": "article-tag",
            "slug": slug,
            "name": f"Tag {slug}",
        }
    )
    value["seo"]["canonical"] = f"https://ancher.space/zh-CN/blog?tag={slug}"
    destination = root / f"content/taxonomies/article-tag/{tag_id}/zh-CN.json"
    destination.parent.mkdir(parents=True)
    _write_json(destination, value)


def test_full_git_fields_map_without_provenance_graph_inference() -> None:
    path = REPOSITORY_ROOT / f"content/prompts/{GOLDEN_ID}/zh-CN.md"
    value = _frontmatter(path)
    media = {
        "assetId": "ast_example_asset",
        "type": "image",
        "url": "/assets/example.webp",
        "width": 640,
        "height": 360,
        "alt": "Published example",
        "posterUrl": None,
    }
    value["media"] = [media]
    value["metrics"] = {
        "likes": 9,
        "bookmarks": 8,
        "comments": 7,
        "reposts": 6,
        "views": 5,
        "observedAt": "2026-09-02T00:00:00Z",
    }
    value["examples"] = [
        {"id": "ex_example_item", "input": "Japan", "output": media, "caption": "Example"}
    ]
    value["creator"] = {
        "id": "ctr_example_creator",
        "slug": "example-creator",
        "name": "Example Creator",
    }
    value["relatedPromptIds"] = ["prm_related_prompt_1"]
    value["actions"] = {"canCopy": False, "tryUrl": "https://example.com/try"}
    value["evidence"][0]["confidence"] = 0.8

    prompt = _GitPrompt.model_validate(value)
    record = _prompt_record(prompt, (prompt,), "https://ancher.space")

    assert record.creator is not None
    assert record.creator.href == "/zh-CN/prompts/creators/example-creator"
    assert record.media[0].media_type == MediaType.IMAGE
    assert record.metrics.likes == 9
    assert record.examples[0].output.asset_id == "ast_example_asset"
    assert record.related_prompt_ids == ("prm_related_prompt_1",)
    assert record.can_copy is False
    assert record.try_url == "https://example.com/try"
    assert record.evidence[0].confidence == 0.8


def test_git_input_models_reject_unknown_fields() -> None:
    path = REPOSITORY_ROOT / f"content/prompts/{GOLDEN_ID}/zh-CN.md"
    value = _frontmatter(path)
    value["unexpected"] = "must fail closed"

    with pytest.raises(ValidationError, match="unexpected"):
        _GitPrompt.model_validate(value)


@pytest.mark.parametrize(
    ("axis", "expected"),
    [
        (TaxonomyAxis.MODEL, "/zh-CN/prompts/models/example"),
        (TaxonomyAxis.CONTENT_TYPE, "/zh-CN/prompts/example"),
        (TaxonomyAxis.USE_CASE, "/zh-CN/prompts/use-cases/example"),
        (TaxonomyAxis.TECHNIQUE, "/zh-CN/prompts/techniques/example"),
        (TaxonomyAxis.STYLE, "/zh-CN/prompts/styles/example"),
        (TaxonomyAxis.SUBJECT, "/zh-CN/prompts/subjects/example"),
    ],
)
def test_taxonomy_hrefs_follow_frozen_routes(axis: TaxonomyAxis, expected: str) -> None:
    assert _term_href("zh-CN", axis, "example") == expected


def test_unknown_locale_uses_its_bcp47_code_as_display_name() -> None:
    assert _locale_name("fr") == "fr"


def test_revision_matches_all_current_compiler_inputs() -> None:
    manifest = _read_json(REPOSITORY_ROOT / "infra/generated/static/build-manifest.json")

    assert _calculate_content_revision(REPOSITORY_ROOT) == manifest["contentRevision"]
    assert manifest["contentRevision"] == (
        "sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01"
    )


@pytest.mark.parametrize(
    "relative_path",
    [
        "schemas/article.schema.json",
        "content/articles/art_how_to_replace_prompt_variables/zh-CN.md",
        "content/taxonomies/article-author/ata_fixture_editor/zh-CN.json",
    ],
)
def test_article_inputs_change_content_revision(tmp_path: Path, relative_path: str) -> None:
    root = _repository_copy(tmp_path)
    before = _calculate_content_revision(root)
    path = root / relative_path

    path.write_bytes(path.read_bytes() + b"\n")

    assert _calculate_content_revision(root) != before


def test_prompt_only_revision_does_not_require_article_schema(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    shutil.rmtree(root / "content/articles")
    for axis in ("article-author", "article-category", "article-tag"):
        shutil.rmtree(root / "content/taxonomies" / axis, ignore_errors=True)
    (root / "schemas/article.schema.json").unlink()

    assert _calculate_content_revision(root).startswith("sha256:")


def test_revision_mirror_matches_compiler_binary_order_for_underscore_ids(
    tmp_path: Path,
) -> None:
    root = _repository_copy(tmp_path)
    _install_draft_article_tag(root, tag_id="att_a0000000", slug="a-zero")
    _install_draft_article_tag(root, tag_id="att_a_000000", slug="a-underscore")

    assert _calculate_content_revision(root) == _compiler_content_revision(root)


def test_repository_consumes_standalone_taxonomy_without_rewriting_prompt_relations() -> None:
    snapshot = GitCatalogRepository(REPOSITORY_ROOT).snapshot()

    nano = next(item for item in snapshot.models if item.slug == "nano-banana-pro")
    related = next(item for item in snapshot.models if item.slug == "gpt-image-2")
    image = next(
        item
        for item in snapshot.categories
        if item.axis == TaxonomyAxis.CONTENT_TYPE and item.slug == "image"
    )

    assert nano.id == "mdl_nano_banana_pro"
    assert nano.name == "Nano Banana Pro"
    assert nano.description.startswith("Nano Banana Pro 的模型页")
    assert nano.official_url is None
    assert nano.capabilities == ()
    assert related.id == "mdl_gpt_image_2"
    assert snapshot.prompts[0].models[0].slug == "gpt-image-2"
    assert image.id == "cty_image"
    assert image.name == "图片 Prompt"


def test_repository_rejects_noncanonical_manifest_revision(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    _set_manifest_revision(root, "fixture-revision")

    with pytest.raises(RuntimeError, match="canonical digest"):
        load_git_snapshot(root)


def test_repository_rejects_stale_generated_manifests(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    _set_manifest_revision(root, f"sha256:{'0' * 64}")

    with pytest.raises(RuntimeError, match="stale"):
        load_git_snapshot(root)


def test_repository_rejects_route_build_revision_drift(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    build_path = root / "infra/generated/static/build-manifest.json"
    build = _read_json(build_path)
    build["contentRevision"] = f"sha256:{'0' * 64}"
    _write_json(build_path, build)

    with pytest.raises(RuntimeError, match="different content revisions"):
        load_git_snapshot(root)


def test_repository_rejects_unpublished_route(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    prompt_path = root / f"content/prompts/{GOLDEN_ID}/zh-CN.md"
    value = _frontmatter(prompt_path)
    value["status"] = "draft"
    _replace_frontmatter(prompt_path, value)
    _set_manifest_revision(root, _calculate_content_revision(root))

    with pytest.raises(RuntimeError, match="non-publishable"):
        load_git_snapshot(root)


def test_repository_rejects_manifest_count_drift(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    build_path = root / "infra/generated/static/build-manifest.json"
    build = _read_json(build_path)
    build["counts"] = {"zh-CN": 2}
    _write_json(build_path, build)

    with pytest.raises(RuntimeError, match="Build counts"):
        load_git_snapshot(root)


def test_repository_rejects_taxonomy_index_revision_drift(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    index_path = root / "infra/generated/static/zh-CN/taxonomies/index.json"
    index = _read_json(index_path)
    index["contentRevision"] = f"sha256:{'0' * 64}"
    _write_json(index_path, index)

    with pytest.raises(RuntimeError, match="Taxonomy index revision"):
        load_git_snapshot(root)


def test_repository_rejects_taxonomy_membership_drift(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    index_path = root / "infra/generated/static/zh-CN/taxonomies/index.json"
    index = _read_json(index_path)
    items = index["items"]
    assert isinstance(items, list)
    nano = next(item for item in items if item["id"] == "mdl_nano_banana_pro")
    nano["memberCount"] = 1
    nano["memberIds"] = [GOLDEN_ID]
    _write_json(index_path, index)

    with pytest.raises(RuntimeError, match="membership drift"):
        load_git_snapshot(root)


def test_repository_rejects_taxonomy_route_drift(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    routes_path = root / "infra/generated/static/route-manifest.json"
    routes = _read_json(routes_path)
    route_items = routes["routes"]
    assert isinstance(route_items, list)
    nano = next(item for item in route_items if item.get("artifactId") == "mdl_nano_banana_pro")
    nano["path"] = "/zh-CN/prompts/models/not-nano"
    _write_json(routes_path, routes)

    with pytest.raises(RuntimeError, match="Taxonomy route drift"):
        load_git_snapshot(root)


def test_repository_rejects_taxonomy_build_artifact_integrity_drift(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    index_path = root / "infra/generated/static/zh-CN/taxonomies/index.json"
    index = _read_json(index_path)
    items = index["items"]
    assert isinstance(items, list)
    items[0]["description"] = "A tampered but structurally valid taxonomy description."
    _write_json(index_path, index)

    with pytest.raises(RuntimeError, match="artifact integrity drift"):
        load_git_snapshot(root)


def test_repository_loads_a_fresh_compiler_output(tmp_path: Path) -> None:
    root = tmp_path / "clean-checkout"
    shutil.copytree(REPOSITORY_ROOT / "content", root / "content")
    shutil.copytree(REPOSITORY_ROOT / "schemas", root / "schemas")
    _compile_static(root)

    snapshot = GitCatalogRepository(root).snapshot()
    assert snapshot.content_revision == _calculate_content_revision(root)
    assert [(item.id, item.locale) for item in snapshot.prompts] == [(GOLDEN_ID, "zh-CN")]
    assert next(item for item in snapshot.models if item.slug == "nano-banana-pro").id == (
        "mdl_nano_banana_pro"
    )


def test_repository_accepts_a_fresh_empty_public_prompt_catalog(tmp_path: Path) -> None:
    root = _repository_copy(tmp_path)
    shutil.rmtree(root / "content/prompts")
    shutil.rmtree(root / "content/taxonomies")
    shutil.rmtree(root / "content/articles")
    (root / "content/prompts").mkdir()
    (root / "content/taxonomies").mkdir()
    surfaces_path = root / "content/surfaces.json"
    surfaces = _read_json(surfaces_path)
    surface_items = surfaces["surfaces"]
    assert isinstance(surface_items, list)
    surfaces["surfaces"] = [item for item in surface_items if item["kind"] == "prompt-hub"]
    _write_json(surfaces_path, surfaces)
    revision = _calculate_content_revision(root)
    generated = root / "infra/generated/static"
    shutil.rmtree(generated)
    taxonomy_path = generated / "zh-CN/taxonomies/index.json"
    taxonomy_path.parent.mkdir(parents=True)
    _write_json(
        taxonomy_path,
        {
            "contentRevision": revision,
            "items": [],
            "locale": "zh-CN",
            "schemaVersion": 1,
            "total": 0,
        },
    )
    taxonomy_bytes = taxonomy_path.read_bytes()
    _write_json(
        generated / "route-manifest.json",
        {
            "contentRevision": revision,
            "publishedLocales": ["zh-CN"],
            "routes": [
                {
                    "kind": "prompt-hub",
                    "locale": "zh-CN",
                    "path": "/zh-CN/prompts",
                }
            ],
            "schemaVersion": 1,
        },
    )
    _write_json(
        generated / "build-manifest.json",
        {
            "contentRevision": revision,
            "counts": {"zh-CN": 0},
            "files": [
                {
                    "bytes": len(taxonomy_bytes),
                    "path": "zh-CN/taxonomies/index.json",
                    "sha256": f"sha256:{hashlib.sha256(taxonomy_bytes).hexdigest()}",
                }
            ],
            "publishedLocales": ["zh-CN"],
            "schemaVersion": 1,
            "supportedLocales": ["en", "zh-CN"],
        },
    )

    snapshot = GitCatalogRepository(root).snapshot()

    assert snapshot.prompts == ()
    assert snapshot.models == ()
    assert snapshot.categories == ()
    assert snapshot.generated_at == datetime(1970, 1, 1, tzinfo=UTC)
