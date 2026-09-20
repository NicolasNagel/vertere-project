import uuid

from vertere_api.auth.domain import Papel, Usuario
from vertere_api.auth.service import UsuarioRepository, hash_senha


class EmailJaCadastrado(Exception):
    def __init__(self, email: str) -> None:
        super().__init__(f"Já existe um usuário com o e-mail {email}")


class UsuarioNaoEncontrado(Exception):
    def __init__(self, usuario_id: str) -> None:
        super().__init__(f"Usuário {usuario_id} não encontrado")


def criar_usuario(
    email: str,
    senha: str,
    papel: Papel,
    repo: UsuarioRepository,
    clinica_id: str | None = None,
) -> Usuario:
    """Cria um usuário com papel definido. Rejeita e-mail já cadastrado."""
    if repo.buscar_por_email(email) is not None:
        raise EmailJaCadastrado(email)

    usuario = Usuario(
        id=str(uuid.uuid4()),
        email=email,
        senha_hash=hash_senha(senha),
        papel=papel,
        ativo=True,
        clinica_id=clinica_id,
    )
    repo.salvar(usuario)
    return usuario


def _buscar_ou_levantar(usuario_id: str, repo: UsuarioRepository) -> Usuario:
    usuario = repo.buscar_por_id(usuario_id)
    if usuario is None:
        raise UsuarioNaoEncontrado(usuario_id)
    return usuario


def editar_papel(usuario_id: str, novo_papel: Papel, repo: UsuarioRepository) -> Usuario:
    """Edita o papel de um usuário existente, mantendo o restante do cadastro."""
    usuario = _buscar_ou_levantar(usuario_id, repo)
    atualizado = Usuario(
        id=usuario.id,
        email=usuario.email,
        senha_hash=usuario.senha_hash,
        papel=novo_papel,
        ativo=usuario.ativo,
        clinica_id=usuario.clinica_id,
    )
    repo.salvar(atualizado)
    return atualizado


def desativar_usuario(usuario_id: str, repo: UsuarioRepository) -> Usuario:
    """Desativa um usuário — `authenticate` passa a rejeitá-lo imediatamente."""
    return _definir_estado_ativo(usuario_id, ativo=False, repo=repo)


def reativar_usuario(usuario_id: str, repo: UsuarioRepository) -> Usuario:
    """Reativa um usuário previamente desativado."""
    return _definir_estado_ativo(usuario_id, ativo=True, repo=repo)


def resetar_senha(usuario_id: str, nova_senha: str, repo: UsuarioRepository) -> Usuario:
    """Reset administrativo: define uma nova senha (temporária) para o usuário.

    Operação do admin, sem depender de e-mail transacional (fora do MVP).
    """
    usuario = _buscar_ou_levantar(usuario_id, repo)
    atualizado = Usuario(
        id=usuario.id,
        email=usuario.email,
        senha_hash=hash_senha(nova_senha),
        papel=usuario.papel,
        ativo=usuario.ativo,
        clinica_id=usuario.clinica_id,
    )
    repo.salvar(atualizado)
    return atualizado


def _definir_estado_ativo(usuario_id: str, ativo: bool, repo: UsuarioRepository) -> Usuario:
    usuario = _buscar_ou_levantar(usuario_id, repo)
    atualizado = Usuario(
        id=usuario.id,
        email=usuario.email,
        senha_hash=usuario.senha_hash,
        papel=usuario.papel,
        ativo=ativo,
        clinica_id=usuario.clinica_id,
    )
    repo.salvar(atualizado)
    return atualizado
