import uuid
from datetime import UTC, datetime

from vertere_api.auth.sessao import sessao_expirada

_SESSOES: dict[str, dict] = {}
"""Store em memória, single-process. Suficiente para o tráfego esperado do MVP;
revisar para um store compartilhado (ex: Redis) se o backend escalar para
múltiplos processos/workers."""


def criar_sessao(usuario_id: str) -> str:
    sid = str(uuid.uuid4())
    _SESSOES[sid] = {"usuario_id": usuario_id, "ultima_atividade": datetime.now(UTC)}
    return sid


def tocar_sessao(sid: str) -> str | None:
    """Valida e renova a sessão (sliding expiration).

    Retorna o `usuario_id` se a sessão existe e não expirou (renovando a
    última atividade), ou `None` se não existe ou já expirou (removendo-a).
    """
    registro = _SESSOES.get(sid)
    if registro is None:
        return None
    if sessao_expirada(registro["ultima_atividade"], datetime.now(UTC)):
        del _SESSOES[sid]
        return None
    registro["ultima_atividade"] = datetime.now(UTC)
    return registro["usuario_id"]


def encerrar_sessao(sid: str) -> None:
    _SESSOES.pop(sid, None)


def limpar_sessoes() -> None:
    """Uso em testes."""
    _SESSOES.clear()
