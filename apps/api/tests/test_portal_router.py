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
from vertere_api.laudos.models import LaudoModel, TemplateLaudoModel
from vertere_api.main import app
from vertere_api.pacientes.models import PacienteModel
from vertere_api.veterinarios.models import VeterinarioModel


@pytest.fixture(autouse=True)
def _tabelas_e_sessoes_limpas():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(LaudoModel).delete()
    session.query(TemplateLaudoModel).delete()
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
    session.query(LaudoModel).delete()
    session.query(TemplateLaudoModel).delete()
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


class _Cenario:
    """Monta clínica + veterinário + paciente + exame + atendimento + laudo finalizável,
    tudo pertencendo à mesma clínica (`self.clinica_id`)."""

    def __init__(self, cliente: TestClient, session: Session) -> None:
        _criar_usuario_db(session, "admin@vertere.com", Papel.ADMIN)
        self.token_admin = _token(cliente, "admin@vertere.com")

        self.clinica_id = cliente.post(
            "/clinicas",
            json={
                "nome": "Clinica Central",
                "cnpj": "11222333000181",
                "endereco": "Rua A, 123",
                "telefone": "4730001111",
                "email": "contato@central.com",
            },
            headers=_cabecalho(self.token_admin),
        ).json()["id"]

        self.veterinario_id = cliente.post(
            "/veterinarios",
            json={
                "nome": "Dr. Joao",
                "crmv": "SC-1234",
                "telefone": "47988880000",
                "email": "joao@clinica.com",
                "clinica_id": self.clinica_id,
            },
            headers=_cabecalho(self.token_admin),
        ).json()["id"]

        self.paciente_id = cliente.post(
            "/pacientes",
            json={
                "nome": "Rex",
                "especie": "Canina",
                "raca": "SRD",
                "sexo": "M",
                "idade": 3,
                "proprietario": "Maria",
                "clinica_id": self.clinica_id,
            },
            headers=_cabecalho(self.token_admin),
        ).json()["id"]

        self.exame_id = cliente.post(
            "/exames",
            json={"categoria": "Hematologia", "nome": "Hemograma", "preco_base": "45.00"},
            headers=_cabecalho(self.token_admin),
        ).json()["id"]

        self.atendimento_id = cliente.post(
            "/atendimentos",
            json={
                "clinica_id": self.clinica_id,
                "veterinario_id": self.veterinario_id,
                "paciente_id": self.paciente_id,
                "itens_exame": [{"exame_id": self.exame_id, "quantidade": 1}],
                "metodo_coleta": "Puncao venosa",
                "data_hora": "2026-09-23T13:00:00",
            },
            headers=_cabecalho(self.token_admin),
        ).json()["id"]

        self.template_id = cliente.post(
            "/templates-laudo",
            json={
                "categoria": "Hematologia",
                "campos": [{"nome": "Hemacias", "unidade": "milhoes/uL", "faixa_referencia": "5.5 a 8.5"}],
            },
            headers=_cabecalho(self.token_admin),
        ).json()["id"]

        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token_tecnico = _token(cliente, "tecnico@vertere.com")
        self.laudo_id = cliente.post(
            "/laudos",
            json={"atendimento_id": self.atendimento_id, "exame_id": self.exame_id},
            headers=_cabecalho(token_tecnico),
        ).json()["id"]

    def token_clinica(self, cliente: TestClient, session: Session, email: str = "clinica@vertere.com") -> str:
        _criar_usuario_db(session, email, Papel.CLINICA, clinica_id=self.clinica_id)
        return _token(cliente, email)

    def token_outra_clinica(self, cliente: TestClient, session: Session) -> tuple[str, str]:
        outra_clinica_id = cliente.post(
            "/clinicas",
            json={
                "nome": "Outra Clinica",
                "cnpj": "22333444000199",
                "endereco": "Rua B, 456",
                "telefone": "4730002222",
                "email": "contato@outra.com",
            },
            headers=_cabecalho(self.token_admin),
        ).json()["id"]
        _criar_usuario_db(session, "outra@vertere.com", Papel.CLINICA, clinica_id=outra_clinica_id)
        return _token(cliente, "outra@vertere.com"), outra_clinica_id


