from enum import StrEnum
from typing import Protocol

import bcrypt

from vertere_api.auth.domain import Papel, Usuario


class Acao(StrEnum):
    """Ações que outros módulos consultam via `authorize`. Cresce conforme
    Clínicas, Veterinários, Pacientes, Atendimentos, Laudos e Fechamento
    forem implementados."""

    FINANCEIRO_VER = "financeiro:ver"
    ATENDIMENTO_CRIAR = "atendimento:criar"
    PACIENTE_VER = "paciente:ver"
    LAUDO_VER = "laudo:ver"
    CLINICA_GERENCIAR = "clinica:gerenciar"


# Ações cujo acesso é restrito à própria clínica quando o papel é CLINICA.
_ACOES_COM_ESCOPO_DE_CLINICA = {Acao.PACIENTE_VER, Acao.LAUDO_VER}

_PERMISSOES: dict[Papel, set[Acao]] = {
    Papel.ADMIN: {
        Acao.FINANCEIRO_VER,
        Acao.ATENDIMENTO_CRIAR,
        Acao.PACIENTE_VER,
        Acao.LAUDO_VER,
        Acao.CLINICA_GERENCIAR,
    },
    Papel.ATENDENTE: {Acao.ATENDIMENTO_CRIAR, Acao.PACIENTE_VER},
    Papel.TECNICO: {Acao.PACIENTE_VER, Acao.LAUDO_VER},
    Papel.CLINICA: {Acao.PACIENTE_VER, Acao.LAUDO_VER},
}


class UsuarioRepository(Protocol):
    def buscar_por_email(self, email: str) -> Usuario | None: ...
    def buscar_por_id(self, usuario_id: str) -> Usuario | None: ...
    def salvar(self, usuario: Usuario) -> None: ...


class AutenticacaoInvalida(Exception):
    """Levantada para credenciais erradas ou conta inativa.

    Mensagem intencionalmente genérica: não revela se o e-mail existe,
    nem se a falha foi por senha errada ou conta desativada.
    """

    def __init__(self) -> None:
        super().__init__("E-mail ou senha inválidos")


def authenticate(email: str, senha: str, repo: UsuarioRepository) -> Usuario:
    """Autentica um usuário por e-mail/senha.

    Retorna o `Usuario` autenticado, ou levanta `AutenticacaoInvalida` para
    qualquer combinação de: e-mail inexistente, senha incorreta, ou conta
    inativa. As três causas produzem o mesmo erro para não vazar informação
    sobre contas cadastradas.
    """
    usuario = repo.buscar_por_email(email)
    if usuario is None or not usuario.ativo:
        raise AutenticacaoInvalida()
    if not bcrypt.checkpw(senha.encode("utf-8"), usuario.senha_hash.encode("utf-8")):
        raise AutenticacaoInvalida()
    return usuario


def authorize(
    papel: Papel,
    acao: Acao,
    *,
    clinica_usuario: str | None = None,
    clinica_recurso: str | None = None,
) -> bool:
    """Decide se `papel` pode executar `acao`.

    Para ações com escopo de clínica (ex: ver paciente/laudo), um usuário do
    papel CLINICA só é autorizado quando `clinica_usuario == clinica_recurso`.
    Os demais papéis não são restritos por clínica.
    """
    if acao not in _PERMISSOES.get(papel, set()):
        return False

    if papel is Papel.CLINICA and acao in _ACOES_COM_ESCOPO_DE_CLINICA:
        return clinica_usuario is not None and clinica_usuario == clinica_recurso

    return True


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
