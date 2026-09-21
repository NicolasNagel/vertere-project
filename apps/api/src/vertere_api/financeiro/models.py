import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from vertere_api.db import Base


class FechamentoModel(Base):
    __tablename__ = "fechamentos"
    __table_args__ = (UniqueConstraint("clinica_id", "ano", "mes", name="uq_fechamento_clinica_periodo"),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    clinica_id: Mapped[str] = mapped_column(String(36), ForeignKey("clinicas.id"))
    ano: Mapped[int] = mapped_column(Integer)
    mes: Mapped[int] = mapped_column(Integer)
    valor_total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantidade_atendimentos: Mapped[int] = mapped_column(Integer)
    data_fechamento: Mapped[datetime] = mapped_column(DateTime)
    pago: Mapped[bool] = mapped_column(Boolean, default=False)
    data_pagamento: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
