import pytest
from sqlalchemy.orm import Session

from vertere_api.db import Base, engine, get_session
from vertere_api.laudos.domain import CampoTemplate, TemplateLaudo
from vertere_api.laudos.models import TemplateLaudoModel
from vertere_api.laudos.repository import SQLAlchemyTemplateLaudoRepository


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(TemplateLaudoModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(TemplateLaudoModel).delete()
    session.commit()
    session.close()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


def _template() -> TemplateLaudo:
    return TemplateLaudo(
        id="tpl-1",
        categoria="Hematologia",
        campos=[
            CampoTemplate(nome="Hemácias", unidade="milhões/µL", faixa_referencia="5.5 – 8.5"),
            CampoTemplate(nome="Leucócitos", unidade=None, faixa_referencia=None),
        ],
        ativo=True,
    )


class TestSQLAlchemyTemplateLaudoRepository:
    def test_busca_template_inexistente_retorna_none(self, session: Session) -> None:
        repo = SQLAlchemyTemplateLaudoRepository(session)

        assert repo.buscar_por_id("inexistente") is None

    def test_salvar_insere_e_buscar_por_id_encontra(self, session: Session) -> None:
        repo = SQLAlchemyTemplateLaudoRepository(session)
        template = _template()

        repo.salvar(template)
        encontrado = repo.buscar_por_id("tpl-1")

        assert encontrado == template

    def test_salvar_atualiza_template_existente_em_vez_de_duplicar(self, session: Session) -> None:
        repo = SQLAlchemyTemplateLaudoRepository(session)
        repo.salvar(_template())

        atualizado = TemplateLaudo(id="tpl-1", categoria="Hematologia", campos=[], ativo=False)
        repo.salvar(atualizado)

        assert repo.buscar_por_id("tpl-1").ativo is False
        assert session.query(TemplateLaudoModel).count() == 1

    def test_listar_todas_retorna_templates_persistidos(self, session: Session) -> None:
        repo = SQLAlchemyTemplateLaudoRepository(session)
        repo.salvar(_template())
        repo.salvar(TemplateLaudo(id="tpl-2", categoria="Bioquímica", campos=[], ativo=True))

        assert len(repo.listar_todas()) == 2
