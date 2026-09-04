from __future__ import annotations

import json
from pathlib import Path

from pseo.openapi import main


def test_openapi_cli_writes_deterministic_schema(tmp_path: Path) -> None:
    output = tmp_path / "nested/openapi.json"

    assert main(["--output", str(output)]) == 0
    first = output.read_text(encoding="utf-8")
    assert main(["--output", str(output)]) == 0

    assert output.read_text(encoding="utf-8") == first
    assert json.loads(first)["openapi"] == "3.1.0"
