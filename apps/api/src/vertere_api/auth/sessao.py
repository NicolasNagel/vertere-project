from datetime import datetime, timedelta

TEMPO_INATIVIDADE_PADRAO = timedelta(minutes=30)
"""Tempo de inatividade após o qual uma sessão é considerada expirada.

O mecanismo de transporte (JWT, cookie de sessão) é decisão do endpoint HTTP
(ver ADR-0002) — esta função só decide, dado um timestamp de última
atividade, se a sessão já deveria ter expirado.
"""


def sessao_expirada(
    ultima_atividade: datetime, agora: datetime, limite: timedelta = TEMPO_INATIVIDADE_PADRAO
) -> bool:
    """Uma sessão expira quando o tempo desde a última atividade excede `limite`."""
    return (agora - ultima_atividade) > limite
