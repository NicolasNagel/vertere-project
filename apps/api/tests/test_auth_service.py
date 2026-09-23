import pytest

from vertere_api.auth.domain import Papel, Usuario
from vertere_api.auth.service import (
    Acao,
    AutenticacaoInvalida,
    authenticate,
    authorize,
    hash_senha,
)


class RepositorioFake:
    def __init__(self, usuarios: list[Usuario]) -> None:
        self._por_email = {u.email: u for u in usuarios}

    def buscar_por_email(self, email: str) -> Usuario | None:
        return self._por_email.get(email)


@pytest.fixture
def admin() -> Usuario:
    return Usuario(
        id="1",
        email="admin@vertere.com",
        senha_hash=hash_senha("senha-correta"),
        papel=Papel.ADMIN,
        ativo=True,
    )


@pytest.fixture
def atendente() -> Usuario:
    return Usuario(
        id="2",
        email="atendente@vertere.com",
        senha_hash=hash_senha("senha-correta"),
        papel=Papel.ATENDENTE,
        ativo=True,
    )


@pytest.fixture
def usuario_inativo() -> Usuario:
    return Usuario(
        id="3",
        email="inativo@vertere.com",
        senha_hash=hash_senha("senha-correta"),
        papel=Papel.ATENDENTE,
        ativo=False,
    )


class TestAuthenticate:
    def test_login_valido_retorna_usuario(self, admin: Usuario) -> None:
        repo = RepositorioFake([admin])

        resultado = authenticate("admin@vertere.com", "senha-correta", repo)

        assert resultado == admin

    def test_senha_errada_levanta_erro_generico(self, admin: Usuario) -> None:
        repo = RepositorioFake([admin])

        with pytest.raises(AutenticacaoInvalida):
            authenticate("admin@vertere.com", "senha-errada", repo)

    def test_email_inexistente_levanta_o_mesmo_erro_generico(self) -> None:
        repo = RepositorioFake([])

        with pytest.raises(AutenticacaoInvalida):
            authenticate("ninguem@vertere.com", "qualquer-coisa", repo)

    def test_conta_inativa_e_rejeitada_mesmo_com_senha_correta(
        self, usuario_inativo: Usuario
    ) -> None:
        repo = RepositorioFake([usuario_inativo])

        with pytest.raises(AutenticacaoInvalida):
            authenticate("inativo@vertere.com", "senha-correta", repo)


class TestAuthorize:
    def test_admin_pode_ver_financeiro(self) -> None:
        assert authorize(Papel.ADMIN, Acao.FINANCEIRO_VER) is True

    def test_atendente_nao_pode_ver_financeiro(self) -> None:
        assert authorize(Papel.ATENDENTE, Acao.FINANCEIRO_VER) is False

    def test_tecnico_nao_pode_ver_financeiro(self) -> None:
        assert authorize(Papel.TECNICO, Acao.FINANCEIRO_VER) is False

    def test_atendente_pode_gerenciar_atendimento(self) -> None:
        assert authorize(Papel.ATENDENTE, Acao.ATENDIMENTO_GERENCIAR) is True

    def test_admin_pode_gerenciar_fechamento(self) -> None:
        assert authorize(Papel.ADMIN, Acao.FECHAMENTO_GERENCIAR) is True

    def test_atendente_nao_pode_gerenciar_fechamento(self) -> None:
        assert authorize(Papel.ATENDENTE, Acao.FECHAMENTO_GERENCIAR) is False

    def test_tecnico_nao_pode_gerenciar_fechamento(self) -> None:
        assert authorize(Papel.TECNICO, Acao.FECHAMENTO_GERENCIAR) is False

    def test_clinica_nao_pode_gerenciar_fechamento(self) -> None:
        assert authorize(Papel.CLINICA, Acao.FECHAMENTO_GERENCIAR) is False

    def test_clinica_pode_ver_paciente_da_propria_clinica(self) -> None:
        assert (
            authorize(
                Papel.CLINICA,
                Acao.PACIENTE_VER,
                clinica_usuario="clinica-a",
                clinica_recurso="clinica-a",
            )
            is True
        )

    def test_clinica_nao_pode_ver_paciente_de_outra_clinica(self) -> None:
        assert (
            authorize(
                Papel.CLINICA,
                Acao.PACIENTE_VER,
                clinica_usuario="clinica-a",
                clinica_recurso="clinica-b",
            )
            is False
        )

    def test_clinica_sem_contexto_e_negada_por_padrao(self) -> None:
        assert authorize(Papel.CLINICA, Acao.PACIENTE_VER) is False

    def test_clinica_pode_ver_atendimento_da_propria_clinica(self) -> None:
        assert (
            authorize(
                Papel.CLINICA,
                Acao.ATENDIMENTO_VER,
                clinica_usuario="clinica-a",
                clinica_recurso="clinica-a",
            )
            is True
        )

    def test_clinica_nao_pode_ver_atendimento_de_outra_clinica(self) -> None:
        assert (
            authorize(
                Papel.CLINICA,
                Acao.ATENDIMENTO_VER,
                clinica_usuario="clinica-a",
                clinica_recurso="clinica-b",
            )
            is False
        )

    @pytest.mark.parametrize("papel", [Papel.ADMIN, Papel.ATENDENTE, Papel.TECNICO])
    def test_somente_clinica_pode_acessar_portal(self, papel: Papel) -> None:
        assert authorize(papel, Acao.PORTAL_ACESSAR) is False

    def test_clinica_pode_acessar_portal(self) -> None:
        assert authorize(Papel.CLINICA, Acao.PORTAL_ACESSAR) is True