class TestGatePapelClinica:
    def test_admin_recebe_403_no_portal(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.get("/portal/pacientes", headers=_cabecalho(cenario.token_admin))

        assert resposta.status_code == 403

    def test_atendente_recebe_403_no_portal(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.get("/portal/pacientes", headers=_cabecalho(token))

        assert resposta.status_code == 403

    def test_tecnico_recebe_403_no_portal(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico2@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico2@vertere.com")

        resposta = cliente.get("/portal/pacientes", headers=_cabecalho(token))

        assert resposta.status_code == 403

    def test_sem_autenticacao_retorna_401(self, cliente: TestClient, session: Session) -> None:
        resposta = cliente.get("/portal/pacientes")

        assert resposta.status_code == 401

    def test_clinica_acessa_o_portal(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get("/portal/pacientes", headers=_cabecalho(token))

        assert resposta.status_code == 200


class TestPortalPacientes:
    def test_lista_pacientes_da_propria_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get("/portal/pacientes", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert [p["id"] for p in resposta.json()] == [cenario.paciente_id]

    def test_busca_paciente_da_propria_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get(f"/portal/pacientes/{cenario.paciente_id}", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert resposta.json()["id"] == cenario.paciente_id

    def test_busca_paciente_de_outra_clinica_retorna_404(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token_outra, _ = cenario.token_outra_clinica(cliente, session)

        resposta = cliente.get(f"/portal/pacientes/{cenario.paciente_id}", headers=_cabecalho(token_outra))

        assert resposta.status_code == 404

    def test_busca_paciente_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get(
            "/portal/pacientes/00000000-0000-0000-0000-000000000000", headers=_cabecalho(token)
        )

        assert resposta.status_code == 404


class TestPortalHistoricoPaciente:
    def test_historico_agrega_atendimentos_e_laudos_da_propria_clinica(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get(
            f"/portal/pacientes/{cenario.paciente_id}/historico", headers=_cabecalho(token)
        )

        assert resposta.status_code == 200
        corpo = resposta.json()
        assert corpo["paciente"]["id"] == cenario.paciente_id
        assert [a["id"] for a in corpo["atendimentos"]] == [cenario.atendimento_id]
        assert [l["id"] for l in corpo["laudos"]] == [cenario.laudo_id]

    def test_historico_de_paciente_de_outra_clinica_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        token_outra, _ = cenario.token_outra_clinica(cliente, session)

        resposta = cliente.get(
            f"/portal/pacientes/{cenario.paciente_id}/historico", headers=_cabecalho(token_outra)
        )

        assert resposta.status_code == 404


class TestPortalAtendimentos:
    def test_lista_atendimentos_da_propria_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get("/portal/atendimentos", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert [a["id"] for a in resposta.json()] == [cenario.atendimento_id]

    def test_busca_atendimento_da_propria_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get(f"/portal/atendimentos/{cenario.atendimento_id}", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert resposta.json()["id"] == cenario.atendimento_id

    def test_busca_atendimento_de_outra_clinica_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        token_outra, _ = cenario.token_outra_clinica(cliente, session)

        resposta = cliente.get(
            f"/portal/atendimentos/{cenario.atendimento_id}", headers=_cabecalho(token_outra)
        )

        assert resposta.status_code == 404


class TestPortalLaudos:
    def test_lista_laudos_da_propria_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get("/portal/laudos", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert [l["id"] for l in resposta.json()] == [cenario.laudo_id]

    def test_ve_laudo_da_propria_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token = cenario.token_clinica(cliente, session)

        resposta = cliente.get(f"/portal/laudos/{cenario.laudo_id}", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert resposta.json()["id"] == cenario.laudo_id

    def test_ve_laudo_de_outra_clinica_retorna_404(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        token_outra, _ = cenario.token_outra_clinica(cliente, session)

        resposta = cliente.get(f"/portal/laudos/{cenario.laudo_id}", headers=_cabecalho(token_outra))

        assert resposta.status_code == 404
