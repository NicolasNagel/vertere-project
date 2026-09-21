from decimal import Decimal
from typing import Protocol

from vertere_api.atendimentos.domain import Atendimento, StatusAtendimento
from vertere_api.financeiro.domain import Fechamento


class FechamentoRepository(Protocol):
    def buscar_por_id(self, fechamento_id: str) -> Fechamento | None: ...
    def buscar_por_clinica_periodo(self, clinica_id: str, ano: int, mes: int) -> Fechamento | None: ...
    def listar_todas(self) -> list[Fechamento]: ...
    def salvar(self, fechamento: Fechamento) -> None: ...


def _atendimentos_ativos_do_periodo(
    atendimentos: list[Atendimento], clinica_id: str, ano: int, mes: int
) -> list[Atendimento]:
    return [
        a
        for a in atendimentos
        if a.clinica_id == clinica_id
        and a.status == StatusAtendimento.ATIVO
        and a.data_hora.year == ano
        and a.data_hora.month == mes
    ]


def calcular_faturamento_por_clinica(
    atendimentos: list[Atendimento], clinica_id: str, ano: int, mes: int
) -> Decimal:
    """Soma o `valor_total` dos atendimentos ativos de `clinica_id` no mês/ano informado."""
    itens = _atendimentos_ativos_do_periodo(atendimentos, clinica_id, ano, mes)
    return sum((a.valor_total for a in itens), Decimal("0"))


def calcular_resumo_financeiro(
    atendimentos: list[Atendimento], ano: int, mes: int
) -> list[tuple[str, Decimal]]:
    """Faturamento de cada clínica presente nos atendimentos do mês/ano informado."""
    clinicas_ids = {a.clinica_id for a in atendimentos}
    return [
        (clinica_id, calcular_faturamento_por_clinica(atendimentos, clinica_id, ano, mes))
        for clinica_id in clinicas_ids
    ]
