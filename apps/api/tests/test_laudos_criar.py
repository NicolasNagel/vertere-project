from datetime import UTC, datetime
from decimal import Decimal

import pytest

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.exames.domain import Exame
from vertere_api.laudos.domain import CampoTemplate, Laudo, TemplateLaudo
from vertere_api.laudos.service import (
    AtendimentoInvalido,
    ExameForaDoAtendimento,
    LaudoJaExiste,
    TemplateLaudoIndisponivel,
    criar_laudo,
)


class _RepositorioFakeGenerico:
    def __init__(self, itens: list) -> None:
        self._por_id = {item.id: item for item in itens}

    def buscar_por_id(self, item_id: str):
        return self._por_id.get(item_id)

    def listar_todas(self) -> list:
        return list(self._por_id.values())


class LaudoRepositorioFake:
    def __init__(self, laudos: list[Laudo] | None = None) -> None:
        self._por_id = {laudo.id: laudo for laudo in (laudos or [])}

    def buscar_por_id(self, laudo_id: str) -> Laudo | None:
        return self._por_id.get(laudo_id)

    def listar_todas(self) -> list[Laudo]:
        return list(self._por_id.values())

    def salvar(self, laudo: Laudo) -> None:
        self._por_id[laudo.id] = laudo


def _atendimento(status: StatusAtendimento = StatusAtendimento.ATIVO) -> Atendimento:
    return Atendimento(
        id="atendimento-1",
        clinica_id="clinica-1",
        veterinario_id="vet-1",
        paciente_id="paciente-1",
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal("45.00"), quantidade=1)],
        metodo_coleta="Venosa",
        data_hora=datetime(2026, 9, 20, 10, 0, tzinfo=UTC),
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal("45.00"),
        status=status,
    )


def _exame() -> Exame:
    return Exame(id="exame-1", categoria="Hematologia", nome="Hemograma", preco_base=Decimal("45.00"), ativo=True)


def _template(ativo: bool = True) -> TemplateLaudo:
    return TemplateLaudo(
        id="tpl-1",
        categoria="Hematologia",
        campos=[CampoTemplate(nome="Hemácias", unidade=None, faixa_referencia=None)],
        ativo=ativo,
    )


class TestCriarLaudo:
    def test_cria_laudo_valido(self) -> None:
        laudo = criar_laudo(
            atendimento_id="atendimento-1",
            exame_id="exame-1",
            usuario_id="usuario-1",
            repo=LaudoRepositorioFake(),
            atendimentos=_RepositorioFakeGenerico([_atendimento()]),
            exames=_RepositorioFakeGenerico([_exame()]),
            templates=_RepositorioFakeGenerico([_template()]),
        )

        assert laudo.atendimento_id == "atendimento-1"
        assert laudo.exame_id == "exame-1"
        assert laudo.template_id == "tpl-1"
        assert laudo.valores == []
        assert laudo.status.value == "rascunho"
        assert laudo.criado_por == "usuario-1"

    def test_atendimento_inexistente_levanta_erro(self) -> None:
        with pytest.raises(AtendimentoInvalido):
            criar_laudo(
                atendimento_id="inexistente",
                exame_id="exame-1",
                usuario_id="usuario-1",
                repo=LaudoRepositorioFake(),
                atendimentos=_RepositorioFakeGenerico([]),
                exames=_RepositorioFakeGenerico([_exame()]),
                templates=_RepositorioFakeGenerico([_template()]),
            )

    def test_atendimento_cancelado_levanta_erro(self) -> None:
        with pytest.raises(AtendimentoInvalido):
            criar_laudo(
                atendimento_id="atendimento-1",
                exame_id="exame-1",
                usuario_id="usuario-1",
                repo=LaudoRepositorioFake(),
                atendimentos=_RepositorioFakeGenerico([_atendimento(StatusAtendimento.CANCELADO)]),
                exames=_RepositorioFakeGenerico([_exame()]),
                templates=_RepositorioFakeGenerico([_template()]),
            )

    def test_exame_fora_do_atendimento_levanta_erro(self) -> None:
        with pytest.raises(ExameForaDoAtendimento):
            criar_laudo(
                atendimento_id="atendimento-1",
                exame_id="exame-outro",
                usuario_id="usuario-1",
                repo=LaudoRepositorioFake(),
                atendimentos=_RepositorioFakeGenerico([_atendimento()]),
                exames=_RepositorioFakeGenerico([_exame()]),
                templates=_RepositorioFakeGenerico([_template()]),
            )

    def test_template_inexistente_para_categoria_levanta_erro(self) -> None:
        with pytest.raises(TemplateLaudoIndisponivel):
            criar_laudo(
                atendimento_id="atendimento-1",
                exame_id="exame-1",
                usuario_id="usuario-1",
                repo=LaudoRepositorioFake(),
                atendimentos=_RepositorioFakeGenerico([_atendimento()]),
                exames=_RepositorioFakeGenerico([_exame()]),
                templates=_RepositorioFakeGenerico([]),
            )

    def test_template_inativo_para_categoria_levanta_erro(self) -> None:
        with pytest.raises(TemplateLaudoIndisponivel):
            criar_laudo(
                atendimento_id="atendimento-1",
                exame_id="exame-1",
                usuario_id="usuario-1",
                repo=LaudoRepositorioFake(),
                atendimentos=_RepositorioFakeGenerico([_atendimento()]),
                exames=_RepositorioFakeGenerico([_exame()]),
                templates=_RepositorioFakeGenerico([_template(ativo=False)]),
            )

    def test_laudo_duplicado_levanta_erro(self) -> None:
        existente = criar_laudo(
            atendimento_id="atendimento-1",
            exame_id="exame-1",
            usuario_id="usuario-1",
            repo=(repo := LaudoRepositorioFake()),
            atendimentos=_RepositorioFakeGenerico([_atendimento()]),
            exames=_RepositorioFakeGenerico([_exame()]),
            templates=_RepositorioFakeGenerico([_template()]),
        )
        assert existente is not None

        with pytest.raises(LaudoJaExiste):
            criar_laudo(
                atendimento_id="atendimento-1",
                exame_id="exame-1",
                usuario_id="usuario-1",
                repo=repo,
                atendimentos=_RepositorioFakeGenerico([_atendimento()]),
                exames=_RepositorioFakeGenerico([_exame()]),
                templates=_RepositorioFakeGenerico([_template()]),
            )
