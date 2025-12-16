from contextlib import contextmanager
from typing import Iterator

from sqlmodel import Session, SQLModel, create_engine


def get_engine(db_url: str | None = None):
    url = db_url or "sqlite:///./inventory.db"
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, echo=False)


engine = get_engine()


def init_db():
    SQLModel.metadata.create_all(engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


def get_session() -> Iterator[Session]:
    with session_scope() as session:
        yield session

