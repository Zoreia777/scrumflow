"""Endpoints de histórias de usuário de um projeto (US-02): criar e listar."""

import uuid
from collections.abc import Sequence
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models import Story
from app.schemas.errors import ErrorResponse
from app.schemas.story import StoryCreate, StoryRead
from app.services import stories as story_service

router = APIRouter(prefix="/projects/{project_id}/stories", tags=["histórias"])

SessionDep = Annotated[Session, Depends(get_session)]

_VALIDATION_ERROR: dict[int | str, dict[str, Any]] = {
    422: {"model": ErrorResponse, "description": "Dados inválidos."}
}
_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"model": ErrorResponse, "description": "Projeto não encontrado."}
}


@router.post(
    "",
    response_model=StoryRead,
    status_code=201,
    summary="Criar história de usuário no projeto",
    responses={**_NOT_FOUND, **_VALIDATION_ERROR},
)
def create_story(project_id: uuid.UUID, data: StoryCreate, session: SessionDep) -> Story:
    return story_service.create_story(session, project_id, data)


@router.get(
    "",
    response_model=list[StoryRead],
    summary="Listar histórias do projeto (backlog)",
    responses={**_NOT_FOUND, **_VALIDATION_ERROR},
)
def list_stories(project_id: uuid.UUID, session: SessionDep) -> Sequence[Story]:
    return story_service.list_stories(session, project_id)
