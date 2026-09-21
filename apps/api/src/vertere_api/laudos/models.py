import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from vertere_api.db import Base


class TemplateLaudoModel(Base):
    __tablename__ = "templates_laudo"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    categoria: Mapped[str] = mapped_column(String(100))
    campos: Mapped[list] = mapped_column(JSON)
    ativo: Mapped[bool] = mapped_column(default=True)


class LaudoModel(Base):
    __tablename__ = "laudos"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    atendimento_id: Mapped[str] = mapped_column(String(36), ForeignKey("atendimentos.id"))
    exame_id: Mapped[str] = mapped_column(String(36), ForeignKey("exames.id"))
    template_id: Mapped[str] = mapped_column(String(36), ForeignKey("templates_laudo.id"))
    valores: Mapped[list] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20))
    criado_por: Mapped[str] = mapped_column(String(36))
    criado_em: Mapped[datetime] = mapped_column(DateTime)
    finalizado_por: Mapped[str | None] = mapped_column(String(36), nullable=True)
    finalizado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    enviado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    erro_envio: Mapped[str | None] = mapped_column(String(500), nullable=True)
