from dataclasses import dataclass
from datetime import time
from decimal import Decimal


@dataclass(frozen=True)
class Exame:
    id: str
    categoria: str
    nome: str
    preco_base: Decimal
    ativo: bool


@dataclass(frozen=True)
class RegraPlantao:
    id: str
    dia_semana: int
    hora_inicio: time
    hora_fim: time
    valor_adicional: Decimal
    ativo: bool
