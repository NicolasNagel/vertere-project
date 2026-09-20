from datetime import UTC, datetime

import pytest

from vertere_api.laudos.domain import DadosLaudo, Laudo, StatusLaudo
from vertere_api.laudos.service import LaudoFinalizado, LaudoNaoFinalizado, finalizar_laudo, reenviar_laudo


class LaudoRepositorioFake:
    def __init__(self, laudos: list[Laudo] | None = None) -> None:
        self._por_id = {laudo.id: laudo for laudo in (laudos or [])}

    def buscar_por_id(self, laudo_id: str) -> Laudo | None:
        return self._por_id.get(laudo_id)

    def listar_todas(self) -> list[Laudo]:
        return list(self._por_id.values())

    def salvar(self, laudo: Laudo) -> None:
        self._por_id[laudo.id] = laudo


class GeradorPdfFake:
    def gerar(self, dados: DadosLaudo) -> bytes:
        return b"%PDF-fake"


class EnvioLaudoGatewayFake:
    def __init__(self, falhar: bool = False) -> None:
        self.falhar = falhar
        self.chamadas: list[dict] = []

    def enviar(self, destinatario: str, assunto: str, corpo: str, anexo_pdf: bytes, nome_anexo: str) -> None:
        self.chamadas.append(
            {
                "destinatario": destinatario,
                "assunto": assunto,
                "corpo": corpo,
                "anexo_pdf": anexo_pdf,
                "nome_anexo": nome_anexo,
            }
        )
        if self.falhar:
            raise RuntimeError("Falha simulada de envio")


def _laudo(status: StatusLaudo = StatusLaudo.RASCUNHO) -> Laudo:
    return Laudo(
        id="laudo-1",
        atendimento_id="atendimento-1",
        exame_id="exame-1",
        template_id="tpl-1",
        valores=[],
        status=status,
        criado_por="usuario-1",
        criado_em=datetime(2026, 9, 20, 11, 0, tzinfo=UTC),
    )


def _dados() -> DadosLaudo:
    return DadosLaudo(
        laudo_id="laudo-1",
        paciente_nome="Rex",
        clinica_nome="Clínica Central",
        veterinario_nome="Dr. João",
        veterinario_crmv="SC-1234",
        exame_nome="Hemograma",
        exame_categoria="Hematologia",
        data_atendimento=datetime(2026, 9, 20, 10, 0, tzinfo=UTC),
        campos=[],
    )


class TestFinalizarLaudo:
    def test_finaliza_com_envio_bem_sucedido(self) -> None:
        repo = LaudoRepositorioFake([_laudo()])
        gateway = EnvioLaudoGatewayFake()

        finalizado = finalizar_laudo(
            "laudo-1", "usuario-1", "joao@clinica.com", _dados(), repo, GeradorPdfFake(), gateway
        )

        assert finalizado.status.value == "finalizado"
        assert finalizado.finalizado_por == "usuario-1"
        assert finalizado.finalizado_em is not None
        assert finalizado.enviado_em is not None
        assert finalizado.erro_envio is None
        assert len(gateway.chamadas) == 1
        assert gateway.chamadas[0]["destinatario"] == "joao@clinica.com"

    def test_finaliza_mesmo_com_falha_de_envio(self) -> None:
        repo = LaudoRepositorioFake([_laudo()])
        gateway = EnvioLaudoGatewayFake(falhar=True)

        finalizado = finalizar_laudo(
            "laudo-1", "usuario-1", "joao@clinica.com", _dados(), repo, GeradorPdfFake(), gateway
        )

        assert finalizado.status.value == "finalizado"
        assert finalizado.enviado_em is None
        assert finalizado.erro_envio == "Falha simulada de envio"

    def test_rejeita_finalizar_laudo_ja_finalizado(self) -> None:
        repo = LaudoRepositorioFake([_laudo(StatusLaudo.FINALIZADO)])

        with pytest.raises(LaudoFinalizado):
            finalizar_laudo(
                "laudo-1", "usuario-1", "joao@clinica.com", _dados(), repo, GeradorPdfFake(), EnvioLaudoGatewayFake()
            )


class TestReenviarLaudo:
    def test_reenvia_apos_falha_anterior(self) -> None:
        laudo_finalizado_com_erro = _laudo(StatusLaudo.FINALIZADO)
        repo = LaudoRepositorioFake([laudo_finalizado_com_erro])
        gateway = EnvioLaudoGatewayFake()

        reenviado = reenviar_laudo("laudo-1", "joao@clinica.com", _dados(), repo, GeradorPdfFake(), gateway)

        assert reenviado.enviado_em is not None
        assert reenviado.erro_envio is None
        assert len(gateway.chamadas) == 1

    def test_rejeita_reenviar_rascunho(self) -> None:
        repo = LaudoRepositorioFake([_laudo(StatusLaudo.RASCUNHO)])

        with pytest.raises(LaudoNaoFinalizado):
            reenviar_laudo(
                "laudo-1", "joao@clinica.com", _dados(), repo, GeradorPdfFake(), EnvioLaudoGatewayFake()
            )
