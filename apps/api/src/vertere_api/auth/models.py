import uuid

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from vertere_api.auth.domain import Papel
from vertere_api.db import Base


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    papel: Mapped[Papel] = mapped_column(Enum(Papel, name="papel"))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    clinica_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
