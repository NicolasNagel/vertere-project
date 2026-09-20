import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from vertere_api.auth import sessoes_store
from vertere_api.auth.domain import Papel
from vertere_api.auth.models import UsuarioModel
from vertere_api.auth.service import hash_senha
from vertere_api.db import Base, engine, get_session
from vertere_api.exames.models import ExameModel, RegraPlantaoModel
from vertere_api.main import app


@pytest.fixture(autouse=True)
def _tabelas_e_sessoes_limpas():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(ExameModel).delete()
    session.query(RegraPlantaoModel).delete()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()
    sessoes_store.limpar_sessoes()
    yield
    session = get_session()
    session.query(ExameModel).delete()
    session.query(RegraPlantaoModel).delete()
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


def _payload_exame(**overrides) -> dict:
    base = {"categoria": "Hematologia", "nome": "Hemograma", "preco_base": "45.00"}
    base.update(overrides)
    return base


def _payload_regra(**overrides) -> dict:
    base = {
        "dia_semana": 4,
        "hora_inicio": "18:00:00",
        "hora_fim": "06:00:00",
        "valor_adicional": "50.00",
    }
    base.update(overrides)
    return base


class TestCriarExameEndpoint:
    def test_admin_cria_exame(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/exames", json=_payload_exame(), headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 201
        assert resposta.json()["nome"] == "Hemograma"
        assert resposta.json()["preco_base"] == "45.00"
        assert resposta.json()["ativo"] is True

    def test_atendente_nao_pode_criar_exame(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            "/exames", json=_payload_exame(), headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 403


class TestEditarExameEndpoint:
    def test_admin_edita_exame(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        criado = cliente.post(
            "/exames", json=_payload_exame(), headers={"Authorization": f"Bearer {token}"}
        ).json()

        resposta = cliente.patch(
            f"/exames/{criado['id']}",
            json={"categoria": "Hematologia", "nome": "Hemograma completo", "preco_base": "50.00"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json()["nome"] == "Hemograma completo"

    def test_editar_exame_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.patch(
            "/exames/00000000-0000-0000-0000-000000000000",
            json={"categoria": "X", "nome": "X", "preco_base": "1.00"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404


class TestInativarReativarExameEndpoint:
    def test_admin_inativa_e_reativa_exame(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        criado = cliente.post(
            "/exames", json=_payload_exame(), headers={"Authorization": f"Bearer {token}"}
        ).json()

        inativado = cliente.post(
            f"/exames/{criado['id']}/inativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert inativado.status_code == 200
        assert inativado.json()["ativo"] is False

        reativado = cliente.post(
            f"/exames/{criado['id']}/reativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert reativado.status_code == 200
        assert reativado.json()["ativo"] is True


class TestInativarReativarExameInexistenteEndpoint:
    def test_inativar_exame_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/exames/00000000-0000-0000-0000-000000000000/inativar",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404

    def test_reativar_exame_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/exames/00000000-0000-0000-0000-000000000000/reativar",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404


class TestListarExamesEndpoint:
    def test_atendente_pode_listar_exames(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        cliente.post(
            "/exames", json=_payload_exame(), headers={"Authorization": f"Bearer {token_admin}"}
        )

        resposta = cliente.get("/exames", headers={"Authorization": f"Bearer {token_atendente}"})

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_tecnico_pode_listar_exames(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token_admin = _token(cliente, "admin@vertere.com")
        token_tecnico = _token(cliente, "tecnico@vertere.com")
        cliente.post(
            "/exames", json=_payload_exame(), headers={"Authorization": f"Bearer {token_admin}"}
        )

        resposta = cliente.get("/exames", headers={"Authorization": f"Bearer {token_tecnico}"})

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_listar_filtra_por_categoria(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        cliente.post(
            "/exames", json=_payload_exame(categoria="Hematologia"),
            headers={"Authorization": f"Bearer {token}"},
        )
        cliente.post(
            "/exames", json=_payload_exame(categoria="Bioquímica", nome="Glicose"),
            headers={"Authorization": f"Bearer {token}"},
        )

        resposta = cliente.get(
            "/exames", params={"categoria": "Bioquímica"}, headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1
        assert resposta.json()[0]["categoria"] == "Bioquímica"

    def test_listar_sem_autenticacao_retorna_401(self, cliente: TestClient, session: Session) -> None:
        resposta = cliente.get("/exames")

        assert resposta.status_code == 401


class TestCriarRegraPlantaoEndpoint:
    def test_admin_cria_regra(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/regras-plantao", json=_payload_regra(), headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 201
        assert resposta.json()["dia_semana"] == 4
        assert resposta.json()["valor_adicional"] == "50.00"
        assert resposta.json()["ativo"] is True

    def test_atendente_nao_pode_criar_regra(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            "/regras-plantao", json=_payload_regra(), headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 403


class TestEditarRegraPlantaoEndpoint:
    def test_admin_edita_regra(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        criada = cliente.post(
            "/regras-plantao", json=_payload_regra(), headers={"Authorization": f"Bearer {token}"}
        ).json()

        resposta = cliente.patch(
            f"/regras-plantao/{criada['id']}",
            json=_payload_regra(valor_adicional="60.00"),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json()["valor_adicional"] == "60.00"

    def test_editar_regra_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.patch(
            "/regras-plantao/00000000-0000-0000-0000-000000000000",
            json=_payload_regra(),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404


class TestInativarReativarRegraPlantaoEndpoint:
    def test_admin_inativa_e_reativa_regra(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        criada = cliente.post(
            "/regras-plantao", json=_payload_regra(), headers={"Authorization": f"Bearer {token}"}
        ).json()

        inativada = cliente.post(
            f"/regras-plantao/{criada['id']}/inativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert inativada.status_code == 200
        assert inativada.json()["ativo"] is False

        reativada = cliente.post(
            f"/regras-plantao/{criada['id']}/reativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert reativada.status_code == 200
        assert reativada.json()["ativo"] is True


class TestInativarReativarRegraPlantaoInexistenteEndpoint:
    def test_inativar_regra_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/regras-plantao/00000000-0000-0000-0000-000000000000/inativar",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404

    def test_reativar_regra_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/regras-plantao/00000000-0000-0000-0000-000000000000/reativar",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404


class TestListarRegrasPlantaoEndpoint:
    def test_atendente_pode_listar_regras(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        cliente.post(
            "/regras-plantao", json=_payload_regra(),
            headers={"Authorization": f"Bearer {token_admin}"},
        )

        resposta = cliente.get(
            "/regras-plantao", headers={"Authorization": f"Bearer {token_atendente}"}
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_tecnico_nao_pode_listar_regras(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")

        resposta = cliente.get("/regras-plantao", headers={"Authorization": f"Bearer {token}"})

        assert resposta.status_code == 403


class TestSugestaoAdicionalEndpoint:
    def test_atendente_recebe_sugestao_de_regra_aplicavel(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        cliente.post(
            "/regras-plantao", json=_payload_regra(),
            headers={"Authorization": f"Bearer {token_admin}"},
        )

        # 2026-09-25 é sexta-feira, 22:00 — dentro da janela 18:00-06:00 da regra
        resposta = cliente.get(
            "/regras-plantao/sugestao-adicional",
            params={"data_hora": "2026-09-25T22:00:00"},
            headers={"Authorization": f"Bearer {token_atendente}"},
        )

        assert resposta.status_code == 200
        assert resposta.json() is not None
        assert resposta.json()["valor_adicional"] == "50.00"

    def test_sugestao_sem_regra_aplicavel_retorna_null(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.get(
            "/regras-plantao/sugestao-adicional",
            params={"data_hora": "2026-09-23T10:00:00"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json() is None
