from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.financeiro.domain import Fechamento
from vertere_api.financeiro.models import FechamentoModel
from vertere_api.financeiro.repository import SQLAlchemyFechamentoRepository
from vertere_api.db import Base, engine, get_session


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(FechamentoModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(FechamentoModel).delete()
    session.commit()
    session.close()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


def _clinica_persistida(session: Session, id: str = "clinica-1") -> Clinica:
    clinica = Clinica(
        id=id,
        nome="Clínica Central",
        cnpj=f"1122233300{id[-4:]}",
        endereco="Rua A, 123",
        telefone="47999990000",
        email="contato@clinica.com",
        ativo=True,
    )
    SQLAlchemyClinicaRepository(session).salvar(clinica)
    return clinica


class TestSQLAlchemyFechamentoRepository:
    def test_salvar_insere_e_buscar_por_id_encontra(self, session: Session) -> None:
        _clinica_persistida(session)
        repo = SQLAlchemyFechamentoRepository(session)
        fechamento = Fechamento(
            id="fechamento-1",
            clinica_id="clinica-1",
            ano=2026,
            mes=9,
            valor_total=Decimal("150.00"),
            quantidade_atendimentos=2,
            data_fechamento=datetime(2026, 10, 1, 8, 0),
            pago=False,
            data_pagamento=None,
        )

        repo.salvar(fechamento)
        encontrado = repo.buscar_por_id("fechamento-1")

        assert encontrado == fechamento

    def test_buscar_por_clinica_periodo_encontra(self, session: Session) -> None:
        _clinica_persistida(session)
        repo = SQLAlchemyFechamentoRepository(session)
        fechamento = Fechamento(
            id="fechamento-1",
            clinica_id="clinica-1",
            ano=2026,
            mes=9,
            valor_total=Decimal("150.00"),
            quantidade_atendimentos=2,
            data_fechamento=datetime(2026, 10, 1, 8, 0),
            pago=False,
            data_pagamento=None,
        )
        repo.salvar(fechamento)

        encontrado = repo.buscar_por_clinica_periodo("clinica-1", 2026, 9)

        assert encontrado == fechamento
        assert repo.buscar_por_clinica_periodo("clinica-1", 2026, 8) is None

    def test_salvar_atualiza_fechamento_existente_em_vez_de_duplicar(self, session: Session) -> None:
        _clinica_persistida(session)
        repo = SQLAlchemyFechamentoRepository(session)
        original = Fechamento(
            id="fechamento-1",
            clinica_id="clinica-1",
            ano=2026,
            mes=9,
            valor_total=Decimal("150.00"),
            quantidade_atendimentos=2,
            data_fechamento=datetime(2026, 10, 1, 8, 0),
            pago=False,
            data_pagamento=None,
        )
        repo.salvar(original)

        pago = Fechamento(
            id="fechamento-1",
            clinica_id="clinica-1",
            ano=2026,
            mes=9,
            valor_total=Decimal("150.00"),
            quantidade_atendimentos=2,
            data_fechamento=datetime(2026, 10, 1, 8, 0),
            pago=True,
            data_pagamento=datetime(2026, 10, 5, 9, 0),
        )
        repo.salvar(pago)

        assert repo.buscar_por_id("fechamento-1").pago is True
        assert session.query(FechamentoModel).count() == 1

    def test_listar_todas_retorna_fechamentos_persistidos(self, session: Session) -> None:
        _clinica_persistida(session, id="clinica-1")
        _clinica_persistida(session, id="clinica-2")
        repo = SQLAlchemyFechamentoRepository(session)
        repo.salvar(
            Fechamento(
                id="f1",
                clinica_id="clinica-1",
                ano=2026,
                mes=9,
                valor_total=Decimal("100.00"),
                quantidade_atendimentos=1,
                data_fechamento=datetime(2026, 10, 1),
                pago=False,
                data_pagamento=None,
            )
        )
        repo.salvar(
            Fechamento(
                id="f2",
                clinica_id="clinica-2",
                ano=2026,
                mes=9,
                valor_total=Decimal("200.00"),
                quantidade_atendimentos=2,
                data_fechamento=datetime(2026, 10, 1),
                pago=False,
                data_pagamento=None,
            )
        )

        assert len(repo.listar_todas()) == 2
