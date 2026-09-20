from datetime import UTC, datetime, timedelta

import jwt

from vertere_api.settings import settings

_ALGORITMO = "HS256"
_VALIDADE_MAXIMA = timedelta(hours=24)
"""Teto absoluto do token, independente de atividade — defesa em profundidade.
A expiração por inatividade (a que a spec pede) é controlada pelo store de
sessão (sessoes_store), não por isto."""


class TokenInvalido(Exception):
    pass


def codificar_token(sid: str) -> str:
    payload = {
        "sid": sid,
        "exp": datetime.now(UTC) + _VALIDADE_MAXIMA,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITMO)


def decodificar_token(token: str) -> str:
    """Retorna o `sid` carregado no token, ou levanta `TokenInvalido`."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITMO])
    except jwt.PyJWTError as erro:
        raise TokenInvalido() from erro
    return payload["sid"]
