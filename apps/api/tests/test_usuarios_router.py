import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from vertere_api.auth import sessoes_store
from vertere_api.auth.domain import Papel
from vertere_api.auth.models import UsuarioModel
from vertere_api.auth.service import hash_senha
from vertere_api.db import Base, engine, get_session
from vertere_api.main import app


@pytest.fixture(autouse=True)
def _tabela_e_sessoes_limpas():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()
    sessoes_store.limpar_sessoes()
    yield
    session = get_session()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()
    sessoes_store.limpar_sessoes()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


@pytest.fixture
def cliente() -> TestClient:
    return TestClient(app)


def _criar_usuario_db(session: Session, email: str, papel: Papel, senha: str = "senha-correta") -> str:
    modelo = UsuarioModel(email=email, senha_hash=hash_senha(senha), papel=papel, ativo=True)
    session.add(modelo)
    session.commit()
    session.refresh(modelo)
    return modelo.id


def _token(cliente: TestClient, email: str, senha: str = "senha-correta") -> str:
    resposta = cliente.post("/auth/login", json={"email": email, "senha": senha})
    return resposta.json()["access_token"]


class TestCriarUsuarioEndpoint:
    def test_admin_cria_usuario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/usuarios",
            json={"email": "novo@vertere.com", "senha": "senha-123", "papel": "atendente"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 201
        assert resposta.json()["email"] == "novo@vertere.com"
        assert resposta.json()["papel"] == "atendente"

    def test_email_duplicado_retorna_409(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "existente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/usuarios",
            json={"email": "existente@vertere.com", "senha": "senha-123", "papel": "atendente"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 409

    def test_atendente_nao_pode_criar_usuario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            "/usuarios",
            json={"email": "novo@vertere.com", "senha": "senha-123", "papel": "atendente"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 403


class TestEditarPapelEndpoint:
    def test_admin_edita_papel(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        alvo_id = _criar_usuario_db(session, "alvo@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.patch(
            f"/usuarios/{alvo_id}/papel",
            json={"papel": "tecnico"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json()["papel"] == "tecnico"

    def test_editar_papel_de_usuario_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.patch(
            "/usuarios/00000000-0000-0000-0000-000000000000/papel",
            json={"papel": "tecnico"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404


class TestDesativarReativarEndpoint:
    def test_admin_desativa_e_reativa_usuario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        alvo_id = _criar_usuario_db(session, "alvo@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "admin@vertere.com")

        desativado = cliente.post(
            f"/usuarios/{alvo_id}/desativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert desativado.status_code == 200
        assert desativado.json()["ativo"] is False

        reativado = cliente.post(
            f"/usuarios/{alvo_id}/reativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert reativado.status_code == 200
        assert reativado.json()["ativo"] is True

    def test_usuario_desativado_nao_consegue_mais_logar(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        alvo_id = _criar_usuario_db(session, "alvo@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")

        cliente.post(f"/usuarios/{alvo_id}/desativar", headers={"Authorization": f"Bearer {token_admin}"})

        login_negado = cliente.post(
            "/auth/login", json={"email": "alvo@vertere.com", "senha": "senha-correta"}
        )
        assert login_negado.status_code == 401


class TestResetarSenhaEndpoint:
    def test_admin_reseta_senha_e_usuario_loga_com_a_nova(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        alvo_id = _criar_usuario_db(session, "alvo@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            f"/usuarios/{alvo_id}/resetar-senha",
            json={"nova_senha": "senha-nova-temp"},
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert resposta.status_code == 200

        login_com_nova_senha = cliente.post(
            "/auth/login", json={"email": "alvo@vertere.com", "senha": "senha-nova-temp"}
        )
        assert login_com_nova_senha.status_code == 200

        login_com_senha_antiga = cliente.post(
            "/auth/login", json={"email": "alvo@vertere.com", "senha": "senha-correta"}
        )
        assert login_com_senha_antiga.status_code == 401
