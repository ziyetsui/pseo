from __future__ import annotations

import asyncio
import json

from fastapi import HTTPException
from starlette.requests import Request

from pseo.api.problems import (
    catalog_error_handler,
    http_error_handler,
    unexpected_error_handler,
)
from pseo.application.errors import ContentGoneError


def _request(path: str = "/resource") -> Request:
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "scheme": "https",
            "server": ("testserver", 443),
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 1234),
        }
    )
    request.state.request_id = "req_unit_problem"
    return request


def _payload(response_body: bytes | memoryview[int]) -> dict[str, object]:
    value = json.loads(bytes(response_body))
    assert isinstance(value, dict)
    return value


def test_content_gone_maps_to_410() -> None:
    response = asyncio.run(catalog_error_handler(_request(), ContentGoneError("retired")))

    assert response.status_code == 410
    assert _payload(response.body)["code"] == "CONTENT_GONE"


def test_http_errors_have_stable_codes() -> None:
    cases = ((404, "RESOURCE_NOT_FOUND"), (405, "METHOD_NOT_ALLOWED"), (418, "HTTP_ERROR"))

    for status, code in cases:
        response = asyncio.run(http_error_handler(_request(), HTTPException(status, "detail")))
        assert response.status_code == status
        assert _payload(response.body)["code"] == code


def test_unexpected_errors_do_not_leak_exception_text() -> None:
    response = asyncio.run(unexpected_error_handler(_request(), RuntimeError("secret detail")))
    payload = _payload(response.body)

    assert response.status_code == 500
    assert payload["code"] == "INTERNAL_SERVER_ERROR"
    assert "secret" not in str(payload)
