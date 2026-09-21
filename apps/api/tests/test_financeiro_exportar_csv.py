from datetime import date, datetime
from decimal import Decimal

from vertere_api.clinicas.domain import Clinica
from vertere_api.financeiro.domain import Fechamento
from vertere_api.financeiro.service import exportar_fechamento_csv


def _clinica() -> Clinica:
    return Clinica(
        id="clinica-1",
        nome="Clínica Central",
        cnpj="11222333000181",
        endereco="Rua A, 123",
        telefone="47999990000",
        email="contato@clinica.com",
        ativo=True,
    )


def _fechamento(pago: bool = False, data_pagamento: datetime | None = None) -> Fechamento:
    return Fechamento(
        id="fechamento-1",
        clinica_id="clinica-1",
        ano=2026,
        mes=9,
        valor_total=Decimal("150.00"),
        quantidade_atendimentos=2,
        data_fechamento=datetime(2026, 10, 1),
        pago=pago,
        data_pagamento=data_pagamento,
    )


class TestExportarFechamentoCsv:
    def test_cabecalho_e_linha_de_fechamento_pendente(self) -> None:
        csv = exportar_fechamento_csv(_fechamento(), _clinica(), hoje=date(2026, 10, 5))
        linhas = csv.strip().splitlines()

        assert len(linhas) == 2
        assert linhas[0] == (
            "clinica,ano,mes,valor_total,quantidade_atendimentos,status,data_pagamento"
        )
        assert linhas[1] == "Clínica Central,2026,9,150.00,2,pendente,"

    def test_linha_de_fechamento_inadimplente(self) -> None:
        csv = exportar_fechamento_csv(_fechamento(), _clinica(), hoje=date(2026, 10, 11))
        linha = csv.strip().splitlines()[1]

        assert linha == "Clínica Central,2026,9,150.00,2,inadimplente,"

    def test_linha_de_fechamento_pago_inclui_data_pagamento(self) -> None:
        fechamento = _fechamento(pago=True, data_pagamento=datetime(2026, 10, 5))

        csv = exportar_fechamento_csv(fechamento, _clinica(), hoje=date(2027, 1, 1))
        linha = csv.strip().splitlines()[1]

        assert linha == "Clínica Central,2026,9,150.00,2,pago,2026-10-05"
