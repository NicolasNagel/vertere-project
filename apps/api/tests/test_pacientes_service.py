import pytest

from vertere_api.auth.domain import Papel, Usuario
from vertere_api.clinicas.domain import Clinica
from vertere_api.pacientes.domain import Paciente
from vertere_api.pacientes.service import (
    ClinicaInexistente,
    PacienteNaoEncontrado,
    buscar_paciente,
    buscar_pacientes,
    cadastrar_paciente,
    editar_paciente,
    inativar_paciente,
    listar_pacientes,
    reativar_paciente,
)


def _usuario(papel: Papel = Papel.ADMIN, clinica_id: str | None = None) -> Usuario:
    return Usuario(
        id="usuario-1", email="u@vertere.com", senha_hash="hash", papel=papel, ativo=True, clinica_id=clinica_id
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


class PacienteRepositorioFake:
    def __init__(self, pacientes: list[Paciente] | None = None) -> None:
        self._por_id = {p.id: p for p in (pacientes or [])}

    def buscar_por_id(self, paciente_id: str) -> Paciente | None:
        return self._por_id.get(paciente_id)

    def listar_todas(self) -> list[Paciente]:
        return list(self._por_id.values())

    def salvar(self, paciente: Paciente) -> None:
        self._por_id[paciente.id] = paciente


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


class TestCadastrarPaciente:
    def test_cadastra_paciente_com_dados_completos(self) -> None:
        clinicas = ClinicaRepositorioFake([_clinica()])
        repo = PacienteRepositorioFake()

        paciente = cadastrar_paciente(
            nome="Rex",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=3,
            proprietario="Maria Souza",
            clinica_id="clinica-1",
            repo=repo,
            clinicas=clinicas,
        )

        assert paciente.nome == "Rex"
        assert paciente.clinica_id == "clinica-1"
        assert paciente.proprietario == "Maria Souza"
        assert paciente.ativo is True
        assert repo.buscar_por_id(paciente.id) == paciente

    def test_rejeita_clinica_inexistente(self) -> None:
        clinicas = ClinicaRepositorioFake()
        repo = PacienteRepositorioFake()

        with pytest.raises(ClinicaInexistente):
            cadastrar_paciente(
                nome="Rex",
                especie="Canina",
                raca="Labrador",
                sexo="M",
                idade=3,
                proprietario="Maria Souza",
                clinica_id="clinica-inexistente",
                repo=repo,
                clinicas=clinicas,
            )

    def test_permite_dois_pacientes_com_mesmo_nome(self) -> None:
        clinicas = ClinicaRepositorioFake([_clinica()])
        repo = PacienteRepositorioFake()
        cadastrar_paciente(
            nome="Rex",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=3,
            proprietario="Maria Souza",
            clinica_id="clinica-1",
            repo=repo,
            clinicas=clinicas,
        )

        segundo = cadastrar_paciente(
            nome="Rex",
            especie="Canina",
            raca="Vira-lata",
            sexo="M",
            idade=1,
            proprietario="João Pedro",
            clinica_id="clinica-1",
            repo=repo,
            clinicas=clinicas,
        )

        assert len(repo.listar_todas()) == 2
        assert segundo.proprietario == "João Pedro"


class TestEditarPaciente:
    def test_edita_paciente_existente(self) -> None:
        paciente = Paciente(
            id="pac-1",
            nome="Rex",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=3,
            proprietario="Maria Souza",
            clinica_id="clinica-1",
            ativo=True,
        )
        repo = PacienteRepositorioFake([paciente])

        atualizado = editar_paciente(
            paciente_id="pac-1",
            nome="Rex II",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=4,
            proprietario="Maria S. Souza",
            repo=repo,
        )

        assert atualizado.nome == "Rex II"
        assert atualizado.idade == 4
        assert atualizado.proprietario == "Maria S. Souza"
        assert atualizado.clinica_id == "clinica-1"

    def test_editar_paciente_inexistente_levanta_erro(self) -> None:
        repo = PacienteRepositorioFake()

        with pytest.raises(PacienteNaoEncontrado):
            editar_paciente(
                paciente_id="inexistente",
                nome="X",
                especie="X",
                raca="X",
                sexo="X",
                idade=1,
                proprietario="X",
                repo=repo,
            )


class TestInativarReativarPaciente:
    def test_inativa_paciente(self) -> None:
        paciente = Paciente(
            id="pac-1",
            nome="Rex",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=3,
            proprietario="Maria Souza",
            clinica_id="clinica-1",
            ativo=True,
        )
        repo = PacienteRepositorioFake([paciente])

        inativado = inativar_paciente("pac-1", repo)

        assert inativado.ativo is False

    def test_reativa_paciente(self) -> None:
        paciente = Paciente(
            id="pac-1",
            nome="Rex",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=3,
            proprietario="Maria Souza",
            clinica_id="clinica-1",
            ativo=False,
        )
        repo = PacienteRepositorioFake([paciente])

        reativado = reativar_paciente("pac-1", repo)

        assert reativado.ativo is True

    def test_inativar_paciente_inexistente_levanta_erro(self) -> None:
        repo = PacienteRepositorioFake()

        with pytest.raises(PacienteNaoEncontrado):
            inativar_paciente("inexistente", repo)


class TestBuscarPacientes:
    def _repo(self) -> PacienteRepositorioFake:
        return PacienteRepositorioFake(
            [
                Paciente(
                    id="pac-1",
                    nome="Rex",
                    especie="Canina",
                    raca="Labrador",
                    sexo="M",
                    idade=3,
                    proprietario="Maria Souza",
                    clinica_id="clinica-1",
                    ativo=True,
                ),
                Paciente(
                    id="pac-2",
                    nome="Mimi",
                    especie="Felina",
                    raca="Siamês",
                    sexo="F",
                    idade=2,
                    proprietario="João Pedro",
                    clinica_id="clinica-2",
                    ativo=False,
                ),
                Paciente(
                    id="pac-3",
                    nome="Rex",
                    especie="Canina",
                    raca="Vira-lata",
                    sexo="M",
                    idade=1,
                    proprietario="João Pedro",
                    clinica_id="clinica-1",
                    ativo=True,
                ),
            ]
        )

    def test_busca_por_substring_case_insensitive(self) -> None:
        repo = self._repo()

        resultado = buscar_pacientes("rex", repo, _usuario())

        assert {p.id for p in resultado} == {"pac-1", "pac-3"}

    def test_busca_filtra_por_clinica(self) -> None:
        repo = self._repo()

        resultado = buscar_pacientes("", repo, _usuario(), clinica_id="clinica-1")

        assert {p.id for p in resultado} == {"pac-1", "pac-3"}

    def test_busca_filtra_por_proprietario(self) -> None:
        repo = self._repo()

        resultado = buscar_pacientes("", repo, _usuario(), proprietario="joão")

        assert {p.id for p in resultado} == {"pac-2", "pac-3"}

    def test_busca_combina_clinica_e_proprietario(self) -> None:
        repo = self._repo()

        resultado = buscar_pacientes("", repo, _usuario(), clinica_id="clinica-1", proprietario="joão")

        assert {p.id for p in resultado} == {"pac-3"}

    def test_busca_filtra_apenas_ativos(self) -> None:
        repo = self._repo()

        resultado = buscar_pacientes("", repo, _usuario(), apenas_ativos=True)

        assert {p.id for p in resultado} == {"pac-1", "pac-3"}

    def test_busca_com_usuario_clinica_ignora_clinica_id_informado(self) -> None:
        repo = self._repo()

        resultado = buscar_pacientes(
            "", repo, _usuario(Papel.CLINICA, clinica_id="clinica-2"), clinica_id="clinica-1"
        )

        assert {p.id for p in resultado} == {"pac-2"}


class TestListarPacientes:
    def test_lista_todos(self) -> None:
        repo = PacienteRepositorioFake(
            [
                Paciente(
                    id="pac-1", nome="Rex", especie="Canina", raca="Labrador", sexo="M",
                    idade=3, proprietario="Maria Souza", clinica_id="clinica-1", ativo=True,
                ),
                Paciente(
                    id="pac-2", nome="Mimi", especie="Felina", raca="Siamês", sexo="F",
                    idade=2, proprietario="João Pedro", clinica_id="clinica-2", ativo=False,
                ),
            ]
        )

        assert len(listar_pacientes(repo, _usuario())) == 2

    def test_lista_filtrando_ativos_e_clinica(self) -> None:
        repo = PacienteRepositorioFake(
            [
                Paciente(
                    id="pac-1", nome="Rex", especie="Canina", raca="Labrador", sexo="M",
                    idade=3, proprietario="Maria Souza", clinica_id="clinica-1", ativo=True,
                ),
                Paciente(
                    id="pac-2", nome="Mimi", especie="Felina", raca="Siamês", sexo="F",
                    idade=2, proprietario="João Pedro", clinica_id="clinica-1", ativo=False,
                ),
                Paciente(
                    id="pac-3", nome="Bidu", especie="Canina", raca="Vira-lata", sexo="M",
                    idade=5, proprietario="Ana Lima", clinica_id="clinica-2", ativo=True,
                ),
            ]
        )

        resultado = listar_pacientes(repo, _usuario(), clinica_id="clinica-1", apenas_ativos=True)

        assert [p.id for p in resultado] == ["pac-1"]

    def test_lista_com_usuario_clinica_ignora_clinica_id_informado(self) -> None:
        repo = PacienteRepositorioFake(
            [
                Paciente(
                    id="pac-1", nome="Rex", especie="Canina", raca="Labrador", sexo="M",
                    idade=3, proprietario="Maria Souza", clinica_id="clinica-1", ativo=True,
                ),
                Paciente(
                    id="pac-2", nome="Mimi", especie="Felina", raca="Siamês", sexo="F",
                    idade=2, proprietario="João Pedro", clinica_id="clinica-2", ativo=True,
                ),
            ]
        )

        resultado = listar_pacientes(
            repo, _usuario(Papel.CLINICA, clinica_id="clinica-2"), clinica_id="clinica-1"
        )

        assert [p.id for p in resultado] == ["pac-2"]


class TestBuscarPaciente:
    def _repo(self) -> PacienteRepositorioFake:
        return PacienteRepositorioFake(
            [
                Paciente(
                    id="pac-1", nome="Rex", especie="Canina", raca="Labrador", sexo="M",
                    idade=3, proprietario="Maria Souza", clinica_id="clinica-1", ativo=True,
                )
            ]
        )

    def test_admin_ve_qualquer_paciente(self) -> None:
        repo = self._repo()

        paciente = buscar_paciente("pac-1", _usuario(Papel.ADMIN), repo)

        assert paciente.id == "pac-1"

    @pytest.mark.parametrize("papel", [Papel.ATENDENTE, Papel.TECNICO])
    def test_papel_interno_ve_qualquer_paciente(self, papel: Papel) -> None:
        repo = self._repo()

        paciente = buscar_paciente("pac-1", _usuario(papel), repo)

        assert paciente.id == "pac-1"

    def test_clinica_ve_paciente_da_propria_clinica(self) -> None:
        repo = self._repo()

        paciente = buscar_paciente("pac-1", _usuario(Papel.CLINICA, clinica_id="clinica-1"), repo)

        assert paciente.id == "pac-1"

    def test_clinica_nao_ve_paciente_de_outra_clinica(self) -> None:
        repo = self._repo()

        with pytest.raises(PacienteNaoEncontrado):
            buscar_paciente("pac-1", _usuario(Papel.CLINICA, clinica_id="clinica-2"), repo)

    def test_paciente_inexistente_levanta_erro(self) -> None:
        repo = self._repo()

        with pytest.raises(PacienteNaoEncontrado):
            buscar_paciente("inexistente", _usuario(Papel.ADMIN), repo)
