import pytest

from vertere_api.clinicas.domain import Clinica
from vertere_api.veterinarios.domain import Veterinario
from vertere_api.veterinarios.service import (
    ClinicaInexistente,
    CrmvJaCadastrado,
    VeterinarioNaoEncontrado,
    buscar_veterinarios,
    cadastrar_veterinario,
    editar_veterinario,
    inativar_veterinario,
    listar_veterinarios,
    reativar_veterinario,
)


class ClinicaRepositorioFake:
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


class VeterinarioRepositorioFake:
    def __init__(self, veterinarios: list[Veterinario] | None = None) -> None:
        self._por_id = {v.id: v for v in (veterinarios or [])}

    def buscar_por_crmv(self, crmv: str) -> Veterinario | None:
        for veterinario in self._por_id.values():
            if veterinario.crmv == crmv:
                return veterinario
        return None

    def buscar_por_id(self, veterinario_id: str) -> Veterinario | None:
        return self._por_id.get(veterinario_id)

    def listar_todas(self) -> list[Veterinario]:
        return list(self._por_id.values())

    def salvar(self, veterinario: Veterinario) -> None:
        self._por_id[veterinario.id] = veterinario


def _clinica(id_: str = "clinica-1", nome: str = "Clínica Central") -> Clinica:
    return Clinica(
        id=id_,
        nome=nome,
        cnpj="11222333000181",
        endereco="Rua A, 123",
        telefone="4730001111",
        email="contato@central.com",
        ativo=True,
    )


class TestCadastrarVeterinario:
    def test_cadastra_veterinario_com_dados_completos(self) -> None:
        clinicas = ClinicaRepositorioFake([_clinica()])
        repo = VeterinarioRepositorioFake()

        veterinario = cadastrar_veterinario(
            nome="Dr. João Silva",
            crmv="SC-1234",
            telefone="4799990000",
            email="joao@laudos.com",
            clinica_id="clinica-1",
            repo=repo,
            clinicas=clinicas,
        )

        assert veterinario.nome == "Dr. João Silva"
        assert veterinario.clinica_id == "clinica-1"
        assert veterinario.ativo is True
        assert repo.buscar_por_id(veterinario.id) == veterinario

    def test_rejeita_clinica_inexistente(self) -> None:
        clinicas = ClinicaRepositorioFake()
        repo = VeterinarioRepositorioFake()

        with pytest.raises(ClinicaInexistente):
            cadastrar_veterinario(
                nome="Dr. João Silva",
                crmv="SC-1234",
                telefone="4799990000",
                email="joao@laudos.com",
                clinica_id="clinica-inexistente",
                repo=repo,
                clinicas=clinicas,
            )

    def test_rejeita_crmv_duplicado_mesmo_em_clinica_diferente(self) -> None:
        clinicas = ClinicaRepositorioFake([_clinica("clinica-1"), _clinica("clinica-2", "Outra")])
        existente = Veterinario(
            id="vet-1",
            nome="Dr. João Silva",
            crmv="SC-1234",
            telefone="4799990000",
            email="joao@laudos.com",
            clinica_id="clinica-1",
            ativo=True,
        )
        repo = VeterinarioRepositorioFake([existente])

        with pytest.raises(CrmvJaCadastrado):
            cadastrar_veterinario(
                nome="Dr. João Silva Segundo Registro",
                crmv="SC-1234",
                telefone="4799990001",
                email="joao2@laudos.com",
                clinica_id="clinica-2",
                repo=repo,
                clinicas=clinicas,
            )


class TestEditarVeterinario:
    def test_edita_veterinario_existente(self) -> None:
        veterinario = Veterinario(
            id="vet-1",
            nome="Dr. João Silva",
            crmv="SC-1234",
            telefone="4799990000",
            email="joao@laudos.com",
            clinica_id="clinica-1",
            ativo=True,
        )
        repo = VeterinarioRepositorioFake([veterinario])

        atualizado = editar_veterinario(
            veterinario_id="vet-1",
            nome="Dr. João A. Silva",
            telefone="4799990002",
            email="joao.novo@laudos.com",
            repo=repo,
        )

        assert atualizado.nome == "Dr. João A. Silva"
        assert atualizado.email == "joao.novo@laudos.com"
        assert atualizado.crmv == "SC-1234"
        assert atualizado.clinica_id == "clinica-1"

    def test_editar_veterinario_inexistente_levanta_erro(self) -> None:
        repo = VeterinarioRepositorioFake()

        with pytest.raises(VeterinarioNaoEncontrado):
            editar_veterinario(
                veterinario_id="inexistente",
                nome="X",
                telefone="X",
                email="x@x.com",
                repo=repo,
            )


