import pytest

from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.service import (
    CnpjInvalido,
    CnpjJaCadastrado,
    ClinicaNaoEncontrada,
    buscar_por_nome,
    criar_clinica,
    editar_clinica,
    inativar_clinica,
    listar_clinicas,
    reativar_clinica,
)


class RepositorioFake:
    def __init__(self, clinicas: list[Clinica] | None = None) -> None:
        self._por_id = {c.id: c for c in (clinicas or [])}

    def buscar_por_cnpj(self, cnpj: str) -> Clinica | None:
        for clinica in self._por_id.values():
            if clinica.cnpj == cnpj:
                return clinica
        return None

    def buscar_por_id(self, clinica_id: str) -> Clinica | None:
        return self._por_id.get(clinica_id)

    def listar_todas(self) -> list[Clinica]:
        return list(self._por_id.values())

    def salvar(self, clinica: Clinica) -> None:
        self._por_id[clinica.id] = clinica


class TestCriarClinica:
    def test_cria_clinica_com_dados_completos(self) -> None:
        repo = RepositorioFake()

        clinica = criar_clinica(
            nome="Clínica Central",
            cnpj="11222333000181",
            endereco="Rua A, 123",
            telefone="4730001111",
            email="contato@central.com",
            repo=repo,
        )

        assert clinica.nome == "Clínica Central"
        assert clinica.ativo is True
        assert repo.buscar_por_id(clinica.id) == clinica

    @pytest.mark.parametrize("cnpj_invalido", ["123", "1122233300018a", "112223330001811"])
    def test_cnpj_com_formato_invalido_e_rejeitado(self, cnpj_invalido: str) -> None:
        repo = RepositorioFake()

        with pytest.raises(CnpjInvalido):
            criar_clinica(
                nome="Clínica X",
                cnpj=cnpj_invalido,
                endereco="Rua X",
                telefone="123",
                email="x@x.com",
                repo=repo,
            )

    def test_cnpj_duplicado_e_rejeitado(self) -> None:
        existente = Clinica(
            id="1",
            nome="Clínica A",
            cnpj="11222333000181",
            endereco="Rua A",
            telefone="123",
            email="a@a.com",
            ativo=True,
        )
        repo = RepositorioFake([existente])

        with pytest.raises(CnpjJaCadastrado):
            criar_clinica(
                nome="Clínica B",
                cnpj="11222333000181",
                endereco="Rua B",
                telefone="456",
                email="b@b.com",
                repo=repo,
            )


class TestEditarClinica:
    def test_edita_dados_de_clinica_existente(self) -> None:
        clinica = Clinica(
            id="1",
            nome="Clínica A",
            cnpj="11222333000181",
            endereco="Rua A",
            telefone="123",
            email="a@a.com",
            ativo=True,
        )
        repo = RepositorioFake([clinica])

        atualizada = editar_clinica(
            clinica_id="1",
            nome="Clínica A Ltda",
            endereco="Rua A, 456",
            telefone="789",
            email="novo@a.com",
            repo=repo,
        )

        assert atualizada.nome == "Clínica A Ltda"
        assert atualizada.endereco == "Rua A, 456"
        assert atualizada.cnpj == "11222333000181"
        assert repo.buscar_por_id("1").nome == "Clínica A Ltda"

    def test_editar_clinica_inexistente_levanta_erro(self) -> None:
        repo = RepositorioFake()

        with pytest.raises(ClinicaNaoEncontrada):
            editar_clinica(
                clinica_id="inexistente",
                nome="X",
                endereco="X",
                telefone="X",
                email="x@x.com",
                repo=repo,
            )


class TestInativarReativarClinica:
    def test_inativa_clinica_ativa(self) -> None:
        clinica = Clinica(
            id="1", nome="A", cnpj="1", endereco="A", telefone="1", email="a@a.com", ativo=True
        )
        repo = RepositorioFake([clinica])

        atualizada = inativar_clinica(clinica_id="1", repo=repo)

        assert atualizada.ativo is False
        assert repo.buscar_por_id("1").ativo is False

    def test_reativa_clinica_inativa(self) -> None:
        clinica = Clinica(
            id="1", nome="A", cnpj="1", endereco="A", telefone="1", email="a@a.com", ativo=False
        )
        repo = RepositorioFake([clinica])

        atualizada = reativar_clinica(clinica_id="1", repo=repo)

        assert atualizada.ativo is True
        assert repo.buscar_por_id("1").ativo is True

    def test_inativar_clinica_inexistente_levanta_erro(self) -> None:
        repo = RepositorioFake()

        with pytest.raises(ClinicaNaoEncontrada):
            inativar_clinica(clinica_id="inexistente", repo=repo)


class TestBuscaELista:
    def _repo_com_tres_clinicas(self) -> RepositorioFake:
        return RepositorioFake(
            [
                Clinica(
                    id="1", nome="Clínica Central", cnpj="1", endereco="A", telefone="1",
                    email="a@a.com", ativo=True,
                ),
                Clinica(
                    id="2", nome="Vet Norte", cnpj="2", endereco="B", telefone="2",
                    email="b@b.com", ativo=True,
                ),
                Clinica(
                    id="3", nome="Clínica Sul", cnpj="3", endereco="C", telefone="3",
                    email="c@c.com", ativo=False,
                ),
            ]
        )

    def test_busca_por_nome_e_case_insensitive_e_por_substring(self) -> None:
        repo = self._repo_com_tres_clinicas()

        resultado = buscar_por_nome("clínica", repo)

        nomes = {c.nome for c in resultado}
        assert nomes == {"Clínica Central", "Clínica Sul"}

    def test_busca_por_nome_apenas_ativas(self) -> None:
        repo = self._repo_com_tres_clinicas()

        resultado = buscar_por_nome("clínica", repo, apenas_ativas=True)

        nomes = {c.nome for c in resultado}
        assert nomes == {"Clínica Central"}

    def test_listar_clinicas_sem_filtro_retorna_todas(self) -> None:
        repo = self._repo_com_tres_clinicas()

        resultado = listar_clinicas(repo)

        assert len(resultado) == 3

    def test_listar_clinicas_apenas_ativas(self) -> None:
        repo = self._repo_com_tres_clinicas()

        resultado = listar_clinicas(repo, apenas_ativas=True)

        assert len(resultado) == 2
        assert all(c.ativo for c in resultado)
