import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from vertere_api.atendimentos.models import AtendimentoItemExameModel, AtendimentoModel
from vertere_api.auth import sessoes_store
from vertere_api.auth.domain import Papel
from vertere_api.auth.models import UsuarioModel
from vertere_api.auth.service import hash_senha
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.db import Base, engine, get_session
from vertere_api.exames.models import ExameModel, RegraPlantaoModel
from vertere_api.main import app
from vertere_api.pacientes.models import PacienteModel
from vertere_api.veterinarios.models import VeterinarioModel


@pytest.fixture(autouse=True)
def _tabelas_e_sessoes_limpas():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(AtendimentoItemExameModel).delete()
    session.query(AtendimentoModel).delete()
    session.query(ExameModel).delete()
    session.query(RegraPlantaoModel).delete()
    session.query(PacienteModel).delete()
    session.query(VeterinarioModel).delete()
    session.query(ClinicaModel).delete()
    session.query(UsuarioModel).delete()
    session.commit()
    session.close()
    sessoes_store.limpar_sessoes()
    yield
    session = get_session()
    session.query(AtendimentoItemExameModel).delete()
    session.query(AtendimentoModel).delete()
    session.query(ExameModel).delete()
    session.query(RegraPlantaoModel).delete()
    session.query(PacienteModel).delete()
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


