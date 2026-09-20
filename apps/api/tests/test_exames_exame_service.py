from decimal import Decimal

import pytest

from vertere_api.exames.domain import Exame
from vertere_api.exames.service import (
    ExameNaoEncontrado,
    cadastrar_exame,
    editar_exame,
    inativar_exame,
    listar_exames,
    reativar_exame,
)


class ExameRepositorioFake:
    def __init__(self, exames: list[Exame] | None = None) -> None:
        self._por_id = {e.id: e for e in (exames or [])}

    def buscar_por_id(self, exame_id: str) -> Exame | None:
        return self._por_id.get(exame_id)

    def listar_todas(self) -> list[Exame]:
        return list(self._por_id.values())

    def salvar(self, exame: Exame) -> None:
        self._por_id[exame.id] = exame


class TestCadastrarExame:
    def test_cadastra_exame_com_dados_completos(self) -> None:
        repo = ExameRepositorioFake()

        exame = cadastrar_exame(
            categoria="Hematologia",
            nome="Hemograma completo",
            preco_base=Decimal("45.00"),
            repo=repo,
        )

        assert exame.categoria == "Hematologia"
        assert exame.nome == "Hemograma completo"
        assert exame.preco_base == Decimal("45.00")
        assert exame.ativo is True
        assert repo.buscar_por_id(exame.id) == exame


class TestEditarExame:
    def test_edita_exame_existente(self) -> None:
        exame = Exame(
            id="exame-1",
            categoria="Hematologia",
            nome="Hemograma completo",
            preco_base=Decimal("45.00"),
            ativo=True,
        )
        repo = ExameRepositorioFake([exame])

        atualizado = editar_exame(
            exame_id="exame-1",
            categoria="Hematologia",
            nome="Hemograma",
            preco_base=Decimal("50.00"),
            repo=repo,
        )

        assert atualizado.nome == "Hemograma"
        assert atualizado.preco_base == Decimal("50.00")

    def test_editar_exame_inexistente_levanta_erro(self) -> None:
        repo = ExameRepositorioFake()

        with pytest.raises(ExameNaoEncontrado):
            editar_exame(
                exame_id="inexistente",
                categoria="X",
                nome="X",
                preco_base=Decimal("1.00"),
                repo=repo,
            )


class TestInativarReativarExame:
    def test_inativa_exame(self) -> None:
        exame = Exame(
            id="exame-1",
            categoria="Hematologia",
            nome="Hemograma",
            preco_base=Decimal("45.00"),
            ativo=True,
        )
        repo = ExameRepositorioFake([exame])

        inativado = inativar_exame("exame-1", repo)

        assert inativado.ativo is False

    def test_reativa_exame(self) -> None:
        exame = Exame(
            id="exame-1",
            categoria="Hematologia",
            nome="Hemograma",
            preco_base=Decimal("45.00"),
            ativo=False,
        )
        repo = ExameRepositorioFake([exame])

        reativado = reativar_exame("exame-1", repo)

        assert reativado.ativo is True

    def test_inativar_exame_inexistente_levanta_erro(self) -> None:
        repo = ExameRepositorioFake()

        with pytest.raises(ExameNaoEncontrado):
            inativar_exame("inexistente", repo)


class TestListarExames:
    def _repo(self) -> ExameRepositorioFake:
        return ExameRepositorioFake(
            [
                Exame(
                    id="exame-1",
                    categoria="Hematologia",
                    nome="Hemograma",
                    preco_base=Decimal("45.00"),
                    ativo=True,
                ),
                Exame(
                    id="exame-2",
                    categoria="Bioquímica",
                    nome="Glicose",
                    preco_base=Decimal("20.00"),
                    ativo=False,
                ),
                Exame(
                    id="exame-3",
                    categoria="Hematologia",
                    nome="Contagem de plaquetas",
                    preco_base=Decimal("30.00"),
                    ativo=True,
                ),
            ]
        )

    def test_lista_todos(self) -> None:
        assert len(listar_exames(self._repo())) == 3

    def test_lista_filtrando_categoria(self) -> None:
        resultado = listar_exames(self._repo(), categoria="Hematologia")

        assert {e.id for e in resultado} == {"exame-1", "exame-3"}

    def test_lista_filtrando_apenas_ativos(self) -> None:
        resultado = listar_exames(self._repo(), apenas_ativos=True)

        assert {e.id for e in resultado} == {"exame-1", "exame-3"}

    def test_lista_filtrando_categoria_e_ativos(self) -> None:
        resultado = listar_exames(self._repo(), categoria="Bioquímica", apenas_ativos=True)

        assert resultado == []
