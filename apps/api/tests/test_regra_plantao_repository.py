from datetime import time
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from vertere_api.db import Base, engine, get_session
from vertere_api.exames.domain import RegraPlantao
from vertere_api.exames.models import RegraPlantaoModel
from vertere_api.exames.repository import SQLAlchemyRegraPlantaoRepository


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(RegraPlantaoModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(RegraPlantaoModel).delete()
    session.commit()
    session.close()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


class TestSQLAlchemyRegraPlantaoRepository:
    def test_busca_regra_inexistente_retorna_none(self, session: Session) -> None:
        repo = SQLAlchemyRegraPlantaoRepository(session)

        assert repo.buscar_por_id("inexistente") is None

    def test_salvar_insere_regra_nova_e_buscar_por_id_encontra(self, session: Session) -> None:
        repo = SQLAlchemyRegraPlantaoRepository(session)
        nova = RegraPlantao(
            id="regra-1",
            dia_semana=4,
            hora_inicio=time(18, 0),
            hora_fim=time(6, 0),
            valor_adicional=Decimal("50.00"),
            ativo=True,
        )

        repo.salvar(nova)
        encontrada = repo.buscar_por_id("regra-1")

        assert encontrada == nova

    def test_salvar_atualiza_regra_existente_em_vez_de_duplicar(self, session: Session) -> None:
        repo = SQLAlchemyRegraPlantaoRepository(session)
        original = RegraPlantao(
            id="regra-1",
            dia_semana=4,
            hora_inicio=time(18, 0),
            hora_fim=time(6, 0),
            valor_adicional=Decimal("50.00"),
            ativo=True,
        )
        repo.salvar(original)

        atualizada = RegraPlantao(
            id="regra-1",
            dia_semana=4,
            hora_inicio=time(18, 0),
            hora_fim=time(6, 0),
            valor_adicional=Decimal("50.00"),
            ativo=False,
        )
        repo.salvar(atualizada)

        assert repo.buscar_por_id("regra-1").ativo is False
        assert session.query(RegraPlantaoModel).count() == 1

    def test_listar_todas_retorna_regras_persistidas(self, session: Session) -> None:
        repo = SQLAlchemyRegraPlantaoRepository(session)
        repo.salvar(
            RegraPlantao(
                id="1",
                dia_semana=0,
                hora_inicio=time(0, 0),
                hora_fim=time(1, 0),
                valor_adicional=Decimal("10.00"),
                ativo=True,
            )
        )
        repo.salvar(
            RegraPlantao(
                id="2",
                dia_semana=1,
                hora_inicio=time(0, 0),
                hora_fim=time(1, 0),
                valor_adicional=Decimal("20.00"),
                ativo=True,
            )
        )

        assert len(repo.listar_todas()) == 2
