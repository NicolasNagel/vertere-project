import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vertere_api.db import Base


class AtendimentoModel(Base):
    __tablename__ = "atendimentos"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    clinica_id: Mapped[str] = mapped_column(String(36), ForeignKey("clinicas.id"))
    veterinario_id: Mapped[str] = mapped_column(String(36), ForeignKey("veterinarios.id"))
    paciente_id: Mapped[str] = mapped_column(String(36), ForeignKey("pacientes.id"))
    metodo_coleta: Mapped[str] = mapped_column(String(100))
    data_hora: Mapped[datetime] = mapped_column(DateTime)
    regra_plantao_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("regras_plantao.id"), nullable=True
    )
    valor_adicional_plantao: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    desconto: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    valor_total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(20))

    itens_exame: Mapped[list["AtendimentoItemExameModel"]] = relationship(
        back_populates="atendimento",
        cascade="all, delete-orphan",
        order_by="AtendimentoItemExameModel.ordem",
    )


class AtendimentoItemExameModel(Base):
    __tablename__ = "atendimento_itens_exame"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    atendimento_id: Mapped[str] = mapped_column(String(36), ForeignKey("atendimentos.id"))
    exame_id: Mapped[str] = mapped_column(String(36), ForeignKey("exames.id"))
    preco_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantidade: Mapped[int] = mapped_column(Integer)
    ordem: Mapped[int] = mapped_column(Integer)

    atendimento: Mapped["AtendimentoModel"] = relationship(back_populates="itens_exame")
