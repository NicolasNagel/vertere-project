import pytest
from sqlalchemy.orm import Session

from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.db import Base, engine, get_session
from vertere_api.veterinarios.domain import Veterinario
from vertere_api.veterinarios.models import VeterinarioModel
from vertere_api.veterinarios.repository import SQLAlchemyVeterinarioRepository


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(VeterinarioModel).delete()
    session.query(ClinicaModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(VeterinarioModel).delete()
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


class TestSQLAlchemyVeterinarioRepository:
    def test_busca_veterinario_existente_por_crmv(
        self, session: Session, clinica: Clinica
    ) -> None:
        modelo = VeterinarioModel(
            nome="Dr. João Silva",
            crmv="SC-1234",
            telefone="4799990000",
            email="joao@laudos.com",
            clinica_id=clinica.id,
            ativo=True,
        )
        session.add(modelo)
        session.commit()

        repo = SQLAlchemyVeterinarioRepository(session)
        veterinario = repo.buscar_por_crmv("SC-1234")

        assert veterinario is not None
        assert isinstance(veterinario, Veterinario)
        assert veterinario.nome == "Dr. João Silva"
        assert veterinario.clinica_id == clinica.id

    def test_busca_veterinario_inexistente_retorna_none(self, session: Session) -> None:
        repo = SQLAlchemyVeterinarioRepository(session)

        assert repo.buscar_por_crmv("SC-0000") is None

    def test_salvar_insere_veterinario_novo_e_buscar_por_id_encontra(
        self, session: Session, clinica: Clinica
    ) -> None:
        repo = SQLAlchemyVeterinarioRepository(session)
        novo = Veterinario(
            id="vet-novo",
            nome="Dra. Maria Souza",
            crmv="SC-5678",
            telefone="4730002222",
            email="maria@laudos.com",
            clinica_id=clinica.id,
            ativo=True,
        )

        repo.salvar(novo)
        encontrado = repo.buscar_por_id("vet-novo")

        assert encontrado == novo

    def test_salvar_atualiza_veterinario_existente_em_vez_de_duplicar(
        self, session: Session, clinica: Clinica
    ) -> None:
        repo = SQLAlchemyVeterinarioRepository(session)
        original = Veterinario(
            id="vet-existente",
            nome="Dr. Original",
            crmv="SC-9999",
            telefone="1",
            email="a@a.com",
            clinica_id=clinica.id,
            ativo=True,
        )
        repo.salvar(original)

        atualizado = Veterinario(
            id="vet-existente",
            nome="Dr. Original",
            crmv="SC-9999",
            telefone="1",
            email="a@a.com",
            clinica_id=clinica.id,
            ativo=False,
        )
        repo.salvar(atualizado)

        assert repo.buscar_por_id("vet-existente").ativo is False
        assert session.query(VeterinarioModel).count() == 1

    def test_listar_todas_retorna_veterinarios_persistidos(
        self, session: Session, clinica: Clinica
    ) -> None:
        repo = SQLAlchemyVeterinarioRepository(session)
        repo.salvar(
            Veterinario(
                id="1", nome="A", crmv="A", telefone="1", email="a@a.com",
                clinica_id=clinica.id, ativo=True,
            )
        )
        repo.salvar(
            Veterinario(
                id="2", nome="B", crmv="B", telefone="2", email="b@b.com",
                clinica_id=clinica.id, ativo=True,
            )
        )

        assert len(repo.listar_todas()) == 2
