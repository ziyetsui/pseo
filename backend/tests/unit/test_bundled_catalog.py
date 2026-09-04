from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path

import pytest

from pseo.adapters.bundled_catalog import (
    BundledCatalogRepository,
    load_catalog_bundle,
    render_catalog_bundle,
)
from pseo.adapters.fixture_catalog import FixtureCatalogRepository

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
CHECKED_BUNDLE = REPOSITORY_ROOT / "backend/src/worker_catalog.json"
SOURCE_GIT_SHA = "a" * 40


def _snapshot():
    return FixtureCatalogRepository().snapshot()


def test_bundle_round_trip_is_deterministic_and_matches_git_snapshot(tmp_path: Path) -> None:
    snapshot = _snapshot()
    first = render_catalog_bundle(snapshot, source_git_sha=SOURCE_GIT_SHA)
    second = render_catalog_bundle(snapshot, source_git_sha=SOURCE_GIT_SHA)
    path = tmp_path / "catalog.json"
    path.write_bytes(first)

    repository = BundledCatalogRepository(path)

    assert first == second
    assert repository.snapshot() == snapshot
    assert repository.snapshot() is repository.snapshot()


def test_empty_catalog_bundle_round_trip_is_supported(tmp_path: Path) -> None:
    empty = replace(_snapshot(), prompts=(), models=(), categories=())
    path = tmp_path / "catalog.json"
    path.write_bytes(render_catalog_bundle(empty, source_git_sha=SOURCE_GIT_SHA))

    assert BundledCatalogRepository(path).snapshot() == empty


def test_checked_one_prompt_bundle_remains_blocked_without_main_attestation() -> None:
    payload = json.loads(CHECKED_BUNDLE.read_bytes())

    assert len(payload["snapshot"]["prompts"]) == 1
    assert "sourceGitSha" not in payload
    with pytest.raises(RuntimeError, match="schema v2"):
        load_catalog_bundle(CHECKED_BUNDLE)


def test_bundle_rejects_payload_tampering(tmp_path: Path) -> None:
    payload = json.loads(render_catalog_bundle(_snapshot(), source_git_sha=SOURCE_GIT_SHA))
    payload["snapshot"]["prompts"][0]["title"] = "tampered"
    path = tmp_path / "catalog.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(RuntimeError, match="digest does not match"):
        load_catalog_bundle(path)


def test_bundle_rejects_revision_drift(tmp_path: Path) -> None:
    payload = json.loads(render_catalog_bundle(_snapshot(), source_git_sha=SOURCE_GIT_SHA))
    payload["contentRevision"] = f"sha256:{'0' * 64}"
    path = tmp_path / "catalog.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(RuntimeError, match="revision does not match"):
        load_catalog_bundle(path)


def test_bundle_rejects_missing_or_tampered_source_git_attestation(
    tmp_path: Path,
) -> None:
    rendered = render_catalog_bundle(_snapshot(), source_git_sha=SOURCE_GIT_SHA)

    missing = json.loads(rendered)
    missing.pop("sourceGitSha")
    missing_path = tmp_path / "missing-attestation.json"
    missing_path.write_text(json.dumps(missing), encoding="utf-8")

    tampered = json.loads(rendered)
    tampered["sourceGitSha"] = "b" * 40
    tampered_path = tmp_path / "tampered-attestation.json"
    tampered_path.write_text(json.dumps(tampered), encoding="utf-8")

    with pytest.raises(RuntimeError, match="schema v2"):
        load_catalog_bundle(missing_path)
    with pytest.raises(RuntimeError, match="payload digest does not match"):
        load_catalog_bundle(tampered_path)


@pytest.mark.parametrize("source_git_sha", ["A" * 40, "a" * 39, "not-a-sha"])
def test_bundle_rejects_noncanonical_source_git_sha(source_git_sha: str) -> None:
    with pytest.raises(RuntimeError, match="source Git SHA is not canonical"):
        render_catalog_bundle(_snapshot(), source_git_sha=source_git_sha)


def test_bundle_rejects_non_indexable_prompt() -> None:
    snapshot = _snapshot()
    prompt = snapshot.prompts[0]
    non_indexable = replace(
        snapshot,
        prompts=(replace(prompt, seo=replace(prompt.seo, robots="noindex,nofollow")),),
    )

    with pytest.raises(RuntimeError, match="non-indexable Prompt"):
        render_catalog_bundle(non_indexable, source_git_sha=SOURCE_GIT_SHA)


def test_bundle_rejects_missing_and_invalid_artifacts(tmp_path: Path) -> None:
    missing = tmp_path / "missing.json"
    invalid = tmp_path / "invalid.json"
    invalid.write_text('{"schemaVersion": 1}', encoding="utf-8")

    with pytest.raises(RuntimeError, match="unavailable"):
        load_catalog_bundle(missing)
    with pytest.raises(RuntimeError, match="schema v2"):
        load_catalog_bundle(invalid)
