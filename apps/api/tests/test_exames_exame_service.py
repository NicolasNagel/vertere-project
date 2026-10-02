from decimal import Decimal

import pytest

from vertere_api.exames.domain import Exame
from vertere_api.exames.service import (
    ExameInvalido,
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


class TestValidacaoDeExame:
    """S14, FR-009 e FR-011: o service recusa preço não positivo e texto vazio, sem gravar."""

    @pytest.mark.parametrize("preco", [Decimal("0"), Decimal("-10")])
    def test_cadastrar_com_preco_nao_positivo_levanta_erro_sem_gravar(self, preco: Decimal) -> None:
        repo = ExameRepositorioFake()

        with pytest.raises(ExameInvalido, match=r"^Preço-base deve ser maior que zero\.$"):
            cadastrar_exame(categoria="Hematologia", nome="Hemograma", preco_base=preco, repo=repo)

        assert repo.listar_todas() == []

    @pytest.mark.parametrize("categoria", ["", "   "])
    def test_cadastrar_com_categoria_vazia_levanta_erro_sem_gravar(self, categoria: str) -> None:
        repo = ExameRepositorioFake()

        with pytest.raises(ExameInvalido, match=r"^Categoria não pode ficar vazia\.$"):
            cadastrar_exame(
                categoria=categoria, nome="Hemograma", preco_base=Decimal("10"), repo=repo
            )

        assert repo.listar_todas() == []

    @pytest.mark.parametrize("nome", ["", "   "])
    def test_cadastrar_com_nome_vazio_levanta_erro_sem_gravar(self, nome: str) -> None:
        repo = ExameRepositorioFake()

        with pytest.raises(ExameInvalido, match=r"^Nome não pode ficar vazio\.$"):
            cadastrar_exame(categoria="Hematologia", nome=nome, preco_base=Decimal("10"), repo=repo)

        assert repo.listar_todas() == []

    def test_categoria_invalida_tem_precedencia_sobre_preco_invalido(self) -> None:
        with pytest.raises(ExameInvalido, match=r"^Categoria não pode ficar vazia\.$"):
            cadastrar_exame(
                categoria=" ", nome="Hemograma", preco_base=Decimal("-1"), repo=ExameRepositorioFake()
            )

    def test_cadastrar_grava_categoria_e_nome_sem_espacos_nas_pontas(self) -> None:
        repo = ExameRepositorioFake()

        exame = cadastrar_exame(
            categoria="  Hematologia  ",
            nome=" Hemograma  completo ",
            preco_base=Decimal("10"),
            repo=repo,
        )

        assert exame.categoria == "Hematologia"
        assert exame.nome == "Hemograma  completo"
        assert repo.buscar_por_id(exame.id) == exame

    @pytest.mark.parametrize(
        ("categoria", "nome", "preco", "mensagem"),
        [
            ("Hematologia", "Hemograma", Decimal("0"), "Preço-base deve ser maior que zero."),
            ("  ", "Hemograma", Decimal("10"), "Categoria não pode ficar vazia."),
            ("Hematologia", "", Decimal("10"), "Nome não pode ficar vazio."),
        ],
    )
    def test_editar_com_dados_invalidos_levanta_erro_sem_alterar(
        self, categoria: str, nome: str, preco: Decimal, mensagem: str
    ) -> None:
        original = Exame(
            id="exame-1",
            categoria="Hematologia",
            nome="Hemograma",
            preco_base=Decimal("45.00"),
            ativo=True,
        )
        repo = ExameRepositorioFake([original])

        with pytest.raises(ExameInvalido) as erro:
            editar_exame(
                exame_id="exame-1", categoria=categoria, nome=nome, preco_base=preco, repo=repo
            )

        assert str(erro.value) == mensagem
        assert repo.buscar_por_id("exame-1") == original

    def test_editar_grava_sem_espacos_nas_pontas(self) -> None:
        original = Exame(
            id="exame-1", categoria="X", nome="Y", preco_base=Decimal("1"), ativo=True
        )
        repo = ExameRepositorioFake([original])

        atualizado = editar_exame(
            exame_id="exame-1",
            categoria=" Bioquímica ",
            nome=" Glicose ",
            preco_base=Decimal("20"),
            repo=repo,
        )

        assert (atualizado.categoria, atualizado.nome) == ("Bioquímica", "Glicose")

    def test_editar_invalido_de_id_inexistente_levanta_exame_invalido(self) -> None:
        with pytest.raises(ExameInvalido):
            editar_exame(
                exame_id="inexistente",
                categoria="X",
                nome="X",
                preco_base=Decimal("-1"),
                repo=ExameRepositorioFake(),
            )

    def test_exame_legado_com_preco_negativo_pode_ser_inativado_e_reativado(self) -> None:
        legado = Exame(
            id="legado", categoria="Teste", nome="Negativo", preco_base=Decimal("-10"), ativo=True
        )
        repo = ExameRepositorioFake([legado])

        assert inativar_exame("legado", repo=repo).ativo is False
        assert reativar_exame("legado", repo=repo).ativo is True
