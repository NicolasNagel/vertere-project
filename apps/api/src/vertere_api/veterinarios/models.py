import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from vertere_api.db import Base


class VeterinarioModel(Base):
    __tablename__ = "veterinarios"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    nome: Mapped[str] = mapped_column(String(255))
    crmv: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    telefone: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(255))
    clinica_id: Mapped[str] = mapped_column(String(36), ForeignKey("clinicas.id"))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
