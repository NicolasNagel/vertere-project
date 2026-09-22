from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class GerarFechamentoRequest(BaseModel):
    ano: int
    mes: int


class ConfirmarPagamentoRequest(BaseModel):
    data_pagamento: datetime | None = None


class FechamentoResponse(BaseModel):
    id: str
    clinica_id: str
    ano: int
    mes: int
    valor_total: Decimal
    quantidade_atendimentos: int
    data_fechamento: datetime
    pago: bool
    data_pagamento: datetime | None
    status: str


class FaturamentoClinicaResponse(BaseModel):
    clinica_id: str
    ano: int
    mes: int
    valor_total: Decimal


class ResumoFinanceiroItemResponse(BaseModel):
    clinica_id: str
    valor_total: Decimal
