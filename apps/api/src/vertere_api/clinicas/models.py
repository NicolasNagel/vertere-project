import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from vertere_api.db import Base


class ClinicaModel(Base):
    __tablename__ = "clinicas"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    nome: Mapped[str] = mapped_column(String(255))
    cnpj: Mapped[str] = mapped_column(String(14), unique=True, index=True)
    endereco: Mapped[str] = mapped_column(String(255))
    telefone: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(255))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
