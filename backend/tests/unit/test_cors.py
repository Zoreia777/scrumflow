from fastapi.testclient import TestClient

from app.main import create_app

ALLOWED_ORIGIN = "http://localhost:5173"
FORBIDDEN_ORIGIN = "http://site-nao-autorizado.test"


def _preflight(origin: str) -> tuple[int, str | None]:
    client = TestClient(create_app())
    response = client.options(
        "/api/v1/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )
    return response.status_code, response.headers.get("access-control-allow-origin")


def test_allowed_origin_receives_cors_header() -> None:
    status, allow_origin = _preflight(ALLOWED_ORIGIN)

    assert status == 200
    assert allow_origin == ALLOWED_ORIGIN


def test_unlisted_origin_is_rejected() -> None:
    status, allow_origin = _preflight(FORBIDDEN_ORIGIN)

    assert status == 400
    assert allow_origin is None
