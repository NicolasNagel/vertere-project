import pytest
from sqlalchemy.orm import Session

from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.db import Base, engine, get_session


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(ClinicaModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(ClinicaModel).delete()
    session.commit()
    session.close()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


class TestSQLAlchemyClinicaRepository:
    def test_busca_clinica_existente_por_cnpj(self, session: Session) -> None:
        modelo = ClinicaModel(
            nome="Clínica Central",
            cnpj="11222333000181",
            endereco="Rua A, 123",
            telefone="4730001111",
            email="contato@central.com",
            ativo=True,
        )
        session.add(modelo)
        session.commit()

        repo = SQLAlchemyClinicaRepository(session)
        clinica = repo.buscar_por_cnpj("11222333000181")

        assert clinica is not None
        assert isinstance(clinica, Clinica)
        assert clinica.nome == "Clínica Central"
        assert clinica.ativo is True

    def test_busca_clinica_inexistente_retorna_none(self, session: Session) -> None:
        repo = SQLAlchemyClinicaRepository(session)

        assert repo.buscar_por_cnpj("00000000000000") is None

    def test_salvar_insere_clinica_nova_e_buscar_por_id_encontra(
        self, session: Session
    ) -> None:
        repo = SQLAlchemyClinicaRepository(session)
        nova = Clinica(
            id="id-novo",
            nome="Vet Norte",
            cnpj="22333444000199",
            endereco="Rua B, 456",
            telefone="4730002222",
            email="contato@vetnorte.com",
            ativo=True,
        )

        repo.salvar(nova)
        encontrada = repo.buscar_por_id("id-novo")

        assert encontrada == nova

    def test_salvar_atualiza_clinica_existente_em_vez_de_duplicar(
        self, session: Session
    ) -> None:
        repo = SQLAlchemyClinicaRepository(session)
        original = Clinica(
            id="id-existente",
            nome="Clínica Original",
            cnpj="33444555000100",
            endereco="Rua C",
            telefone="1",
            email="a@a.com",
            ativo=True,
        )
        repo.salvar(original)

        atualizada = Clinica(
            id="id-existente",
            nome="Clínica Original",
            cnpj="33444555000100",
            endereco="Rua C",
            telefone="1",
            email="a@a.com",
            ativo=False,
        )
        repo.salvar(atualizada)

        assert repo.buscar_por_id("id-existente").ativo is False
        assert session.query(ClinicaModel).count() == 1

    def test_listar_todas_retorna_clinicas_persistidas(self, session: Session) -> None:
        repo = SQLAlchemyClinicaRepository(session)
        repo.salvar(
            Clinica(
                id="1", nome="A", cnpj="1", endereco="A", telefone="1",
                email="a@a.com", ativo=True,
            )
        )
        repo.salvar(
            Clinica(
                id="2", nome="B", cnpj="2", endereco="B", telefone="2",
                email="b@b.com", ativo=True,
            )
        )

        assert len(repo.listar_todas()) == 2
