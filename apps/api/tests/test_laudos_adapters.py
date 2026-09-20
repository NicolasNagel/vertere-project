from datetime import UTC, datetime

from vertere_api.laudos.adapters import FpdfGeradorPdfLaudo
from vertere_api.laudos.domain import CampoDadosLaudo, DadosLaudo


class TestFpdfGeradorPdfLaudo:
    def test_gera_pdf_nao_vazio_com_cabecalho_valido(self) -> None:
        dados = DadosLaudo(
            laudo_id="laudo-1",
            paciente_nome="Rex",
            clinica_nome="Clínica Central",
            veterinario_nome="Dr. João",
            veterinario_crmv="SC-1234",
            exame_nome="Hemograma completo",
            exame_categoria="Hematologia",
            data_atendimento=datetime(2026, 9, 20, 10, 0, tzinfo=UTC),
            campos=[
                CampoDadosLaudo(nome="Hemacias", valor="7.2", unidade="milhoes/uL", faixa_referencia="5.5 a 8.5"),
            ],
        )

        pdf_bytes = FpdfGeradorPdfLaudo().gerar(dados)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b"%PDF")
