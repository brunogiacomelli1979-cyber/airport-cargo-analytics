"""PostgreSQL central (Railway); SQLite é usado apenas em testes locais."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from sqlalchemy import Boolean, Date, DateTime, Index, Integer, String, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

ROOT = Path(__file__).resolve().parent.parent


class Base(DeclarativeBase):
    pass


class Registro(Base):
    __tablename__ = "registros"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    data: Mapped[object] = mapped_column(Date, nullable=False)
    turno: Mapped[str] = mapped_column(String(5), nullable=False)
    palete: Mapped[str] = mapped_column(String(30), nullable=False)
    cia: Mapped[str] = mapped_column(String(3), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    criado_em: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False)
    dispositivo: Mapped[str | None] = mapped_column(String(64), nullable=True)
    excluido_em: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    excluido_dispositivo: Mapped[str | None] = mapped_column(String(64), nullable=True)

    __table_args__ = (
        Index("idx_registro_unico_ativo", "data", "turno", "palete", unique=True,
              postgresql_where=text("ativo = true"), sqlite_where=text("ativo = 1")),
        Index("idx_registro_periodo", "data", "turno", "palete", "cia"),
    )


def connection_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION") == "1":
            raise RuntimeError("DATABASE_URL não definida: configure o PostgreSQL antes da publicação.")
        local_path = os.getenv("PALETES_DB_PATH", str(ROOT / "data" / "paletes.sqlite3"))
        return "sqlite:///" + str(Path(local_path).resolve())
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


@lru_cache(maxsize=12)
def _engine_for(url: str):
    args = {"pool_pre_ping": True}
    if url.startswith("sqlite://"):
        args["connect_args"] = {"check_same_thread": False, "timeout": 15}
    else:
        args["pool_size"] = 5
        args["max_overflow"] = 5
        args["pool_recycle"] = 1800
    return create_engine(url, **args)


def engine():
    return _engine_for(connection_url())


def session_factory():
    return Session(engine(), expire_on_commit=False)


def init_database() -> None:
    url = connection_url()
    if url.startswith("sqlite:///"):
        Path(url[len("sqlite:///"):]).parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine())
