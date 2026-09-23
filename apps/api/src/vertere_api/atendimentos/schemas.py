from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ItemExameRequest(BaseModel):
    exame_id: str
    quantidade: int = Field(ge=1)


class ItemExameResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    exame_id: str
    preco_unitario: Decimal
    quantidade: int


class AtendimentoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    clinica_id: str
    veterinario_id: str
    paciente_id: str
    itens_exame: list[ItemExameResponse]
    metodo_coleta: str
    data_hora: datetime
    regra_plantao_id: str | None
    valor_adicional_plantao: Decimal
    desconto: Decimal
    valor_total: Decimal
    status: str


class CriarAtendimentoRequest(BaseModel):
    clinica_id: str
    veterinario_id: str
    paciente_id: str
    itens_exame: list[ItemExameRequest]
    metodo_coleta: str
    data_hora: datetime
    desconto: Decimal = Decimal("0")
    valor_adicional_plantao: Decimal | None = None


class EditarAtendimentoRequest(BaseModel):
    clinica_id: str
    veterinario_id: str
    paciente_id: str
    itens_exame: list[ItemExameRequest]
    metodo_coleta: str
    data_hora: datetime
    desconto: Decimal = Decimal("0")
    valor_adicional_plantao: Decimal | None = None
