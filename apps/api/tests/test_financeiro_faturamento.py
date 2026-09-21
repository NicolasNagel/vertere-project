from datetime import datetime
from decimal import Decimal

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.financeiro.service import (
    calcular_faturamento_por_clinica,
    calcular_resumo_financeiro,
)


def _atendimento(
    clinica_id: str,
    data_hora: datetime,
    valor_total: str,
    status: StatusAtendimento = StatusAtendimento.ATIVO,
    id: str = "atendimento-1",
) -> Atendimento:
    return Atendimento(
        id=id,
        clinica_id=clinica_id,
        veterinario_id="vet-1",
        paciente_id="paciente-1",
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal(valor_total), quantidade=1)],
        metodo_coleta="presencial",
        data_hora=data_hora,
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal(valor_total),
        status=status,
    )


class TestCalcularFaturamentoPorClinica:
    def test_sem_atendimentos_retorna_zero(self) -> None:
        total = calcular_faturamento_por_clinica([], "clinica-1", 2026, 9)

        assert total == Decimal("0")

    def test_soma_atendimentos_ativos_da_clinica_no_periodo(self) -> None:
        atendimentos = [
            _atendimento("clinica-1", datetime(2026, 9, 5), "100.00", id="a1"),
            _atendimento("clinica-1", datetime(2026, 9, 20), "50.00", id="a2"),
        ]

        total = calcular_faturamento_por_clinica(atendimentos, "clinica-1", 2026, 9)

        assert total == Decimal("150.00")

    def test_exclui_atendimento_cancelado(self) -> None:
        atendimentos = [
            _atendimento("clinica-1", datetime(2026, 9, 5), "100.00", id="a1"),
            _atendimento(
                "clinica-1", datetime(2026, 9, 6), "999.00", StatusAtendimento.CANCELADO, id="a2"
            ),
        ]

        total = calcular_faturamento_por_clinica(atendimentos, "clinica-1", 2026, 9)

        assert total == Decimal("100.00")

    def test_exclui_atendimento_de_outra_clinica_ou_periodo(self) -> None:
        atendimentos = [
            _atendimento("clinica-1", datetime(2026, 9, 5), "100.00", id="a1"),
            _atendimento("clinica-2", datetime(2026, 9, 5), "200.00", id="a2"),
            _atendimento("clinica-1", datetime(2026, 8, 31), "300.00", id="a3"),
            _atendimento("clinica-1", datetime(2026, 10, 1), "400.00", id="a4"),
        ]

        total = calcular_faturamento_por_clinica(atendimentos, "clinica-1", 2026, 9)

        assert total == Decimal("100.00")


class TestCalcularResumoFinanceiro:
    def test_sem_atendimentos_retorna_lista_vazia(self) -> None:
        resumo = calcular_resumo_financeiro([], 2026, 9)

        assert resumo == []

    def test_agrupa_por_clinica_no_periodo(self) -> None:
        atendimentos = [
            _atendimento("clinica-1", datetime(2026, 9, 5), "100.00", id="a1"),
            _atendimento("clinica-1", datetime(2026, 9, 6), "50.00", id="a2"),
            _atendimento("clinica-2", datetime(2026, 9, 7), "200.00", id="a3"),
        ]

        resumo = calcular_resumo_financeiro(atendimentos, 2026, 9)

        assert sorted(resumo) == [("clinica-1", Decimal("150.00")), ("clinica-2", Decimal("200.00"))]

    def test_atendimento_cancelado_nao_gera_entrada_isolada(self) -> None:
        atendimentos = [
            _atendimento(
                "clinica-1", datetime(2026, 9, 5), "100.00", StatusAtendimento.CANCELADO, id="a1"
            ),
        ]

        resumo = calcular_resumo_financeiro(atendimentos, 2026, 9)

        assert resumo == [("clinica-1", Decimal("0"))]
