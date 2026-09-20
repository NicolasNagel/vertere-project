import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from vertere_api.db import Base


class PacienteModel(Base):
    __tablename__ = "pacientes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    nome: Mapped[str] = mapped_column(String(255))
    especie: Mapped[str] = mapped_column(String(100))
    raca: Mapped[str] = mapped_column(String(100))
    sexo: Mapped[str] = mapped_column(String(20))
    idade: Mapped[int] = mapped_column(Integer)
    proprietario: Mapped[str] = mapped_column(String(255))
    clinica_id: Mapped[str] = mapped_column(String(36), ForeignKey("clinicas.id"))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
