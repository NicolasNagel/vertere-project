from datetime import time
from decimal import Decimal

import pytest

from vertere_api.exames.domain import RegraPlantao
from vertere_api.exames.service import (
    RegraPlantaoNaoEncontrada,
    cadastrar_regra_plantao,
    editar_regra_plantao,
    inativar_regra_plantao,
    listar_regras_plantao,
    reativar_regra_plantao,
)


class RegraPlantaoRepositorioFake:
    def __init__(self, regras: list[RegraPlantao] | None = None) -> None:
        self._por_id = {r.id: r for r in (regras or [])}

    def buscar_por_id(self, regra_id: str) -> RegraPlantao | None:
        return self._por_id.get(regra_id)

    def listar_todas(self) -> list[RegraPlantao]:
        return list(self._por_id.values())

    def salvar(self, regra: RegraPlantao) -> None:
        self._por_id[regra.id] = regra


class TestCadastrarRegraPlantao:
    def test_cadastra_regra_com_dados_completos(self) -> None:
        repo = RegraPlantaoRepositorioFake()

        regra = cadastrar_regra_plantao(
            dia_semana=4,
            hora_inicio=time(18, 0),
            hora_fim=time(6, 0),
            valor_adicional=Decimal("50.00"),
            repo=repo,
        )

        assert regra.dia_semana == 4
        assert regra.hora_inicio == time(18, 0)
        assert regra.hora_fim == time(6, 0)
        assert regra.valor_adicional == Decimal("50.00")
        assert regra.ativo is True
        assert repo.buscar_por_id(regra.id) == regra


class TestEditarRegraPlantao:
    def test_edita_regra_existente(self) -> None:
        regra = RegraPlantao(
            id="regra-1",
            dia_semana=4,
            hora_inicio=time(18, 0),
            hora_fim=time(6, 0),
            valor_adicional=Decimal("50.00"),
            ativo=True,
        )
        repo = RegraPlantaoRepositorioFake([regra])

        atualizada = editar_regra_plantao(
            regra_id="regra-1",
            dia_semana=5,
            hora_inicio=time(19, 0),
            hora_fim=time(7, 0),
            valor_adicional=Decimal("60.00"),
            repo=repo,
        )

        assert atualizada.dia_semana == 5
        assert atualizada.hora_inicio == time(19, 0)
        assert atualizada.hora_fim == time(7, 0)
        assert atualizada.valor_adicional == Decimal("60.00")

    def test_editar_regra_inexistente_levanta_erro(self) -> None:
        repo = RegraPlantaoRepositorioFake()

        with pytest.raises(RegraPlantaoNaoEncontrada):
            editar_regra_plantao(
                regra_id="inexistente",
                dia_semana=0,
                hora_inicio=time(0, 0),
                hora_fim=time(1, 0),
                valor_adicional=Decimal("1.00"),
                repo=repo,
            )


class TestInativarReativarRegraPlantao:
    def test_inativa_regra(self) -> None:
        regra = RegraPlantao(
            id="regra-1",
            dia_semana=4,
            hora_inicio=time(18, 0),
            hora_fim=time(6, 0),
            valor_adicional=Decimal("50.00"),
            ativo=True,
        )
        repo = RegraPlantaoRepositorioFake([regra])

        inativada = inativar_regra_plantao("regra-1", repo)

        assert inativada.ativo is False

    def test_reativa_regra(self) -> None:
        regra = RegraPlantao(
            id="regra-1",
            dia_semana=4,
            hora_inicio=time(18, 0),
            hora_fim=time(6, 0),
            valor_adicional=Decimal("50.00"),
            ativo=False,
        )
        repo = RegraPlantaoRepositorioFake([regra])

        reativada = reativar_regra_plantao("regra-1", repo)

        assert reativada.ativo is True

    def test_inativar_regra_inexistente_levanta_erro(self) -> None:
        repo = RegraPlantaoRepositorioFake()

        with pytest.raises(RegraPlantaoNaoEncontrada):
            inativar_regra_plantao("inexistente", repo)


class TestListarRegrasPlantao:
    def test_lista_todas(self) -> None:
        repo = RegraPlantaoRepositorioFake(
            [
                RegraPlantao(
                    id="regra-1",
                    dia_semana=4,
                    hora_inicio=time(18, 0),
                    hora_fim=time(6, 0),
                    valor_adicional=Decimal("50.00"),
                    ativo=True,
                ),
                RegraPlantao(
                    id="regra-2",
                    dia_semana=6,
                    hora_inicio=time(0, 0),
                    hora_fim=time(23, 59),
                    valor_adicional=Decimal("70.00"),
                    ativo=False,
                ),
            ]
        )

        assert len(listar_regras_plantao(repo)) == 2

    def test_lista_filtrando_apenas_ativas(self) -> None:
        repo = RegraPlantaoRepositorioFake(
            [
                RegraPlantao(
                    id="regra-1",
                    dia_semana=4,
                    hora_inicio=time(18, 0),
                    hora_fim=time(6, 0),
                    valor_adicional=Decimal("50.00"),
                    ativo=True,
                ),
                RegraPlantao(
                    id="regra-2",
                    dia_semana=6,
                    hora_inicio=time(0, 0),
                    hora_fim=time(23, 59),
                    valor_adicional=Decimal("70.00"),
                    ativo=False,
                ),
            ]
        )

        resultado = listar_regras_plantao(repo, apenas_ativos=True)

        assert [r.id for r in resultado] == ["regra-1"]
