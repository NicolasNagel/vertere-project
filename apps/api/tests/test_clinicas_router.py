import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from vertere_api.auth import sessoes_store
from vertere_api.auth.domain import Papel
from vertere_api.auth.models import UsuarioModel
from vertere_api.auth.service import hash_senha
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.db import Base, engine, get_session
from vertere_api.main import app


@pytest.fixture(autouse=True)
def _tabelas_e_sessoes_limpas():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(ClinicaModel).delete()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()
    sessoes_store.limpar_sessoes()
    yield
    session = get_session()
    session.query(ClinicaModel).delete()
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


def _payload_clinica(**overrides) -> dict:
    base = {
        "nome": "Clínica Central",
        "cnpj": "11222333000181",
        "endereco": "Rua A, 123",
        "telefone": "4730001111",
        "email": "contato@central.com",
    }
    base.update(overrides)
    return base


class TestCriarClinicaEndpoint:
    def test_admin_cria_clinica(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 201
        assert resposta.json()["nome"] == "Clínica Central"
        assert resposta.json()["ativo"] is True

    def test_cnpj_duplicado_retorna_409(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        cliente.post("/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token}"})

        resposta = cliente.post(
            "/clinicas",
            json=_payload_clinica(nome="Outra Clínica"),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 409

    def test_cnpj_com_formato_invalido_retorna_422(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/clinicas",
            json=_payload_clinica(cnpj="123"),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 422

    def test_atendente_nao_pode_criar_clinica(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 403


class TestDefinirPrazoPagamentoEndpoint:
    def test_admin_define_prazo_customizado(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        criada = cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token}"}
        ).json()

        resposta = cliente.post(
            f"/clinicas/{criada['id']}/prazo-pagamento",
            json={"prazo_pagamento_dias": 15},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json()["prazo_pagamento_dias"] == 15

    def test_atendente_nao_pode_definir_prazo_pagamento(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token_admin = _token(cliente, "admin@vertere.com")
        criada = cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token_admin}"}
        ).json()
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            f"/clinicas/{criada['id']}/prazo-pagamento",
            json={"prazo_pagamento_dias": 15},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 403


class TestEditarClinicaEndpoint:
    def test_admin_edita_clinica(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        criada = cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token}"}
        ).json()

        resposta = cliente.patch(
            f"/clinicas/{criada['id']}",
            json={
                "nome": "Clínica Central Ltda",
                "endereco": "Rua A, 999",
                "telefone": "4730009999",
                "email": "novo@central.com",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json()["nome"] == "Clínica Central Ltda"

    def test_editar_clinica_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.patch(
            "/clinicas/00000000-0000-0000-0000-000000000000",
            json={"nome": "X", "endereco": "X", "telefone": "X", "email": "x@x.com"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404


class TestInativarReativarClinicaEndpoint:
    def test_admin_inativa_e_reativa_clinica(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        criada = cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token}"}
        ).json()

        inativada = cliente.post(
            f"/clinicas/{criada['id']}/inativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert inativada.status_code == 200
        assert inativada.json()["ativo"] is False

        reativada = cliente.post(
            f"/clinicas/{criada['id']}/reativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert reativada.status_code == 200
        assert reativada.json()["ativo"] is True

    def test_atendente_nao_pode_inativar_clinica(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        criada = cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token_admin}"}
        ).json()

        resposta = cliente.post(
            f"/clinicas/{criada['id']}/inativar",
            headers={"Authorization": f"Bearer {token_atendente}"},
        )

        assert resposta.status_code == 403


class TestListarEBuscarClinicaEndpoint:
    def test_atendente_pode_listar_clinicas(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token_admin}"}
        )

        resposta = cliente.get("/clinicas", headers={"Authorization": f"Bearer {token_atendente}"})

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_atendente_pode_buscar_clinica_por_nome(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token_admin}"}
        )

        resposta = cliente.get(
            "/clinicas/busca",
            params={"nome": "central"},
            headers={"Authorization": f"Bearer {token_atendente}"},
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_busca_com_apenas_ativas_exclui_inativas(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token_admin = _token(cliente, "admin@vertere.com")
        criada = cliente.post(
            "/clinicas", json=_payload_clinica(), headers={"Authorization": f"Bearer {token_admin}"}
        ).json()
        cliente.post(
            f"/clinicas/{criada['id']}/inativar", headers={"Authorization": f"Bearer {token_admin}"}
        )

        resposta = cliente.get(
            "/clinicas/busca",
            params={"nome": "central", "apenas_ativas": True},
            headers={"Authorization": f"Bearer {token_admin}"},
        )

        assert resposta.status_code == 200
        assert resposta.json() == []

    def test_listar_sem_autenticacao_retorna_401(self, cliente: TestClient, session: Session) -> None:
        resposta = cliente.get("/clinicas")

        assert resposta.status_code == 401
