import pytest
from sqlalchemy.orm import Session

from vertere_api.auth.domain import Papel, Usuario
from vertere_api.auth.models import UsuarioModel
from vertere_api.auth.repository import SQLAlchemyUsuarioRepository
from vertere_api.auth.service import hash_senha
from vertere_api.db import Base, engine, get_session


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


class TestSQLAlchemyUsuarioRepository:
    def test_busca_usuario_existente_por_email(self, session: Session) -> None:
        modelo = UsuarioModel(
            email="admin@vertere.com",
            senha_hash=hash_senha("senha-correta"),
            papel=Papel.ADMIN,
            ativo=True,
        )
        session.add(modelo)
        session.commit()

        repo = SQLAlchemyUsuarioRepository(session)
        usuario = repo.buscar_por_email("admin@vertere.com")

        assert usuario is not None
        assert isinstance(usuario, Usuario)
        assert usuario.email == "admin@vertere.com"
        assert usuario.papel == Papel.ADMIN
        assert usuario.ativo is True

    def test_busca_usuario_inexistente_retorna_none(self, session: Session) -> None:
        repo = SQLAlchemyUsuarioRepository(session)

        assert repo.buscar_por_email("ninguem@vertere.com") is None

    def test_preserva_clinica_id_para_usuario_do_papel_clinica(
        self, session: Session
    ) -> None:
        modelo = UsuarioModel(
            email="clinica-a@vertere.com",
            senha_hash=hash_senha("senha-correta"),
            papel=Papel.CLINICA,
            ativo=True,
            clinica_id="clinica-a",
        )
        session.add(modelo)
        session.commit()

        repo = SQLAlchemyUsuarioRepository(session)
        usuario = repo.buscar_por_email("clinica-a@vertere.com")

        assert usuario is not None
        assert usuario.clinica_id == "clinica-a"

    def test_authenticate_funciona_de_ponta_a_ponta_com_repositorio_real(
        self, session: Session
    ) -> None:
        from vertere_api.auth.service import authenticate

        modelo = UsuarioModel(
            email="atendente@vertere.com",
            senha_hash=hash_senha("senha-correta"),
            papel=Papel.ATENDENTE,
            ativo=True,
        )
        session.add(modelo)
        session.commit()

        repo = SQLAlchemyUsuarioRepository(session)
        usuario = authenticate("atendente@vertere.com", "senha-correta", repo)

        assert usuario.papel == Papel.ATENDENTE

    def test_salvar_insere_usuario_novo_e_buscar_por_id_encontra(
        self, session: Session
    ) -> None:
        repo = SQLAlchemyUsuarioRepository(session)
        novo = Usuario(
            id="id-novo",
            email="novo@vertere.com",
            senha_hash=hash_senha("senha-correta"),
            papel=Papel.TECNICO,
            ativo=True,
        )

        repo.salvar(novo)
        encontrado = repo.buscar_por_id("id-novo")

        assert encontrado == novo

    def test_salvar_atualiza_usuario_existente_em_vez_de_duplicar(
        self, session: Session
    ) -> None:
        repo = SQLAlchemyUsuarioRepository(session)
        original = Usuario(
            id="id-existente",
            email="original@vertere.com",
            senha_hash=hash_senha("senha-correta"),
            papel=Papel.ATENDENTE,
            ativo=True,
        )
        repo.salvar(original)

        atualizado = Usuario(
            id="id-existente",
            email="original@vertere.com",
            senha_hash=original.senha_hash,
            papel=Papel.ATENDENTE,
            ativo=False,
        )
        repo.salvar(atualizado)

        assert repo.buscar_por_id("id-existente").ativo is False
        assert session.query(UsuarioModel).count() == 1
