from decimal import Decimal

import pytest

from vertere_api.atendimentos.domain import ItemExame
from vertere_api.atendimentos.service import DescontoInvalido, calcular_valor_total


def _item(preco_unitario: str, quantidade: int = 1, exame_id: str = "exame-1") -> ItemExame:
    return ItemExame(exame_id=exame_id, preco_unitario=Decimal(preco_unitario), quantidade=quantidade)


class TestCalcularValorTotal:
    def test_item_unico_sem_adicional_sem_desconto(self) -> None:
        total = calcular_valor_total(
            [_item("45.00")], valor_adicional_plantao=Decimal("0"), desconto=Decimal("0")
        )

        assert total == Decimal("45.00")

    def test_multiplos_itens(self) -> None:
        itens = [_item("45.00", exame_id="exame-1"), _item("20.00", exame_id="exame-2")]

        total = calcular_valor_total(
            itens, valor_adicional_plantao=Decimal("0"), desconto=Decimal("0")
        )

        assert total == Decimal("65.00")

    def test_item_com_quantidade_maior_que_um(self) -> None:
        itens = [_item("45.00", quantidade=2)]

        total = calcular_valor_total(
            itens, valor_adicional_plantao=Decimal("0"), desconto=Decimal("0")
        )

        assert total == Decimal("90.00")

    def test_com_adicional_de_plantao(self) -> None:
        total = calcular_valor_total(
            [_item("45.00")], valor_adicional_plantao=Decimal("50.00"), desconto=Decimal("0")
        )

        assert total == Decimal("95.00")

    def test_com_desconto_valido(self) -> None:
        total = calcular_valor_total(
            [_item("45.00")], valor_adicional_plantao=Decimal("50.00"), desconto=Decimal("20.00")
        )

        assert total == Decimal("75.00")

    def test_desconto_que_excede_o_total_e_rejeitado(self) -> None:
        with pytest.raises(DescontoInvalido):
            calcular_valor_total(
                [_item("45.00")],
                valor_adicional_plantao=Decimal("0"),
                desconto=Decimal("50.00"),
            )
