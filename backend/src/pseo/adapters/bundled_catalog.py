"""Read a deterministic, publication-only catalog bundled with an edge Worker."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Literal, cast

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError

from pseo.domain.models import CatalogSnapshot

_DIGEST_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")
_GIT_SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")
_SNAPSHOT_ADAPTER = TypeAdapter(CatalogSnapshot)


class _CatalogBundle(BaseModel):
    """Versioned envelope around one immutable public catalog snapshot."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    schema_version: Literal[2] = Field(alias="schemaVersion")
    source: Literal["verified-git-publication"]
    source_git_sha: str = Field(alias="sourceGitSha")
    content_revision: str = Field(alias="contentRevision")
    payload_sha256: str = Field(alias="payloadSha256")
    snapshot: CatalogSnapshot


def _snapshot_payload(snapshot: CatalogSnapshot) -> dict[str, object]:
    return cast(
        dict[str, object],
        _SNAPSHOT_ADAPTER.dump_python(snapshot, mode="json"),
    )


def _canonical_payload_bytes(snapshot: CatalogSnapshot, source_git_sha: str) -> bytes:
    return json.dumps(
        {
            "contentRevision": snapshot.content_revision,
            "snapshot": _snapshot_payload(snapshot),
            "source": "verified-git-publication",
            "sourceGitSha": source_git_sha,
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def _payload_digest(snapshot: CatalogSnapshot, source_git_sha: str) -> str:
    payload = _canonical_payload_bytes(snapshot, source_git_sha)
    return f"sha256:{hashlib.sha256(payload).hexdigest()}"


def _validate_source_git_sha(source_git_sha: str) -> None:
    if _GIT_SHA_PATTERN.fullmatch(source_git_sha) is None:
        raise RuntimeError("Bundled catalog source Git SHA is not canonical")


def _validate_public_snapshot(snapshot: CatalogSnapshot) -> None:
    """Reject malformed or draft-like data before it reaches the public API."""

    if _DIGEST_PATTERN.fullmatch(snapshot.content_revision) is None:
        raise RuntimeError("Bundled catalog has a non-canonical content revision")

    locale_codes = tuple(item.locale for item in snapshot.locales)
    if len(set(locale_codes)) != len(locale_codes):
        raise RuntimeError("Bundled catalog contains duplicate locale definitions")
    enabled_locales = {item.locale for item in snapshot.locales if item.enabled}
    if not enabled_locales:
        raise RuntimeError("Bundled catalog has no enabled public locale")

    prompt_identities = tuple((item.id, item.locale) for item in snapshot.prompts)
    prompt_routes = tuple((item.locale, item.slug) for item in snapshot.prompts)
    if len(set(prompt_identities)) != len(prompt_identities):
        raise RuntimeError("Bundled catalog contains duplicate Prompt identities")
    if len(set(prompt_routes)) != len(prompt_routes):
        raise RuntimeError("Bundled catalog contains duplicate Prompt routes")
    if any(item.locale not in enabled_locales for item in snapshot.prompts):
        raise RuntimeError("Bundled catalog exposes a Prompt in a disabled locale")
    if any(item.seo.robots != "index,follow" for item in snapshot.prompts):
        raise RuntimeError("Bundled catalog exposes a non-indexable Prompt")

    projection_identities = tuple(
        ("model", item.id, item.locale) for item in snapshot.models
    ) + tuple(("category", item.id, item.locale) for item in snapshot.categories)
    if len(set(projection_identities)) != len(projection_identities):
        raise RuntimeError("Bundled catalog contains duplicate projection identities")
    if any(item.locale not in enabled_locales for item in snapshot.models) or any(
        item.locale not in enabled_locales for item in snapshot.categories
    ):
        raise RuntimeError("Bundled catalog exposes a projection in a disabled locale")


def render_catalog_bundle(snapshot: CatalogSnapshot, *, source_git_sha: str) -> bytes:
    """Render a deterministic, self-verifying Worker catalog artifact."""

    _validate_source_git_sha(source_git_sha)
    _validate_public_snapshot(snapshot)
    payload = {
        "schemaVersion": 2,
        "source": "verified-git-publication",
        "sourceGitSha": source_git_sha,
        "contentRevision": snapshot.content_revision,
        "payloadSha256": _payload_digest(snapshot, source_git_sha),
        "snapshot": _snapshot_payload(snapshot),
    }
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode(
        "utf-8"
    )


def load_catalog_bundle(path: Path) -> CatalogSnapshot:
    """Load and verify a bundled snapshot without external I/O."""

    try:
        payload = path.read_bytes()
    except OSError as exc:
        raise RuntimeError("Bundled catalog artifact is unavailable") from exc
    try:
        bundle = _CatalogBundle.model_validate_json(payload)
    except ValidationError as exc:
        raise RuntimeError("Bundled catalog artifact does not match schema v2") from exc

    snapshot = bundle.snapshot
    _validate_source_git_sha(bundle.source_git_sha)
    _validate_public_snapshot(snapshot)
    if bundle.content_revision != snapshot.content_revision:
        raise RuntimeError("Bundled catalog content revision does not match its snapshot")
    if _DIGEST_PATTERN.fullmatch(bundle.payload_sha256) is None:
        raise RuntimeError("Bundled catalog payload digest is not canonical")
    if bundle.payload_sha256 != _payload_digest(snapshot, bundle.source_git_sha):
        raise RuntimeError("Bundled catalog payload digest does not match its payload")
    return snapshot


class BundledCatalogRepository:
    """Catalog port backed by a deployment-time, publication-only JSON artifact."""

    def __init__(self, path: Path) -> None:
        self._snapshot = load_catalog_bundle(path)

    def snapshot(self) -> CatalogSnapshot:
        return self._snapshot
