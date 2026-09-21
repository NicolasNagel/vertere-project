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
from vertere_api.pacientes.models import PacienteModel


@pytest.fixture(autouse=True)
def _tabelas_e_sessoes_limpas():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(PacienteModel).delete()
    session.query(ClinicaModel).delete()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()
    sessoes_store.limpar_sessoes()
    yield
    session = get_session()
    session.query(PacienteModel).delete()
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


def _criar_usuario_db(
    session: Session, email: str, papel: Papel, clinica_id: str | None = None, senha: str = "senha-correta"
) -> str:
    modelo = UsuarioModel(
        email=email, senha_hash=hash_senha(senha), papel=papel, ativo=True, clinica_id=clinica_id
    )
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


def _payload_paciente(clinica_id: str, **overrides) -> dict:
    base = {
        "nome": "Rex",
        "especie": "Canina",
        "raca": "Labrador",
        "sexo": "M",
        "idade": 3,
        "proprietario": "Maria Souza",
        "clinica_id": clinica_id,
    }
    base.update(overrides)
    return base


class TestCriarPacienteEndpoint:
    def test_admin_cria_paciente(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)

        resposta = cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 201
        assert resposta.json()["nome"] == "Rex"
        assert resposta.json()["ativo"] is True

    def test_atendente_cria_paciente(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)

        resposta = cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 201

    def test_clinica_inexistente_retorna_422(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.post(
            "/pacientes",
            json=_payload_paciente("00000000-0000-0000-0000-000000000000"),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 422

    def test_tecnico_nao_pode_criar_paciente(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")
        clinica_id = _criar_clinica_db(session)

        resposta = cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 403


class TestEditarPacienteEndpoint:
    def test_atendente_edita_paciente(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)
        criado = cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        ).json()

        resposta = cliente.patch(
            f"/pacientes/{criado['id']}",
            json={
                "nome": "Rex II",
                "especie": "Canina",
                "raca": "Labrador",
                "sexo": "M",
                "idade": 4,
                "proprietario": "Maria S. Souza",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json()["nome"] == "Rex II"

    def test_editar_paciente_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")

        resposta = cliente.patch(
            "/pacientes/00000000-0000-0000-0000-000000000000",
            json={
                "nome": "X", "especie": "X", "raca": "X", "sexo": "X",
                "idade": 1, "proprietario": "X",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 404


class TestInativarReativarPacienteEndpoint:
    def test_admin_inativa_e_reativa_paciente(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)
        criado = cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        ).json()

        inativado = cliente.post(
            f"/pacientes/{criado['id']}/inativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert inativado.status_code == 200
        assert inativado.json()["ativo"] is False

        reativado = cliente.post(
            f"/pacientes/{criado['id']}/reativar", headers={"Authorization": f"Bearer {token}"}
        )
        assert reativado.status_code == 200
        assert reativado.json()["ativo"] is True

    def test_atendente_nao_pode_inativar_paciente(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token_admin = _token(cliente, "admin@vertere.com")
        token_atendente = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)
        criado = cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token_admin}"},
        ).json()

        resposta = cliente.post(
            f"/pacientes/{criado['id']}/inativar",
            headers={"Authorization": f"Bearer {token_atendente}"},
        )

        assert resposta.status_code == 403


class TestListarEBuscarPacienteEndpoint:
    def test_atendente_pode_listar_pacientes(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)
        cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        )

        resposta = cliente.get(
            "/pacientes", headers={"Authorization": f"Bearer {token}"}
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_listar_filtra_por_clinica(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_1 = _criar_clinica_db(session, "Clínica A", "11222333000181")
        clinica_2 = _criar_clinica_db(session, "Clínica B", "22333444000199")
        cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_1),
            headers={"Authorization": f"Bearer {token}"},
        )
        cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_2),
            headers={"Authorization": f"Bearer {token}"},
        )

        resposta = cliente.get(
            "/pacientes",
            params={"clinica_id": clinica_1},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1
        assert resposta.json()[0]["clinica_id"] == clinica_1

    def test_clinica_lista_apenas_pacientes_da_propria_clinica(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token_admin = _token(cliente, "admin@vertere.com")
        clinica_1 = _criar_clinica_db(session, "Clínica A", "11222333000181")
        clinica_2 = _criar_clinica_db(session, "Clínica B", "22333444000199")
        cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_1),
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_2),
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        _criar_usuario_db(session, "clinica@vertere.com", Papel.CLINICA, clinica_id=clinica_2)
        token_clinica = _token(cliente, "clinica@vertere.com")

        resposta = cliente.get(
            "/pacientes",
            params={"clinica_id": clinica_1},
            headers={"Authorization": f"Bearer {token_clinica}"},
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1
        assert resposta.json()[0]["clinica_id"] == clinica_2

    def test_atendente_pode_buscar_paciente_por_nome(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")
        clinica_id = _criar_clinica_db(session)
        cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        )

        resposta = cliente.get(
            "/pacientes/busca",
            params={"nome": "rex"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_busca_filtra_por_proprietario(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)
        cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id, proprietario="João Pedro"),
            headers={"Authorization": f"Bearer {token}"},
        )
        cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id, proprietario="Maria Souza"),
            headers={"Authorization": f"Bearer {token}"},
        )

        resposta = cliente.get(
            "/pacientes/busca",
            params={"nome": "rex", "proprietario": "joão"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1
        assert resposta.json()[0]["proprietario"] == "João Pedro"

    def test_busca_com_apenas_ativos_exclui_inativos(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        token = _token(cliente, "admin@vertere.com")
        clinica_id = _criar_clinica_db(session)
        criado = cliente.post(
            "/pacientes",
            json=_payload_paciente(clinica_id),
            headers={"Authorization": f"Bearer {token}"},
        ).json()
        cliente.post(
            f"/pacientes/{criado['id']}/inativar",
            headers={"Authorization": f"Bearer {token}"},
        )

        resposta = cliente.get(
            "/pacientes/busca",
            params={"nome": "rex", "apenas_ativos": True},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resposta.status_code == 200
        assert resposta.json() == []

    def test_listar_sem_autenticacao_retorna_401(self, cliente: TestClient, session: Session) -> None:
        resposta = cliente.get("/pacientes")

        assert resposta.status_code == 401
