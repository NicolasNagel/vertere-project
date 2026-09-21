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


class TestCriarTemplateLaudoEndpoint:
    def test_admin_cria_template(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)

        assert cenario.template_id is not None

    def test_atendente_nao_pode_criar_template(self, cliente: TestClient, session: Session) -> None:
        _Cenario(cliente, session)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.post(
            "/templates-laudo",
            json={"categoria": "Bioquimica", "campos": []},
            headers=_cabecalho(token),
        )

        assert resposta.status_code == 403


class TestEditarInativarReativarListarTemplateLaudoEndpoint:
    def test_admin_edita_template(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.patch(
            f"/templates-laudo/{cenario.template_id}",
            json={"categoria": "Hematologia", "campos": [{"nome": "Leucocitos"}]},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 200
        assert resposta.json()["campos"][0]["nome"] == "Leucocitos"

    def test_editar_template_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.patch(
            "/templates-laudo/00000000-0000-0000-0000-000000000000",
            json={"categoria": "X", "campos": []},
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 404

    def test_admin_inativa_e_reativa_template(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)

        inativado = cliente.post(
            f"/templates-laudo/{cenario.template_id}/inativar", headers=_cabecalho(cenario.token_admin)
        )
        assert inativado.status_code == 200
        assert inativado.json()["ativo"] is False

        reativado = cliente.post(
            f"/templates-laudo/{cenario.template_id}/reativar", headers=_cabecalho(cenario.token_admin)
        )
        assert reativado.status_code == 200
        assert reativado.json()["ativo"] is True

    def test_inativar_template_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.post(
            "/templates-laudo/00000000-0000-0000-0000-000000000000/inativar",
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 404

    def test_reativar_template_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)

        resposta = cliente.post(
            "/templates-laudo/00000000-0000-0000-0000-000000000000/reativar",
            headers=_cabecalho(cenario.token_admin),
        )

        assert resposta.status_code == 404

    def test_tecnico_lista_templates(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")

        resposta = cliente.get("/templates-laudo", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1


class TestCriarLaudoEndpoint:
    def test_tecnico_cria_laudo(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")

        resposta = cliente.post(
            "/laudos",
            json={"atendimento_id": cenario.atendimento_id, "exame_id": cenario.exame_id},
            headers=_cabecalho(token),
        )

        assert resposta.status_code == 201
        assert resposta.json()["status"] == "rascunho"

    def test_clinica_nao_pode_criar_laudo(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "clinica@vertere.com", Papel.CLINICA, clinica_id=cenario.clinica_id)
        token = _token(cliente, "clinica@vertere.com")

        resposta = cliente.post(
            "/laudos",
            json={"atendimento_id": cenario.atendimento_id, "exame_id": cenario.exame_id},
            headers=_cabecalho(token),
        )

        assert resposta.status_code == 403

    def test_criar_laudo_sem_template_retorna_422(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        outro_exame_id = cliente.post(
            "/exames",
            json={"categoria": "Bioquimica", "nome": "Glicose", "preco_base": "20.00"},
            headers=_cabecalho(cenario.token_admin),
        ).json()["id"]
        cliente.patch(
            f"/atendimentos/{cenario.atendimento_id}",
            json={
                "clinica_id": cenario.clinica_id,
                "veterinario_id": cenario.veterinario_id,
                "paciente_id": cenario.paciente_id,
                "itens_exame": [
                    {"exame_id": cenario.exame_id, "quantidade": 1},
                    {"exame_id": outro_exame_id, "quantidade": 1},
                ],
                "metodo_coleta": "Puncao venosa",
                "data_hora": "2026-09-23T13:00:00",
            },
            headers=_cabecalho(cenario.token_admin),
        )
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")

        resposta = cliente.post(
            "/laudos",
            json={"atendimento_id": cenario.atendimento_id, "exame_id": outro_exame_id},
            headers=_cabecalho(token),
        )

        assert resposta.status_code == 422


class TestFinalizarReenviarLaudoEndpoint:
    def _criar_laudo(self, cliente: TestClient, cenario: _Cenario, token_tecnico: str) -> str:
        resposta = cliente.post(
            "/laudos",
            json={"atendimento_id": cenario.atendimento_id, "exame_id": cenario.exame_id},
            headers=_cabecalho(token_tecnico),
        )
        return resposta.json()["id"]

    def test_finaliza_laudo_e_dispara_tentativa_de_envio(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")
        laudo_id = self._criar_laudo(cliente, cenario, token)

        resposta = cliente.post(f"/laudos/{laudo_id}/finalizar", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert resposta.json()["status"] == "finalizado"
        # Sem servidor SMTP real no ambiente de teste, o envio falha mas a
        # finalização não é bloqueada por isso (ver Implementation Decisions).
        assert resposta.json()["erro_envio"] is not None

    def test_reenvia_laudo_finalizado(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")
        laudo_id = self._criar_laudo(cliente, cenario, token)
        cliente.post(f"/laudos/{laudo_id}/finalizar", headers=_cabecalho(token))

        resposta = cliente.post(f"/laudos/{laudo_id}/reenviar", headers=_cabecalho(token))

        assert resposta.status_code == 200
        assert resposta.json()["status"] == "finalizado"

    def test_finalizar_laudo_inexistente_retorna_404(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")

        resposta = cliente.post(
            "/laudos/00000000-0000-0000-0000-000000000000/finalizar", headers=_cabecalho(token)
        )

        assert resposta.status_code == 404

    def test_salvar_rascunho_de_laudo_inexistente_retorna_404(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")

        resposta = cliente.patch(
            "/laudos/00000000-0000-0000-0000-000000000000/rascunho",
            json={"valores": []},
            headers=_cabecalho(token),
        )

        assert resposta.status_code == 404

    def test_reenviar_laudo_nao_finalizado_retorna_409(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")
        laudo_id = self._criar_laudo(cliente, cenario, token)

        resposta = cliente.post(f"/laudos/{laudo_id}/reenviar", headers=_cabecalho(token))

        assert resposta.status_code == 409

    def test_finalizar_laudo_ja_finalizado_retorna_409(
        self, cliente: TestClient, session: Session
    ) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token = _token(cliente, "tecnico@vertere.com")
        laudo_id = self._criar_laudo(cliente, cenario, token)
        cliente.post(f"/laudos/{laudo_id}/finalizar", headers=_cabecalho(token))

        resposta = cliente.post(f"/laudos/{laudo_id}/finalizar", headers=_cabecalho(token))

        assert resposta.status_code == 409


class TestListarVerLaudoEndpoint:
    def test_admin_lista_laudos(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token_tecnico = _token(cliente, "tecnico@vertere.com")
        cliente.post(
            "/laudos",
            json={"atendimento_id": cenario.atendimento_id, "exame_id": cenario.exame_id},
            headers=_cabecalho(token_tecnico),
        )

        resposta = cliente.get("/laudos", headers=_cabecalho(cenario.token_admin))

        assert resposta.status_code == 200
        assert len(resposta.json()) == 1

    def test_atendente_nao_pode_listar_laudos(self, cliente: TestClient, session: Session) -> None:
        _Cenario(cliente, session)
        _criar_usuario_db(session, "atendente@vertere.com", Papel.ATENDENTE)
        token = _token(cliente, "atendente@vertere.com")

        resposta = cliente.get("/laudos", headers=_cabecalho(token))

        assert resposta.status_code == 403

    def test_clinica_ve_laudo_da_propria_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token_tecnico = _token(cliente, "tecnico@vertere.com")
        laudo_id = cliente.post(
            "/laudos",
            json={"atendimento_id": cenario.atendimento_id, "exame_id": cenario.exame_id},
            headers=_cabecalho(token_tecnico),
        ).json()["id"]
        _criar_usuario_db(session, "clinica@vertere.com", Papel.CLINICA, clinica_id=cenario.clinica_id)
        token_clinica = _token(cliente, "clinica@vertere.com")

        resposta = cliente.get(f"/laudos/{laudo_id}", headers=_cabecalho(token_clinica))

        assert resposta.status_code == 200

    def test_clinica_nao_ve_laudo_de_outra_clinica(self, cliente: TestClient, session: Session) -> None:
        cenario = _Cenario(cliente, session)
        _criar_usuario_db(session, "tecnico@vertere.com", Papel.TECNICO)
        token_tecnico = _token(cliente, "tecnico@vertere.com")
        laudo_id = cliente.post(
            "/laudos",
            json={"atendimento_id": cenario.atendimento_id, "exame_id": cenario.exame_id},
            headers=_cabecalho(token_tecnico),
        ).json()["id"]
        outra_clinica_id = cliente.post(
            "/clinicas",
            json={
                "nome": "Outra Clinica",
                "cnpj": "22333444000199",
                "endereco": "Rua B, 456",
                "telefone": "4730002222",
                "email": "contato@outra.com",
            },
            headers=_cabecalho(cenario.token_admin),
        ).json()["id"]
        _criar_usuario_db(session, "clinica2@vertere.com", Papel.CLINICA, clinica_id=outra_clinica_id)
        token_clinica2 = _token(cliente, "clinica2@vertere.com")

        resposta = cliente.get(f"/laudos/{laudo_id}", headers=_cabecalho(token_clinica2))

        assert resposta.status_code == 404
