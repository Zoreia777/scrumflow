"""Regras de negócio de projetos (US-01)."""

import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


def _commit(session: Session) -> None:
    try:
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        raise


def create_project(session: Session, data: ProjectCreate) -> Project:
    project = Project(name=data.name, description=data.description)
    session.add(project)
    _commit(session)
    session.refresh(project)
    return project


def list_projects(session: Session) -> Sequence[Project]:
    """Mais recentes primeiro; `id` desempata projetos criados no mesmo instante."""
    statement = select(Project).order_by(Project.created_at.desc(), Project.id.desc())
    return session.scalars(statement).all()


def get_project(session: Session, project_id: uuid.UUID) -> Project:
    project = session.get(Project, project_id)
    if project is None:
        raise NotFoundError("project")
    return project


def update_project(session: Session, project_id: uuid.UUID, data: ProjectUpdate) -> Project:
    project = get_project(session, project_id)
    for field in data.model_fields_set:
        setattr(project, field, getattr(data, field))
    _commit(session)
    session.refresh(project)
    return project