def _cabecalho(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_clinica(
    cliente: TestClient, token: str, nome: str = "Clínica Central", cnpj: str = "11222333000181"
) -> str:
    resposta = cliente.post(
        "/clinicas",
        json={
            "nome": nome,
            "cnpj": cnpj,
            "endereco": "Rua A, 123",
            "telefone": "4730001111",
            "email": "contato@central.com",
        },
        headers=_cabecalho(token),
    )
    return resposta.json()["id"]


def _criar_veterinario(cliente: TestClient, token: str, clinica_id: str) -> str:
    resposta = cliente.post(
        "/veterinarios",
        json={
            "nome": "Dr. João",
            "crmv": "SC-1234",
            "telefone": "47988880000",
            "email": "joao@clinica.com",
            "clinica_id": clinica_id,
        },
        headers=_cabecalho(token),
    )
    return resposta.json()["id"]


def _criar_paciente(cliente: TestClient, token: str, clinica_id: str) -> str:
    resposta = cliente.post(
        "/pacientes",
        json={
            "nome": "Rex",
            "especie": "Canina",
            "raca": "SRD",
            "sexo": "M",
            "idade": 3,
            "proprietario": "Maria",
            "clinica_id": clinica_id,
        },
        headers=_cabecalho(token),
    )
    return resposta.json()["id"]


def _criar_exame(cliente: TestClient, token: str) -> str:
    resposta = cliente.post(
        "/exames",
        json={"categoria": "Hematologia", "nome": "Hemograma", "preco_base": "45.00"},
        headers=_cabecalho(token),
    )
    return resposta.json()["id"]


class _Cenario:
    def __init__(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        self.token_admin = _token(cliente, "admin@vertere.com")
        self.clinica_id = _criar_clinica(cliente, self.token_admin)
        self.veterinario_id = _criar_veterinario(cliente, self.token_admin, self.clinica_id)
        self.paciente_id = _criar_paciente(cliente, self.token_admin, self.clinica_id)
        self.exame_id = _criar_exame(cliente, self.token_admin)

    def payload_atendimento(self, **overrides) -> dict:
        base = {
            "clinica_id": self.clinica_id,
            "veterinario_id": self.veterinario_id,
            "paciente_id": self.paciente_id,
            "itens_exame": [{"exame_id": self.exame_id, "quantidade": 1}],
            "metodo_coleta": "Punção venosa",
            "data_hora": "2026-09-23T13:00:00",
        }
        base.update(overrides)
        return base


class TestCriarAtendimentoEndpoint:
    def test_atendente_cria_atendimento(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            "/atendimentos", json=cenario.payload_atendimento(), headers=_cabecalho(token)
        )

        assert resposta.status_code == 201
        assert resposta.json()["valor_total"] == "45.00"
        assert resposta.json()["status"] == "ativo"

    def test_tecnico_nao_pode_criar_atendimento(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")

        resposta = cliente.post(
            "/atendimentos", json=cenario.payload_atendimento(), headers=_cabecalho(token)
        )

        assert resposta.status_code == 403

    def test_criar_com_clinica_inexistente_retorna_422(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.post(
            "/atendimentos",
            json=cenario.payload_atendimento(clinica_id="inexistente"),
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 422


class TestEditarECancelarAtendimentoEndpoint:
    def test_admin_edita_atendimento(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        criado = cliente.post(
            "/atendimentos", json=cenario.payload_atendimento(), headers=_cabecalho(cenario.token_admin)
        ).json()

        resposta = cliente.patch(
            f"/atendimentos/{criado['id']}",
            json=cenario.payload_atendimento(
                itens_exame=[{"exame_id": cenario.exame_id, "quantidade": 2}]
            ),
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 200
        assert resposta.json()["valor_total"] == "90.00"

    def test_editar_atendimento_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.patch(
            "/atendimentos/00000000-0000-0000-0000-000000000000",
            json=cenario.payload_atendimento(),
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 404

    def test_editar_com_referencia_invalida_retorna_422(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        criado = cliente.post(
            "/atendimentos", json=cenario.payload_atendimento(), headers=_cabecalho(cenario.token_admin)
        ).json()

        resposta = cliente.patch(
            f"/atendimentos/{criado['id']}",
            json=cenario.payload_atendimento(veterinario_id="inexistente"),
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 422

    def test_cancelar_atendimento_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.post(
            "/atendimentos/00000000-0000-0000-0000-000000000000/cancelar",
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 404

    def test_cancela_atendimento_e_edicao_posterior_retorna_409(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        criado = cliente.post(
            "/atendimentos", json=cenario.payload_atendimento(), headers=_cabecalho(cenario.token_admin)
        ).json()

        cancelado = cliente.post(
            f"/atendimentos/{criado['id']}/cancelar", headers=_cabecalho(cenario.token_admin)
        )
        assert cancelado.status_code == 200
        assert cancelado.json()["status"] == "cancelado"

        resposta = cliente.patch(
            f"/atendimentos/{criado['id']}",
            json=cenario.payload_atendimento(),
            headers=_cabecalho(cenario.token_admin),
        )
        assert resposta.status_code == 409

        cancelar_de_novo = cliente.post(
            f"/atendimentos/{criado['id']}/cancelar", headers=_cabecalho(cenario.token_admin)
        )
        assert cancelar_de_novo.status_code == 409


class TestListarAtendimentosEndpoint:
    def test_tecnico_pode_listar_atendimentos(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        cliente.post(
            "/atendimentos", json=cenario.payload_atendimento(), headers=_cabecalho(cenario.token_admin)
        )
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token_tecnico = _token(cliente, "tecnico@vertere.com")

        resposta = cliente.get("/atendimentos", headers=_cabecalho(token_tecnico))

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_tecnico_nao_pode_gerenciar_mas_pode_ver(
        self, cliente: TestClient, session: Session
    ) -> None:
        """Confirma que ATENDIMENTO_VER e ATENDIMENTO_GERENCIAR são pontos de decisão distintos."""
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token_tecnico = _token(cliente, "tecnico@vertere.com")

        pode_ver = cliente.get("/atendimentos", headers=_cabecalho(token_tecnico))
        nao_pode_gerenciar = cliente.post(
            "/atendimentos", json=cenario.payload_atendimento(), headers=_cabecalho(token_tecnico)
        )

        assert pode_ver.status_code == 200
        assert nao_pode_gerenciar.status_code == 403

    def test_usuario_clinica_so_ve_atendimentos_da_propria_clinica(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        cliente.post(
            "/atendimentos", json=cenario.payload_atendimento(), headers=_cabecalho(cenario.token_admin)
        )
        outra_clinica_id = _criar_clinica(
            cliente, cenario.token_admin, nome="Outra Clínica", cnpj="99888777000199"
        )
        _criar_usuario_db(session, "clinica@vertere.com", Papel.CLINICA, clinica_id=outra_clinica_id)
        token_clinica = _token(cliente, "clinica@vertere.com")

        resposta = cliente.get("/atendimentos", headers=_cabecalho(token_clinica))

        assert resposta.status_code == 200
        assert resposta.json() == []

    def test_listar_sem_autenticacao_retorna_401(self, cliente: TestClient, session: Session) -> None:
        resposta = cliente.get("/atendimentos")

        assert resposta.status_code == 401
