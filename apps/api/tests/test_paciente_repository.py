import pytest
from sqlalchemy.orm import Session

from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.db import Base, engine, get_session
from vertere_api.pacientes.domain import Paciente
from vertere_api.pacientes.models import PacienteModel
from vertere_api.pacientes.repository import SQLAlchemyPacienteRepository


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(PacienteModel).delete()
    session.query(ClinicaModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(PacienteModel).delete()
    session.query(ClinicaModel).delete()
    session.commit()
    session.close()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


@pytest.fixture
def clinica(session: Session) -> Clinica:
    repo = SQLAlchemyClinicaRepository(session)
    clinica = Clinica(
        id="clinica-1",
        nome="Clínica Central",
        cnpj="11222333000181",
        endereco="Rua A, 123",
        telefone="4730001111",
        email="contato@central.com",
        ativo=True,
    )
    repo.salvar(clinica)
    return clinica


class TestSQLAlchemyPacienteRepository:
    def test_busca_paciente_inexistente_retorna_none(self, session: Session) -> None:
        repo = SQLAlchemyPacienteRepository(session)

        assert repo.buscar_por_id("inexistente") is None

    def test_salvar_insere_paciente_novo_e_buscar_por_id_encontra(
        self, session: Session, clinica: Clinica
    ) -> None:
        repo = SQLAlchemyPacienteRepository(session)
        novo = Paciente(
            id="pac-novo",
            nome="Rex",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=3,
            proprietario="Maria Souza",
            clinica_id=clinica.id,
            ativo=True,
        )

        repo.salvar(novo)
        encontrado = repo.buscar_por_id("pac-novo")

        assert encontrado == novo

    def test_salvar_atualiza_paciente_existente_em_vez_de_duplicar(
        self, session: Session, clinica: Clinica
    ) -> None:
        repo = SQLAlchemyPacienteRepository(session)
        original = Paciente(
            id="pac-existente",
            nome="Rex",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=3,
            proprietario="Maria Souza",
            clinica_id=clinica.id,
            ativo=True,
        )
        repo.salvar(original)

        atualizado = Paciente(
            id="pac-existente",
            nome="Rex",
            especie="Canina",
            raca="Labrador",
            sexo="M",
            idade=3,
            proprietario="Maria Souza",
            clinica_id=clinica.id,
            ativo=False,
        )
        repo.salvar(atualizado)

        assert repo.buscar_por_id("pac-existente").ativo is False
        assert session.query(PacienteModel).count() == 1

    def test_listar_todas_retorna_pacientes_persistidos(
        self, session: Session, clinica: Clinica
    ) -> None:
        repo = SQLAlchemyPacienteRepository(session)
        repo.salvar(
            Paciente(
                id="1", nome="Rex", especie="Canina", raca="Labrador", sexo="M",
                idade=3, proprietario="Maria Souza", clinica_id=clinica.id, ativo=True,
            )
        )
        repo.salvar(
            Paciente(
                id="2", nome="Mimi", especie="Felina", raca="Siamês", sexo="F",
                idade=2, proprietario="João Pedro", clinica_id=clinica.id, ativo=True,
            )
        )

        assert len(repo.listar_todas()) == 2
