from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import StrEnum


class StatusFechamento(StrEnum):
    PENDENTE = "pendente"
    PAGO = "pago"
    INADIMPLENTE = "inadimplente"


@dataclass(frozen=True)
class Fechamento:
    id: str
    clinica_id: str
    ano: int
    mes: int
    valor_total: Decimal
    quantidade_atendimentos: int
    data_fechamento: datetime
    pago: bool
    data_pagamento: datetime | None
