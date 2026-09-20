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


def _criar_usuario(session: Session, email: str, papel: Papel, senha: str = "senha-correta") -> None:
    session.add(
        UsuarioModel(email=email, senha_hash=hash_senha(senha), papel=papel, ativo=True)
    )
    session.commit()


class TestLogin:
    def test_login_com_credenciais_validas_retorna_token(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario(session, "admin@vertere.com", Papel.ADMIN)

        resposta = cliente.post(
            "/auth/login", json={"email": "admin@vertere.com", "senha": "senha-correta"}
        )

        assert resposta.status_code == 200
        assert resposta.json()["access_token"]

    def test_login_com_senha_errada_retorna_401(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario(session, "admin@vertere.com", Papel.ADMIN)

        resposta = cliente.post(
            "/auth/login", json={"email": "admin@vertere.com", "senha": "senha-errada"}
        )

        assert resposta.status_code == 401

    def test_login_de_usuario_inativo_retorna_401(
        self, cliente: TestClient, session: Session
    ) -> None:
        session.add(
            UsuarioModel(
                email="inativo@vertere.com",
                senha_hash=hash_senha("senha-correta"),
                papel=Papel.ATENDENTE,
                ativo=False,
            )
        )
        session.commit()

        resposta = cliente.post(
            "/auth/login", json={"email": "inativo@vertere.com", "senha": "senha-correta"}
        )

        assert resposta.status_code == 401


class TestMe:
    def test_me_sem_token_retorna_401(self, cliente: TestClient) -> None:
        assert cliente.get("/auth/me").status_code == 401

    def test_me_com_token_valido_retorna_dados_do_usuario(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario(session, "admin@vertere.com", Papel.ADMIN)
        token = cliente.post(
            "/auth/login", json={"email": "admin@vertere.com", "senha": "senha-correta"}
        ).json()["access_token"]

        resposta = cliente.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert resposta.status_code == 200
        assert resposta.json()["email"] == "admin@vertere.com"
        assert resposta.json()["papel"] == "admin"


class TestEnforcementDeAutorizacao:
    def test_admin_acessa_rota_financeira(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario(session, "admin@vertere.com", Papel.ADMIN)
        token = cliente.post(
            "/auth/login", json={"email": "admin@vertere.com", "senha": "senha-correta"}
        ).json()["access_token"]

        resposta = cliente.get(
            "/auth/financeiro-demo", headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 200

    def test_atendente_e_bloqueado_na_rota_financeira_mesmo_com_token_valido(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = cliente.post(
            "/auth/login", json={"email": "atendente@vertere.com", "senha": "senha-correta"}
        ).json()["access_token"]

        resposta = cliente.get(
            "/auth/financeiro-demo", headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 403

    def test_token_de_sessao_encerrada_e_rejeitado(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario(session, "admin@vertere.com", Papel.ADMIN)
        token = cliente.post(
            "/auth/login", json={"email": "admin@vertere.com", "senha": "senha-correta"}
        ).json()["access_token"]

        sessoes_store.limpar_sessoes()

        resposta = cliente.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert resposta.status_code == 401
