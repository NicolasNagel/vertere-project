from enum import StrEnum
from typing import Protocol

import bcrypt

from vertere_api.auth.domain import Papel, Usuario


class Acao(StrEnum):
    """Ações que outros módulos consultam via `authorize`. Cresce conforme
    Clínicas, Veterinários, Pacientes, Atendimentos, Laudos e Fechamento
    forem implementados."""

    FINANCEIRO_VER = "financeiro:ver"
    FECHAMENTO_GERENCIAR = "fechamento:gerenciar"
    ATENDIMENTO_GERENCIAR = "atendimento:gerenciar"
    ATENDIMENTO_VER = "atendimento:ver"
    PACIENTE_VER = "paciente:ver"
    LAUDO_VER = "laudo:ver"
    CLINICA_GERENCIAR = "clinica:gerenciar"
    CLINICA_VER = "clinica:ver"
    VETERINARIO_GERENCIAR = "veterinario:gerenciar"
    VETERINARIO_VER = "veterinario:ver"
    PACIENTE_GERENCIAR = "paciente:gerenciar"
    PACIENTE_INATIVAR = "paciente:inativar"
    EXAME_GERENCIAR = "exame:gerenciar"
    EXAME_VER = "exame:ver"
    REGRA_PLANTAO_GERENCIAR = "regra_plantao:gerenciar"
    REGRA_PLANTAO_VER = "regra_plantao:ver"
    TEMPLATE_LAUDO_GERENCIAR = "template_laudo:gerenciar"
    TEMPLATE_LAUDO_VER = "template_laudo:ver"
    LAUDO_GERENCIAR = "laudo:gerenciar"


# Ações cujo acesso é restrito à própria clínica quando o papel é CLINICA.
_ACOES_COM_ESCOPO_DE_CLINICA = {Acao.PACIENTE_VER, Acao.LAUDO_VER, Acao.ATENDIMENTO_VER}

_PERMISSOES: dict[Papel, set[Acao]] = {
    Papel.ADMIN: {
        Acao.FINANCEIRO_VER,
        Acao.FECHAMENTO_GERENCIAR,
        Acao.ATENDIMENTO_GERENCIAR,
        Acao.ATENDIMENTO_VER,
        Acao.PACIENTE_VER,
        Acao.LAUDO_VER,
        Acao.CLINICA_GERENCIAR,
        Acao.CLINICA_VER,
        Acao.VETERINARIO_GERENCIAR,
        Acao.VETERINARIO_VER,
        Acao.PACIENTE_GERENCIAR,
        Acao.PACIENTE_INATIVAR,
        Acao.EXAME_GERENCIAR,
        Acao.EXAME_VER,
        Acao.REGRA_PLANTAO_GERENCIAR,
        Acao.REGRA_PLANTAO_VER,
        Acao.TEMPLATE_LAUDO_GERENCIAR,
        Acao.TEMPLATE_LAUDO_VER,
        Acao.LAUDO_GERENCIAR,
    },
    Papel.ATENDENTE: {
        Acao.ATENDIMENTO_GERENCIAR,
        Acao.ATENDIMENTO_VER,
        Acao.PACIENTE_VER,
        Acao.CLINICA_VER,
        Acao.VETERINARIO_VER,
        Acao.PACIENTE_GERENCIAR,
        Acao.EXAME_VER,
        Acao.REGRA_PLANTAO_VER,
    },
    Papel.TECNICO: {
        Acao.ATENDIMENTO_VER,
        Acao.PACIENTE_VER,
        Acao.LAUDO_VER,
        Acao.CLINICA_VER,
        Acao.VETERINARIO_VER,
        Acao.EXAME_VER,
        Acao.TEMPLATE_LAUDO_VER,
        Acao.LAUDO_GERENCIAR,
    },
    Papel.CLINICA: {
        Acao.ATENDIMENTO_VER,
        Acao.PACIENTE_VER,
        Acao.LAUDO_VER,
        Acao.CLINICA_VER,
        Acao.VETERINARIO_VER,
        Acao.EXAME_VER,
    },
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
