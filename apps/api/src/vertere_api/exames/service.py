from datetime import datetime
from typing import Protocol

from vertere_api.exames.domain import Exame, RegraPlantao


class ExameRepository(Protocol):
    def buscar_por_id(self, exame_id: str) -> Exame | None: ...
    def listar_todas(self) -> list[Exame]: ...
    def salvar(self, exame: Exame) -> None: ...


class RegraPlantaoRepository(Protocol):
    def buscar_por_id(self, regra_id: str) -> RegraPlantao | None: ...
    def listar_todas(self) -> list[RegraPlantao]: ...
    def salvar(self, regra: RegraPlantao) -> None: ...


def _regra_cobre_instante(regra: RegraPlantao, data_hora: datetime) -> bool:
    dia_semana = data_hora.weekday()
    hora = data_hora.time()

    if regra.hora_inicio <= regra.hora_fim:
        return dia_semana == regra.dia_semana and regra.hora_inicio <= hora < regra.hora_fim

    dia_seguinte = (regra.dia_semana + 1) % 7
    if dia_semana == regra.dia_semana:
        return hora >= regra.hora_inicio
    if dia_semana == dia_seguinte:
        return hora < regra.hora_fim
    return False


def calcular_adicional_plantao(
    data_hora: datetime, regras: list[RegraPlantao]
) -> RegraPlantao | None:
    """Decide qual `RegraPlantao` ativa (se houver) se aplica a `data_hora`.

    Regras inativas são ignoradas. Uma regra com `hora_inicio > hora_fim`
    representa uma janela que cruza a meia-noite (ex: 18:00 de `dia_semana`
    até 06:00 do dia seguinte). Se mais de uma regra ativa combinar com o
    mesmo instante, retorna a de maior `valor_adicional` (desempate
    determinístico, decisão de código).
    """
    candidatas = [
        regra for regra in regras if regra.ativo and _regra_cobre_instante(regra, data_hora)
    ]
    if not candidatas:
        return None
    return max(candidatas, key=lambda regra: regra.valor_adicional)
