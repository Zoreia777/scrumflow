"""Endpoints de projetos (US-01): criar, listar, detalhar e editar."""

import uuid
from collections.abc import Sequence
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models import Project
from app.schemas.errors import ErrorResponse
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services import projects as project_service

router = APIRouter(prefix="/projects", tags=["projetos"])

SessionDep = Annotated[Session, Depends(get_session)]

_VALIDATION_ERROR: dict[int | str, dict[str, Any]] = {
    422: {"model": ErrorResponse, "description": "Dados inválidos."}
}
_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"model": ErrorResponse, "description": "Projeto não encontrado."}
}


@router.post(
    "",
    response_model=ProjectRead,
    status_code=201,
    summary="Criar projeto",
    responses={**_VALIDATION_ERROR},
)
def create_project(data: ProjectCreate, session: SessionDep) -> Project:
    return project_service.create_project(session, data)


@router.get("", response_model=list[ProjectRead], summary="Listar projetos")
def list_projects(session: SessionDep) -> Sequence[Project]:
    return project_service.list_projects(session)


@router.get(
    "/{project_id}",
    response_model=ProjectRead,
    summary="Detalhar projeto",
    responses={**_NOT_FOUND, **_VALIDATION_ERROR},
)
def get_project(project_id: uuid.UUID, session: SessionDep) -> Project:
    return project_service.get_project(session, project_id)


@router.patch(
    "/{project_id}",
    response_model=ProjectRead,
    summary="Editar projeto (atualização parcial)",
    responses={**_NOT_FOUND, **_VALIDATION_ERROR},
)
def update_project(project_id: uuid.UUID, data: ProjectUpdate, session: SessionDep) -> Project:
    return project_service.update_project(session, project_id, data)
