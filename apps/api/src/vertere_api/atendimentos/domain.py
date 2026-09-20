from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import StrEnum


class StatusAtendimento(StrEnum):
    ATIVO = "ativo"
    CANCELADO = "cancelado"


@dataclass(frozen=True)
class ItemExame:
    exame_id: str
    preco_unitario: Decimal
    quantidade: int


@dataclass(frozen=True)
class Atendimento:
    id: str
    clinica_id: str
    veterinario_id: str
    paciente_id: str
    itens_exame: list[ItemExame]
    metodo_coleta: str
    data_hora: datetime
    regra_plantao_id: str | None
    valor_adicional_plantao: Decimal
    desconto: Decimal
    valor_total: Decimal
    status: StatusAtendimento
