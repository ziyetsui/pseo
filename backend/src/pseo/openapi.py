"""Deterministically export the runtime OpenAPI contract."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from pseo.main import app


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="pseo-openapi")
    parser.add_argument("--output", type=Path, default=Path("openapi/openapi.json"))
    return parser


def main(argv: list[str] | None = None) -> int:
    arguments = _parser().parse_args(argv)
    output: Path = arguments.output
    output.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    output.write_text(rendered, encoding="utf-8")
    print(output.as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
