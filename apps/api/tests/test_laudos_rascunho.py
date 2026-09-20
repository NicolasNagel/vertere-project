from datetime import UTC, datetime

import pytest

from vertere_api.laudos.domain import Laudo, StatusLaudo, ValorCampo
from vertere_api.laudos.service import LaudoFinalizado, LaudoNaoEncontrado, salvar_rascunho


class LaudoRepositorioFake:
    def __init__(self, laudos: list[Laudo] | None = None) -> None:
        self._por_id = {laudo.id: laudo for laudo in (laudos or [])}

    def buscar_por_id(self, laudo_id: str) -> Laudo | None:
        return self._por_id.get(laudo_id)

    def listar_todas(self) -> list[Laudo]:
        return list(self._por_id.values())

    def salvar(self, laudo: Laudo) -> None:
        self._por_id[laudo.id] = laudo


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


class TestSalvarRascunho:
    def test_atualiza_valores_de_laudo_em_rascunho(self) -> None:
        repo = LaudoRepositorioFake([_laudo()])
        valores = [ValorCampo(nome_campo="Hemácias", valor="7.2")]

        atualizado = salvar_rascunho("laudo-1", valores, repo)

        assert atualizado.valores == valores

    def test_rejeita_edicao_de_laudo_finalizado(self) -> None:
        repo = LaudoRepositorioFake([_laudo(StatusLaudo.FINALIZADO)])

        with pytest.raises(LaudoFinalizado):
            salvar_rascunho("laudo-1", [], repo)

    def test_laudo_inexistente_levanta_erro(self) -> None:
        repo = LaudoRepositorioFake()

        with pytest.raises(LaudoNaoEncontrado):
            salvar_rascunho("inexistente", [], repo)
