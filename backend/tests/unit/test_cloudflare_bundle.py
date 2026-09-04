from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

import pytest

from pseo.adapters.git_catalog import _calculate_content_revision
from pseo.cloudflare_bundle import main

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


def _git(root: Path, *arguments: str) -> str:
    git = shutil.which("git")
    if git is None:
        pytest.skip("Git is required for source-attestation tests")
    completed = subprocess.run(  # noqa: S603 - fixed Git binary and isolated fixture
        (git, "-C", str(root), *arguments),
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stderr
    return completed.stdout.strip()


def _copy_repository(tmp_path: Path) -> Path:
    root = tmp_path / "repository"
    shutil.copytree(REPOSITORY_ROOT / "content", root / "content")
    shutil.copytree(REPOSITORY_ROOT / "schemas", root / "schemas")
    shutil.copytree(
        REPOSITORY_ROOT / "infra/generated/static",
        root / "infra/generated/static",
    )
    return root


def _commit_main(root: Path) -> str:
    _git(root, "init", "-b", "main")
    _git(root, "config", "user.email", "catalog-tests@example.invalid")
    _git(root, "config", "user.name", "Catalog Tests")
    _git(root, "add", "content", "schemas")
    _git(root, "commit", "-m", "trusted main fixture")
    return _git(root, "rev-parse", "HEAD")


def _build_empty_catalog(root: Path) -> None:
    shutil.rmtree(root / "content/prompts")
    shutil.rmtree(root / "content/taxonomies")
    shutil.rmtree(root / "content/articles")
    (root / "content/prompts").mkdir()
    (root / "content/taxonomies").mkdir()
    surfaces_path = root / "content/surfaces.json"
    surfaces = json.loads(surfaces_path.read_text(encoding="utf-8"))
    surfaces["surfaces"] = [item for item in surfaces["surfaces"] if item["kind"] == "prompt-hub"]
    surfaces_path.write_text(
        json.dumps(surfaces, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    revision = _calculate_content_revision(root)
    generated = root / "infra/generated/static"
    shutil.rmtree(generated)
    taxonomy_path = generated / "zh-CN/taxonomies/index.json"
    taxonomy_path.parent.mkdir(parents=True)
    taxonomy_bytes = (
        json.dumps(
            {
                "contentRevision": revision,
                "items": [],
                "locale": "zh-CN",
                "schemaVersion": 1,
                "total": 0,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    ).encode()
    taxonomy_path.write_bytes(taxonomy_bytes)
    (generated / "route-manifest.json").write_text(
        json.dumps(
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
            }
        ),
        encoding="utf-8",
    )
    (generated / "build-manifest.json").write_text(
        json.dumps(
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
            }
        ),
        encoding="utf-8",
    )


def _arguments(root: Path, output: Path, source_git_sha: str) -> list[str]:
    return [
        "--repository-root",
        str(root),
        "--output",
        str(output),
        "--source-git-sha",
        source_git_sha,
    ]


def test_bundle_cli_writes_checks_and_detects_stale_artifact(
    tmp_path: Path,
    capsys,
) -> None:
    root = _copy_repository(tmp_path)
    source_git_sha = _commit_main(root)
    output = tmp_path / "output/worker_catalog.json"
    arguments = _arguments(root, output, source_git_sha)

    assert main(arguments) == 0
    payload = json.loads(output.read_bytes())
    assert payload["sourceGitSha"] == source_git_sha
    assert "Wrote Worker catalog" in capsys.readouterr().out

    assert main([*arguments, "--check"]) == 0
    assert "Worker catalog is current" in capsys.readouterr().out

    output.write_bytes(output.read_bytes() + b"\n")
    assert main([*arguments, "--check"]) == 1
    assert "Worker catalog is stale" in capsys.readouterr().err


def test_bundle_cli_accepts_a_verified_empty_main_catalog(
    tmp_path: Path,
) -> None:
    root = _copy_repository(tmp_path)
    _build_empty_catalog(root)
    source_git_sha = _commit_main(root)
    output = tmp_path / "empty-catalog.json"

    assert main(_arguments(root, output, source_git_sha)) == 0
    payload = json.loads(output.read_bytes())
    assert payload["sourceGitSha"] == source_git_sha
    assert payload["snapshot"]["prompts"] == []
    assert payload["snapshot"]["models"] == []
    assert payload["snapshot"]["categories"] == []


def test_bundle_cli_check_fails_when_artifact_is_missing(
    tmp_path: Path,
    capsys,
) -> None:
    root = _copy_repository(tmp_path)
    source_git_sha = _commit_main(root)
    output = tmp_path / "missing.json"

    assert main([*_arguments(root, output, source_git_sha), "--check"]) == 1
    assert "Worker catalog is missing" in capsys.readouterr().err


def test_bundle_cli_requires_an_explicit_source_git_sha(tmp_path: Path) -> None:
    root = _copy_repository(tmp_path)

    with pytest.raises(SystemExit) as error:
        main(["--repository-root", str(root), "--output", str(tmp_path / "out.json")])

    assert error.value.code == 2


def test_bundle_cli_rejects_a_sha_that_does_not_match_head(
    tmp_path: Path,
    capsys,
) -> None:
    root = _copy_repository(tmp_path)
    _commit_main(root)

    assert main(_arguments(root, tmp_path / "out.json", "0" * 40)) == 2
    assert "does not match repository HEAD" in capsys.readouterr().err


def test_bundle_cli_rejects_a_feature_branch_even_at_the_main_commit(
    tmp_path: Path,
    capsys,
) -> None:
    root = _copy_repository(tmp_path)
    source_git_sha = _commit_main(root)
    _git(root, "switch", "-c", "feature/catalog")

    assert main(_arguments(root, tmp_path / "out.json", source_git_sha)) == 2
    assert "refs/heads/main" in capsys.readouterr().err


def test_bundle_cli_rejects_dirty_attested_inputs(tmp_path: Path, capsys) -> None:
    root = _copy_repository(tmp_path)
    source_git_sha = _commit_main(root)
    site = root / "content/site.json"
    site.write_bytes(site.read_bytes() + b"\n")

    assert main(_arguments(root, tmp_path / "out.json", source_git_sha)) == 2
    assert "inputs differ" in capsys.readouterr().err


def test_bundle_cli_rejects_ignored_uncommitted_content(
    tmp_path: Path,
    capsys,
) -> None:
    root = _copy_repository(tmp_path)
    _commit_main(root)
    (root / ".gitignore").write_text("content/prompts/ignored/\n", encoding="utf-8")
    _git(root, "add", ".gitignore")
    _git(root, "commit", "-m", "declare ignored content")
    source_git_sha = _git(root, "rev-parse", "HEAD")
    ignored = root / "content/prompts/ignored/en.md"
    ignored.parent.mkdir(parents=True)
    ignored.write_text("ignored but compiler-visible", encoding="utf-8")

    assert main(_arguments(root, tmp_path / "out.json", source_git_sha)) == 2
    assert "inputs differ" in capsys.readouterr().err


def test_bundle_cli_rejects_a_gitless_source_archive(
    tmp_path: Path,
    capsys,
) -> None:
    root = _copy_repository(tmp_path)

    assert main(_arguments(root, tmp_path / "out.json", "a" * 40)) == 2
    assert "not a Git checkout" in capsys.readouterr().err
