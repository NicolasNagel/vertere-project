from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from vertere_api.db import Base, engine, get_session
from vertere_api.exames.domain import Exame
from vertere_api.exames.models import ExameModel
from vertere_api.exames.repository import SQLAlchemyExameRepository


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(ExameModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(ExameModel).delete()
    session.commit()
    session.close()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


class TestSQLAlchemyExameRepository:
    def test_busca_exame_inexistente_retorna_none(self, session: Session) -> None:
        repo = SQLAlchemyExameRepository(session)

        assert repo.buscar_por_id("inexistente") is None

    def test_salvar_insere_exame_novo_e_buscar_por_id_encontra(self, session: Session) -> None:
        repo = SQLAlchemyExameRepository(session)
        novo = Exame(
            id="exame-1",
            categoria="Hematologia",
            nome="Hemograma",
            preco_base=Decimal("45.00"),
            ativo=True,
        )

        repo.salvar(novo)
        encontrado = repo.buscar_por_id("exame-1")

        assert encontrado == novo

    def test_salvar_atualiza_exame_existente_em_vez_de_duplicar(self, session: Session) -> None:
        repo = SQLAlchemyExameRepository(session)
        original = Exame(
            id="exame-1",
            categoria="Hematologia",
            nome="Hemograma",
            preco_base=Decimal("45.00"),
            ativo=True,
        )
        repo.salvar(original)

        atualizado = Exame(
            id="exame-1",
            categoria="Hematologia",
            nome="Hemograma",
            preco_base=Decimal("45.00"),
            ativo=False,
        )
        repo.salvar(atualizado)

        assert repo.buscar_por_id("exame-1").ativo is False
        assert session.query(ExameModel).count() == 1

    def test_listar_todas_retorna_exames_persistidos(self, session: Session) -> None:
        repo = SQLAlchemyExameRepository(session)
        repo.salvar(
            Exame(
                id="1", categoria="A", nome="A", preco_base=Decimal("10.00"), ativo=True
            )
        )
        repo.salvar(
            Exame(
                id="2", categoria="B", nome="B", preco_base=Decimal("20.00"), ativo=True
            )
        )

        assert len(repo.listar_todas()) == 2
