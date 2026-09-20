import pytest

from vertere_api.auth.domain import Papel, Usuario
from vertere_api.auth.usuarios_service import (
    EmailJaCadastrado,
    UsuarioNaoEncontrado,
    criar_usuario,
    desativar_usuario,
    editar_papel,
    reativar_usuario,
    resetar_senha,
)


class RepositorioFake:
    def __init__(self, usuarios: list[Usuario] | None = None) -> None:
        self._por_id = {u.id: u for u in (usuarios or [])}

    def buscar_por_email(self, email: str) -> Usuario | None:
        for usuario in self._por_id.values():
            if usuario.email == email:
                return usuario
        return None

    def buscar_por_id(self, usuario_id: str) -> Usuario | None:
        return self._por_id.get(usuario_id)

    def salvar(self, usuario: Usuario) -> None:
        self._por_id[usuario.id] = usuario


class TestCriarUsuario:
    def test_cria_usuario_com_papel_definido(self) -> None:
        repo = RepositorioFake()

        usuario = criar_usuario(
            email="novo@vertere.com", senha="senha-123", papel=Papel.ATENDENTE, repo=repo
        )

        assert usuario.email == "novo@vertere.com"
        assert usuario.papel == Papel.ATENDENTE
        assert usuario.ativo is True
        assert repo.buscar_por_email("novo@vertere.com") == usuario

    def test_senha_e_armazenada_com_hash_nunca_em_texto_plano(self) -> None:
        repo = RepositorioFake()

        usuario = criar_usuario(
            email="novo@vertere.com", senha="senha-123", papel=Papel.ATENDENTE, repo=repo
        )

        assert usuario.senha_hash != "senha-123"

    def test_usuario_clinica_guarda_clinica_id(self) -> None:
        repo = RepositorioFake()

        usuario = criar_usuario(
            email="clinica@vertere.com",
            senha="senha-123",
            papel=Papel.CLINICA,
            repo=repo,
            clinica_id="clinica-a",
        )

        assert usuario.clinica_id == "clinica-a"

    def test_email_duplicado_e_rejeitado(self) -> None:
        existente = Usuario(
            id="1", email="ja-existe@vertere.com", senha_hash="x", papel=Papel.ADMIN, ativo=True
        )
        repo = RepositorioFake([existente])

        with pytest.raises(EmailJaCadastrado):
            criar_usuario(
                email="ja-existe@vertere.com", senha="senha-123", papel=Papel.ATENDENTE, repo=repo
            )


class TestEditarPapel:
    def test_edita_papel_de_usuario_existente(self) -> None:
        usuario = Usuario(id="1", email="a@vertere.com", senha_hash="x", papel=Papel.ATENDENTE, ativo=True)
        repo = RepositorioFake([usuario])

        atualizado = editar_papel(usuario_id="1", novo_papel=Papel.TECNICO, repo=repo)

        assert atualizado.papel == Papel.TECNICO
        assert repo.buscar_por_id("1").papel == Papel.TECNICO

    def test_editar_papel_de_usuario_inexistente_levanta_erro(self) -> None:
        repo = RepositorioFake()

        with pytest.raises(UsuarioNaoEncontrado):
            editar_papel(usuario_id="inexistente", novo_papel=Papel.ADMIN, repo=repo)


class TestDesativarReativarUsuario:
    def test_desativa_usuario_ativo(self) -> None:
        usuario = Usuario(id="1", email="a@vertere.com", senha_hash="x", papel=Papel.ATENDENTE, ativo=True)
        repo = RepositorioFake([usuario])

        atualizado = desativar_usuario(usuario_id="1", repo=repo)

        assert atualizado.ativo is False
        assert repo.buscar_por_id("1").ativo is False

    def test_reativa_usuario_inativo(self) -> None:
        usuario = Usuario(id="1", email="a@vertere.com", senha_hash="x", papel=Papel.ATENDENTE, ativo=False)
        repo = RepositorioFake([usuario])

        atualizado = reativar_usuario(usuario_id="1", repo=repo)

        assert atualizado.ativo is True
        assert repo.buscar_por_id("1").ativo is True

    def test_desativar_usuario_inexistente_levanta_erro(self) -> None:
        repo = RepositorioFake()

        with pytest.raises(UsuarioNaoEncontrado):
            desativar_usuario(usuario_id="inexistente", repo=repo)


class TestResetarSenha:
    def test_reseta_senha_de_usuario_existente(self) -> None:
        usuario = Usuario(
            id="1", email="a@vertere.com", senha_hash="hash-antigo", papel=Papel.ATENDENTE, ativo=True
        )
        repo = RepositorioFake([usuario])

        atualizado = resetar_senha(usuario_id="1", nova_senha="senha-temporaria", repo=repo)

        assert atualizado.senha_hash != "hash-antigo"
        assert atualizado.senha_hash != "senha-temporaria"
        assert repo.buscar_por_id("1").senha_hash == atualizado.senha_hash

    def test_resetar_senha_de_usuario_inexistente_levanta_erro(self) -> None:
        repo = RepositorioFake()

        with pytest.raises(UsuarioNaoEncontrado):
            resetar_senha(usuario_id="inexistente", nova_senha="qualquer-coisa", repo=repo)
