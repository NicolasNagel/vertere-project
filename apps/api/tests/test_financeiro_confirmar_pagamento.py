from datetime import datetime
from decimal import Decimal

import pytest

from vertere_api.financeiro.domain import Fechamento
from vertere_api.financeiro.service import (
    FechamentoJaPago,
    FechamentoNaoEncontrado,
    confirmar_pagamento,
)


class FechamentoRepositorioFake:
    def __init__(self, fechamentos: list[Fechamento] | None = None) -> None:
        self._por_id = {f.id: f for f in (fechamentos or [])}

    def buscar_por_id(self, fechamento_id: str) -> Fechamento | None:
        return self._por_id.get(fechamento_id)

    def buscar_por_clinica_periodo(self, clinica_id: str, ano: int, mes: int) -> Fechamento | None:
        for f in self._por_id.values():
            if f.clinica_id == clinica_id and f.ano == ano and f.mes == mes:
                return f
        return None

    def listar_todas(self) -> list[Fechamento]:
        return list(self._por_id.values())

    def salvar(self, fechamento: Fechamento) -> None:
        self._por_id[fechamento.id] = fechamento


def _fechamento(pago: bool = False, data_pagamento: datetime | None = None) -> Fechamento:
    return Fechamento(
        id="fechamento-1",
        clinica_id="clinica-1",
        ano=2026,
        mes=9,
        valor_total=Decimal("150.00"),
        quantidade_atendimentos=2,
        data_fechamento=datetime(2026, 10, 1),
        pago=pago,
        data_pagamento=data_pagamento,
    )


class TestConfirmarPagamento:
    def test_confirma_pagamento_pendente(self) -> None:
        repo = FechamentoRepositorioFake([_fechamento()])

        atualizado = confirmar_pagamento("fechamento-1", repo, data_pagamento=datetime(2026, 10, 5))

        assert atualizado.pago is True
        assert atualizado.data_pagamento == datetime(2026, 10, 5)
        assert repo.buscar_por_id("fechamento-1").pago is True

    def test_confirma_pagamento_sem_data_usa_agora(self) -> None:
        repo = FechamentoRepositorioFake([_fechamento()])

        atualizado = confirmar_pagamento("fechamento-1", repo)

        assert atualizado.pago is True
        assert atualizado.data_pagamento is not None

    def test_confirmar_fechamento_ja_pago_e_rejeitado(self) -> None:
        repo = FechamentoRepositorioFake([_fechamento(pago=True, data_pagamento=datetime(2026, 10, 2))])

        with pytest.raises(FechamentoJaPago):
            confirmar_pagamento("fechamento-1", repo)

    def test_confirmar_fechamento_inexistente_levanta_erro(self) -> None:
        repo = FechamentoRepositorioFake()

        with pytest.raises(FechamentoNaoEncontrado):
            confirmar_pagamento("inexistente", repo)
