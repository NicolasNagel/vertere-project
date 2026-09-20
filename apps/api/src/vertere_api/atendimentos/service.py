from decimal import Decimal
from typing import Protocol

from vertere_api.atendimentos.domain import Atendimento, ItemExame


class AtendimentoRepository(Protocol):
    def buscar_por_id(self, atendimento_id: str) -> Atendimento | None: ...
    def listar_todas(self) -> list[Atendimento]: ...
    def salvar(self, atendimento: Atendimento) -> None: ...


class DescontoInvalido(Exception):
    def __init__(self, desconto: Decimal, subtotal: Decimal) -> None:
        super().__init__(f"Desconto {desconto} excede o subtotal {subtotal}")


def calcular_valor_total(
    itens_exame: list[ItemExame], valor_adicional_plantao: Decimal, desconto: Decimal
) -> Decimal:
    """Soma os itens de exame, aplica o adicional de plantão e subtrai o desconto.

    Rejeita um desconto que exceda a soma de itens + adicional, para nunca
    persistir um valor total negativo.
    """
    subtotal = sum((item.preco_unitario * item.quantidade for item in itens_exame), Decimal("0"))
    subtotal += valor_adicional_plantao
    if desconto > subtotal:
        raise DescontoInvalido(desconto, subtotal)
    return subtotal - desconto
