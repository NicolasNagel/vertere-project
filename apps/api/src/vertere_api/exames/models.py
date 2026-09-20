import uuid
from datetime import time
from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from vertere_api.db import Base


class ExameModel(Base):
    __tablename__ = "exames"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    categoria: Mapped[str] = mapped_column(String(100))
    nome: Mapped[str] = mapped_column(String(255))
    preco_base: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)


class RegraPlantaoModel(Base):
    __tablename__ = "regras_plantao"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    dia_semana: Mapped[int] = mapped_column(Integer)
    hora_inicio: Mapped[time] = mapped_column(Time)
    hora_fim: Mapped[time] = mapped_column(Time)
    valor_adicional: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