class TestInativarReativarVeterinario:
    def test_inativa_veterinario(self) -> None:
        veterinario = Veterinario(
            id="vet-1",
            nome="Dr. João Silva",
            crmv="SC-1234",
            telefone="4799990000",
            email="joao@laudos.com",
            clinica_id="clinica-1",
            ativo=True,
        )
        repo = VeterinarioRepositorioFake([veterinario])

        inativado = inativar_veterinario("vet-1", repo)

        assert inativado.ativo is False

    def test_reativa_veterinario(self) -> None:
        veterinario = Veterinario(
            id="vet-1",
            nome="Dr. João Silva",
            crmv="SC-1234",
            telefone="4799990000",
            email="joao@laudos.com",
            clinica_id="clinica-1",
            ativo=False,
        )
        repo = VeterinarioRepositorioFake([veterinario])

        reativado = reativar_veterinario("vet-1", repo)

        assert reativado.ativo is True

    def test_inativar_veterinario_inexistente_levanta_erro(self) -> None:
        repo = VeterinarioRepositorioFake()

        with pytest.raises(VeterinarioNaoEncontrado):
            inativar_veterinario("inexistente", repo)


class TestBuscarVeterinarios:
    def _repo(self) -> VeterinarioRepositorioFake:
        return VeterinarioRepositorioFake(
            [
                Veterinario(
                    id="vet-1",
                    nome="Dr. João Silva",
                    crmv="SC-1234",
                    telefone="1",
                    email="a@a.com",
                    clinica_id="clinica-1",
                    ativo=True,
                ),
                Veterinario(
                    id="vet-2",
                    nome="Dra. Maria Souza",
                    crmv="SC-5678",
                    telefone="2",
                    email="b@b.com",
                    clinica_id="clinica-2",
                    ativo=False,
                ),
                Veterinario(
                    id="vet-3",
                    nome="Dr. João Pedro",
                    crmv="SC-9999",
                    telefone="3",
                    email="c@c.com",
                    clinica_id="clinica-1",
                    ativo=True,
                ),
            ]
        )

    def test_busca_por_substring_case_insensitive(self) -> None:
        repo = self._repo()

        resultado = buscar_veterinarios("joão", repo)

        assert {v.id for v in resultado} == {"vet-1", "vet-3"}

    def test_busca_filtra_por_clinica(self) -> None:
        repo = self._repo()

        resultado = buscar_veterinarios("dr", repo, clinica_id="clinica-1")

        assert {v.id for v in resultado} == {"vet-1", "vet-3"}

    def test_busca_filtra_apenas_ativos(self) -> None:
        repo = self._repo()

        resultado = buscar_veterinarios("", repo, apenas_ativos=True)

        assert {v.id for v in resultado} == {"vet-1", "vet-3"}


class TestListarVeterinarios:
    def test_lista_todos(self) -> None:
        repo = VeterinarioRepositorioFake(
            [
                Veterinario(
                    id="vet-1",
                    nome="Dr. João Silva",
                    crmv="SC-1234",
                    telefone="1",
                    email="a@a.com",
                    clinica_id="clinica-1",
                    ativo=True,
                ),
                Veterinario(
                    id="vet-2",
                    nome="Dra. Maria Souza",
                    crmv="SC-5678",
                    telefone="2",
                    email="b@b.com",
                    clinica_id="clinica-2",
                    ativo=False,
                ),
            ]
        )

        assert len(listar_veterinarios(repo)) == 2

    def test_lista_filtrando_ativos_e_clinica(self) -> None:
        repo = VeterinarioRepositorioFake(
            [
                Veterinario(
                    id="vet-1",
                    nome="Dr. João Silva",
                    crmv="SC-1234",
                    telefone="1",
                    email="a@a.com",
                    clinica_id="clinica-1",
                    ativo=True,
                ),
                Veterinario(
                    id="vet-2",
                    nome="Dra. Maria Souza",
                    crmv="SC-5678",
                    telefone="2",
                    email="b@b.com",
                    clinica_id="clinica-1",
                    ativo=False,
                ),
                Veterinario(
                    id="vet-3",
                    nome="Dr. Pedro Alves",
                    crmv="SC-4321",
                    telefone="3",
                    email="c@c.com",
                    clinica_id="clinica-2",
                    ativo=True,
                ),
            ]
        )

        resultado = listar_veterinarios(repo, clinica_id="clinica-1", apenas_ativos=True)

        assert [v.id for v in resultado] == ["vet-1"]
