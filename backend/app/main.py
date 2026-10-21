from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
from app.api.v1.projects import router as projects_router
from app.api.v1.stories import router as stories_router
from app.core.config import get_settings
from app.core.errors import register_error_handlers


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="ScrumFlow API", version="0.1.0")

    # CORS restrito às origens explicitamente autorizadas (CORS_ORIGINS).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    register_error_handlers(app)
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(projects_router, prefix="/api/v1")
    app.include_router(stories_router, prefix="/api/v1")
    return app


app = create_app()
