"""Build or verify the public catalog artifact bundled into the Python Worker."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Sequence
from pathlib import Path

from pseo.adapters.bundled_catalog import render_catalog_bundle
from pseo.adapters.git_catalog import DEFAULT_REPOSITORY_ROOT, GitCatalogRepository

DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "worker_catalog.json"
TRUSTED_MAIN_REF = "refs/heads/main"
_GIT_SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")


class SourceGitAttestationError(RuntimeError):
    """The requested bundle cannot be tied to a clean, checked-out main commit."""


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build a Cloudflare Worker catalog from verified Git publication artifacts."
    )
    parser.add_argument(
        "--repository-root",
        type=Path,
        default=DEFAULT_REPOSITORY_ROOT,
        help="Checkout containing matching content, schemas, and generated static manifests.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Destination bundled next to the Worker entry module.",
    )
    parser.add_argument(
        "--source-git-sha",
        required=True,
        help="Exact 40-character commit SHA supplied by the protected main build.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail when the destination is absent or differs; never write.",
    )
    return parser


def _run_git(repository_root: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    executable = shutil.which("git")
    if executable is None:
        raise SourceGitAttestationError("Git is unavailable for source attestation")
    try:
        return subprocess.run(  # noqa: S603 - arguments are fixed by attestation calls
            (executable, "-C", str(repository_root), *arguments),
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError as exc:
        raise SourceGitAttestationError("Git is unavailable for source attestation") from exc


def _git_stdout(
    repository_root: Path,
    *arguments: str,
    failure: str,
) -> str:
    completed = _run_git(repository_root, *arguments)
    if completed.returncode != 0:
        raise SourceGitAttestationError(failure)
    return completed.stdout.strip()


def verify_source_git_attestation(repository_root: Path, source_git_sha: str) -> None:
    """Prove that source files come from a clean checkout of protected ``main``."""

    if _GIT_SHA_PATTERN.fullmatch(source_git_sha) is None:
        raise SourceGitAttestationError(
            "--source-git-sha must be a 40-character lowercase commit SHA"
        )
    if not repository_root.is_dir():
        raise SourceGitAttestationError("--repository-root must be an existing directory")

    top_level = _git_stdout(
        repository_root,
        "rev-parse",
        "--show-toplevel",
        failure="--repository-root is not a Git checkout",
    )
    if Path(top_level).resolve() != repository_root.resolve():
        raise SourceGitAttestationError("--repository-root must be the Git checkout root")

    head_sha = _git_stdout(
        repository_root,
        "rev-parse",
        "--verify",
        "HEAD^{commit}",
        failure="Repository HEAD is not a commit",
    )
    if head_sha != source_git_sha:
        raise SourceGitAttestationError("--source-git-sha does not match repository HEAD")

    checked_out_ref = _git_stdout(
        repository_root,
        "symbolic-ref",
        "--quiet",
        "HEAD",
        failure=f"Repository HEAD must be attached to {TRUSTED_MAIN_REF}",
    )
    if checked_out_ref != TRUSTED_MAIN_REF:
        raise SourceGitAttestationError(f"Repository HEAD must be attached to {TRUSTED_MAIN_REF}")
    main_sha = _git_stdout(
        repository_root,
        "rev-parse",
        "--verify",
        f"{TRUSTED_MAIN_REF}^{{commit}}",
        failure=f"Trusted ref {TRUSTED_MAIN_REF} is unavailable",
    )
    if main_sha != source_git_sha:
        raise SourceGitAttestationError(f"--source-git-sha does not match {TRUSTED_MAIN_REF}")

    source_status = _git_stdout(
        repository_root,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        "--ignored=matching",
        "--",
        "content",
        "schemas",
        failure="Git could not verify the source tree state",
    )
    if source_status:
        raise SourceGitAttestationError(
            "Content or schema inputs differ from the attested main commit"
        )


def _atomic_write(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary.write(payload)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_path = Path(temporary.name)
        os.replace(temporary_path, path)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    repository_root = args.repository_root.resolve()
    try:
        verify_source_git_attestation(repository_root, args.source_git_sha)
    except SourceGitAttestationError as exc:
        print(f"Worker catalog source attestation failed: {exc}", file=sys.stderr)
        return 2
    snapshot = GitCatalogRepository(repository_root).snapshot()
    payload = render_catalog_bundle(snapshot, source_git_sha=args.source_git_sha)
    output = args.output.resolve()

    if args.check:
        try:
            current = output.read_bytes()
        except OSError:
            print("Worker catalog is missing; run pseo-worker-bundle", file=sys.stderr)
            return 1
        if current != payload:
            print("Worker catalog is stale; run pseo-worker-bundle", file=sys.stderr)
            return 1
        print(
            f"Worker catalog is current: revision={snapshot.content_revision} "
            f"sourceGitSha={args.source_git_sha} prompts={len(snapshot.prompts)}"
        )
        return 0

    _atomic_write(output, payload)
    print(
        f"Wrote Worker catalog: revision={snapshot.content_revision} "
        f"sourceGitSha={args.source_git_sha} prompts={len(snapshot.prompts)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
