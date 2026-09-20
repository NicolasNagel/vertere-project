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
from vertere_api.veterinarios.models import VeterinarioModel


@pytest.fixture(autouse=True)
def _tabelas_e_sessoes_limpas():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(VeterinarioModel).delete()
    session.query(ClinicaModel).delete()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()
    sessoes_store.limpar_sessoes()
    yield
    session = get_session()
    session.query(VeterinarioModel).delete()
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


def _criar_clinica_db(session: Session, nome: str = "Clínica Central", cnpj: str = "11222333000181") -> str:
    modelo = ClinicaModel(
        nome=nome, cnpj=cnpj, endereco="Rua A, 123", telefone="4730001111",
        email="contato@central.com", ativo=True,
    )
    session.add(modelo)
    session.commit()
    session.refresh(modelo)
    return modelo.id


def _payload_veterinario(clinica_id: str, **overrides) -> dict:
    base = {
        "nome": "Dr. João Silva",
        "crmv": "SC-1234",
        "telefone": "4799990000",
        "email": "joao@laudos.com",
        "clinica_id": clinica_id,
    }
    base.update(overrides)
    return base


class TestCriarVeterinarioEndpoint:
    def test_admin_cria_veterinario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)

        resposta = cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 201
        assert resposta.json()["nome"] == "Dr. João Silva"
        assert resposta.json()["ativo"] is True

    def test_crmv_vazio_retorna_422(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)

        resposta = cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id, crmv="   "),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 422

    def test_clinica_inexistente_retorna_422(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/veterinarios",
            json=_payload_veterinario("00000000-0000-0000-0000-000000000000"),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 422

    def test_crmv_duplicado_retorna_409(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)
        cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        )

        resposta = cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id, nome="Outro Dr."),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 409

    def test_atendente_nao_pode_criar_veterinario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)

        resposta = cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 403


class TestEditarVeterinarioEndpoint:
    def test_admin_edita_veterinario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)
        criado = cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        ).json()

        resposta = cliente.patch(
            f"/veterinarios/{criado['id']}",
            json={"nome": "Dr. João A. Silva", "telefone": "4799990002", "email": "novo@laudos.com"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json()["nome"] == "Dr. João A. Silva"

    def test_editar_veterinario_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.patch(
            "/veterinarios/00000000-0000-0000-0000-000000000000",
            json={"nome": "X", "telefone": "X", "email": "x@x.com"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404


class TestInativarReativarVeterinarioEndpoint:
    def test_admin_inativa_e_reativa_veterinario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)
        criado = cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        ).json()

        inativado = cliente.post(
            f"/veterinarios/{criado['id']}/inativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert inativado.status_code == 200
        assert inativado.json()["ativo"] is False

        reativado = cliente.post(
            f"/veterinarios/{criado['id']}/reativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert reativado.status_code == 200
        assert reativado.json()["ativo"] is True

    def test_atendente_nao_pode_inativar_veterinario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)
        criado = cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token_admin}"},
        ).json()

        resposta = cliente.post(
            f"/veterinarios/{criado['id']}/inativar",
            headers={"Authorization": f"Bearer {token_atendente}"},
        )

        assert resposta.status_code == 403


class TestListarEBuscarVeterinarioEndpoint:
    def test_atendente_pode_listar_veterinarios(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)
        cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token_admin}"},
        )

        resposta = cliente.get(
            "/veterinarios", headers={"Authorization": f"Bearer {token_atendente}"}
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_listar_filtra_por_clinica(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_1 = _criar_clinica_db(session, "Clínica A", "11222333000181")
        clinica_2 = _criar_clinica_db(session, "Clínica B", "22333444000199")
        cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_1),
            headers={"Authorization": f"Bearer {token}"},
        )
        cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_2, crmv="SC-5678"),
            headers={"Authorization": f"Bearer {token}"},
        )

        resposta = cliente.get(
            "/veterinarios",
            params={"clinica_id": clinica_1},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1
        assert resposta.json()[0]["clinica_id"] == clinica_1

    def test_atendente_pode_buscar_veterinario_por_nome(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)
        cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token_admin}"},
        )

        resposta = cliente.get(
            "/veterinarios/busca",
            params={"nome": "joão"},
            headers={"Authorization": f"Bearer {token_atendente}"},
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_busca_com_apenas_ativos_exclui_inativos(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token_admin = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)
        criado = cliente.post(
            "/veterinarios",
            json=_payload_veterinario(clinica_id),
            headers={"Authorization": f"Bearer {token_admin}"},
        ).json()
        cliente.post(
            f"/veterinarios/{criado['id']}/inativar",
            headers={"Authorization": f"Bearer {token_admin}"},
        )

        resposta = cliente.get(
            "/veterinarios/busca",
            params={"nome": "joão", "apenas_ativos": True},
            headers={"Authorization": f"Bearer {token_admin}"},
        )

        assert resposta.status_code == 200
        assert resposta.json() == []

    def test_listar_sem_autenticacao_retorna_401(self, cliente: TestClient, session: Session) -> None:
        resposta = cliente.get("/veterinarios")

        assert resposta.status_code == 401
