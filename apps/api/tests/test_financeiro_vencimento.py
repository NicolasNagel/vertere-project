from datetime import date, datetime
from decimal import Decimal

from vertere_api.clinicas.domain import Clinica
from vertere_api.financeiro.domain import Fechamento, StatusFechamento
from vertere_api.financeiro.service import calcular_vencimento, status_exibicao


def _clinica(prazo_pagamento_dias: int | None = None) -> Clinica:
    return Clinica(
        id="clinica-1",
        nome="Clínica Central",
        cnpj="11222333000181",
        endereco="Rua A, 123",
        telefone="47999990000",
        email="contato@clinica.com",
        ativo=True,
        prazo_pagamento_dias=prazo_pagamento_dias,
    )


def _fechamento(
    data_fechamento: datetime, pago: bool = False, data_pagamento: datetime | None = None
) -> Fechamento:
    return Fechamento(
        id="fechamento-1",
        clinica_id="clinica-1",
        ano=data_fechamento.year,
        mes=data_fechamento.month,
        valor_total=Decimal("100.00"),
        quantidade_atendimentos=1,
        data_fechamento=data_fechamento,
        pago=pago,
        data_pagamento=data_pagamento,
    )


class TestCalcularVencimento:
    def test_regra_padrao_vence_dia_10_do_mes_seguinte(self) -> None:
        vencimento = calcular_vencimento(_clinica(), datetime(2026, 9, 15))

        assert vencimento == date(2026, 10, 10)

    def test_regra_padrao_vira_o_ano(self) -> None:
        vencimento = calcular_vencimento(_clinica(), datetime(2026, 12, 20))

        assert vencimento == date(2027, 1, 10)

    def test_prazo_customizado_conta_dias_a_partir_do_fechamento(self) -> None:
        vencimento = calcular_vencimento(_clinica(prazo_pagamento_dias=15), datetime(2026, 9, 1))

        assert vencimento == date(2026, 9, 16)


class TestStatusExibicao:
    def test_pago_e_sempre_pago_independente_da_data(self) -> None:
        clinica = _clinica()
        fechamento = _fechamento(datetime(2026, 1, 1), pago=True, data_pagamento=datetime(2026, 1, 5))

        status = status_exibicao(fechamento, clinica, hoje=date(2027, 1, 1))

        assert status == StatusFechamento.PAGO

    def test_pendente_antes_do_vencimento(self) -> None:
        clinica = _clinica()
        fechamento = _fechamento(datetime(2026, 9, 15))

        status = status_exibicao(fechamento, clinica, hoje=date(2026, 10, 10))

        assert status == StatusFechamento.PENDENTE

    def test_inadimplente_depois_do_vencimento(self) -> None:
        clinica = _clinica()
        fechamento = _fechamento(datetime(2026, 9, 15))

        status = status_exibicao(fechamento, clinica, hoje=date(2026, 10, 11))

        assert status == StatusFechamento.INADIMPLENTE

    def test_usa_prazo_customizado_da_clinica(self) -> None:
        clinica = _clinica(prazo_pagamento_dias=7)
        fechamento = _fechamento(datetime(2026, 9, 1))

        pendente = status_exibicao(fechamento, clinica, hoje=date(2026, 9, 8))
        inadimplente = status_exibicao(fechamento, clinica, hoje=date(2026, 9, 9))

        assert pendente == StatusFechamento.PENDENTE
        assert inadimplente == StatusFechamento.INADIMPLENTE
