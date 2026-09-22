from datetime import datetime

from vertere_api.financeiro.service import FechamentoRepository


class FechamentoPeriodoFechadoChecker:
    """Implementação real de `PeriodoFechadoChecker` (atendimentos), consultando `FechamentoRepository`."""

    def __init__(self, repo: FechamentoRepository) -> None:
        self._repo = repo

    def esta_fechado(self, clinica_id: str, data_hora: datetime) -> bool:
        return (
            self._repo.buscar_por_clinica_periodo(clinica_id, data_hora.year, data_hora.month)
            is not None
        )
