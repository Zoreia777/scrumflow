"""Regras de negócio de histórias de usuário (US-02)."""

import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Story
from app.models.story import DEFAULT_STATUS
from app.schemas.story import StoryCreate
from app.services.projects import get_project

_FOREIGN_KEY_VIOLATION = "23503"


def create_story(session: Session, project_id: uuid.UUID, data: StoryCreate) -> Story:
    """Cria a história em uma única transação: ou grava tudo, ou nada.

    Se o projeto não existir, lança `NotFoundError` antes de qualquer gravação.
    """
    get_project(session, project_id)
    story = Story(
        project_id=project_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        acceptance_criteria=data.acceptance_criteria,
        status=DEFAULT_STATUS,
    )
    session.add(story)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        # O projeto pode ter sido removido entre a verificação e a gravação.
        if getattr(exc.orig, "sqlstate", None) == _FOREIGN_KEY_VIOLATION:
            raise NotFoundError("project") from exc
        raise
    except SQLAlchemyError:
        session.rollback()
        raise
    session.refresh(story)
    return story


def list_stories(session: Session, project_id: uuid.UUID) -> Sequence[Story]:
    """Histórias do projeto, mais recentes primeiro; `id` desempata. Só as deste projeto."""
    get_project(session, project_id)
    statement = (
        select(Story)
        .where(Story.project_id == project_id)
        .order_by(Story.created_at.desc(), Story.id.desc())
    )
    return session.scalars(statement).all()
