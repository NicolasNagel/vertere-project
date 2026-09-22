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
from vertere_api.financeiro.models import FechamentoModel
from vertere_api.main import app
from vertere_api.pacientes.models import PacienteModel
from vertere_api.veterinarios.models import VeterinarioModel


@pytest.fixture(autouse=True)
def _tabelas_e_sessoes_limpas():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(FechamentoModel).delete()
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
    session.query(FechamentoModel).delete()
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


def _criar_usuario_db(session: Session, email: str, papel: Papel, senha: str = "senha-correta") -> str:
    modelo = UsuarioModel(email=email, senha_hash=hash_senha(senha), papel=papel, ativo=True)
    session.add(modelo)
    session.commit()
    session.refresh(modelo)
    return modelo.id


def _token(cliente: TestClient, email: str, senha: str = "senha-correta") -> str:
    resposta = cliente.post("/auth/login", json={"email": email, "senha": senha})
    return resposta.json()["access_token"]


def _cabecalho(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_clinica(cliente: TestClient, token: str) -> str:
    resposta = cliente.post(
        "/clinicas",
        json={
            "nome": "Clínica Central",
            "cnpj": "11222333000181",
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

    def criar_atendimento(self, cliente: TestClient, data_hora: str = "2026-09-23T13:00:00") -> dict:
        resposta = cliente.post(
            "/atendimentos",
            json={
                "clinica_id": self.clinica_id,
                "veterinario_id": self.veterinario_id,
                "paciente_id": self.paciente_id,
                "itens_exame": [{"exame_id": self.exame_id, "quantidade": 1}],
                "metodo_coleta": "Punção venosa",
                "data_hora": data_hora,
            },
            headers=_cabecalho(self.token_admin),
        )
        return resposta.json()


class TestGerarFechamentoEndpoint:
    def test_admin_gera_fechamento(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        cenario.criar_atendimento(cliente)

        resposta = cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 201
        assert resposta.json()["valor_total"] == "45.00"
        assert resposta.json()["pago"] is False
        assert resposta.json()["status"] == "pendente"

    def test_atendente_nao_pode_gerar_fechamento(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(token),
        )

        assert resposta.status_code == 403

    def test_fechar_clinica_inexistente_retorna_422(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.post(
            "/financeiro/clinicas/inexistente/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 422

    def test_fechar_periodo_ja_fechado_retorna_409(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        resposta = cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 409

    def test_fechar_periodo_bloqueia_edicao_de_atendimento(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        atendimento = cenario.criar_atendimento(cliente)
        cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        resposta = cliente.patch(
            f"/atendimentos/{atendimento['id']}",
            json={
                "clinica_id": cenario.clinica_id,
                "veterinario_id": cenario.veterinario_id,
                "paciente_id": cenario.paciente_id,
                "itens_exame": [{"exame_id": cenario.exame_id, "quantidade": 2}],
                "metodo_coleta": "Punção venosa",
                "data_hora": "2026-09-23T13:00:00",
            },
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 409

    def test_fechar_periodo_bloqueia_cancelamento_de_atendimento(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        atendimento = cenario.criar_atendimento(cliente)
        cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        resposta = cliente.post(
            f"/atendimentos/{atendimento['id']}/cancelar", headers=_cabecalho(cenario.token_admin)
        )

        assert resposta.status_code == 409


class TestListarFechamentosEndpoint:
    def test_admin_lista_fechamentos(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        cenario.criar_atendimento(cliente)
        cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        resposta = cliente.get("/financeiro/fechamentos", headers=_cabecalho(cenario.token_admin))

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1
        assert resposta.json()[0]["clinica_id"] == cenario.clinica_id

    def test_admin_lista_fechamentos_filtrando_por_clinica(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        resposta = cliente.get(
            "/financeiro/fechamentos",
            params={"clinica_id": "inexistente"},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 200
        assert resposta.json() == []

    def test_atendente_nao_pode_listar_fechamentos(
        self, cliente: TestClient, session: Session
    ) -> None:
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.get("/financeiro/fechamentos", headers=_cabecalho(token))

        assert resposta.status_code == 403


class TestConfirmarPagamentoEndpoint:
    def test_admin_confirma_pagamento(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        fechamento = cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        ).json()

        resposta = cliente.post(
            f"/financeiro/fechamentos/{fechamento['id']}/confirmar-pagamento",
            json={},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 200
        assert resposta.json()["pago"] is True
        assert resposta.json()["status"] == "pago"

    def test_confirmar_pagamento_ja_pago_retorna_409(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        fechamento = cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        ).json()
        cliente.post(
            f"/financeiro/fechamentos/{fechamento['id']}/confirmar-pagamento",
            json={},
            headers=_cabecalho(cenario.token_admin),
        )

        resposta = cliente.post(
            f"/financeiro/fechamentos/{fechamento['id']}/confirmar-pagamento",
            json={},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 409

    def test_confirmar_pagamento_de_fechamento_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.post(
            "/financeiro/fechamentos/inexistente/confirmar-pagamento",
            json={},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 404

    def test_atendente_nao_pode_confirmar_pagamento(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        fechamento = cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        ).json()
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            f"/financeiro/fechamentos/{fechamento['id']}/confirmar-pagamento",
            json={},
            headers=_cabecalho(token),
        )

        assert resposta.status_code == 403


class TestVisualizacaoFinanceira:
    def test_admin_ve_faturamento_por_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        cenario.criar_atendimento(cliente)

        resposta = cliente.get(
            f"/financeiro/clinicas/{cenario.clinica_id}/faturamento",
            params={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 200
        assert resposta.json()["valor_total"] == "45.00"

    def test_admin_ve_resumo_financeiro(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        cenario.criar_atendimento(cliente)

        resposta = cliente.get(
            "/financeiro/resumo",
            params={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 200
        assert resposta.json() == [{"clinica_id": cenario.clinica_id, "valor_total": "45.00"}]

    def test_atendente_nao_pode_ver_faturamento(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.get(
            f"/financeiro/clinicas/{cenario.clinica_id}/faturamento",
            params={"ano": 2026, "mes": 9},
            headers=_cabecalho(token),
        )

        assert resposta.status_code == 403

    def test_admin_exporta_fechamento_csv(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        cenario.criar_atendimento(cliente)
        fechamento = cliente.post(
            f"/financeiro/clinicas/{cenario.clinica_id}/fechamentos",
            json={"ano": 2026, "mes": 9},
            headers=_cabecalho(cenario.token_admin),
        ).json()

        resposta = cliente.get(
            f"/financeiro/fechamentos/{fechamento['id']}/csv", headers=_cabecalho(cenario.token_admin)
        )

        assert resposta.status_code == 200
        assert resposta.headers["content-type"].startswith("text/csv")
        assert "Clínica Central" in resposta.text

    def test_exportar_csv_de_fechamento_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.get(
            "/financeiro/fechamentos/inexistente/csv", headers=_cabecalho(cenario.token_admin)
        )

        assert resposta.status_code == 404
