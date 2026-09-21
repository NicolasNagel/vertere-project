from sqlalchemy.orm import Session

from vertere_api.financeiro.domain import Fechamento
from vertere_api.financeiro.models import FechamentoModel


class SQLAlchemyFechamentoRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_id(self, fechamento_id: str) -> Fechamento | None:
        modelo = self._session.get(FechamentoModel, fechamento_id)
        return self._para_dominio(modelo)

    def buscar_por_clinica_periodo(self, clinica_id: str, ano: int, mes: int) -> Fechamento | None:
        modelo = (
            self._session.query(FechamentoModel)
            .filter(
                FechamentoModel.clinica_id == clinica_id,
                FechamentoModel.ano == ano,
                FechamentoModel.mes == mes,
            )
            .one_or_none()
        )
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[Fechamento]:
        modelos = self._session.query(FechamentoModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, fechamento: Fechamento) -> None:
        modelo = self._session.get(FechamentoModel, fechamento.id)
        if modelo is None:
            modelo = FechamentoModel(id=fechamento.id)
            self._session.add(modelo)
        modelo.clinica_id = fechamento.clinica_id
        modelo.ano = fechamento.ano
        modelo.mes = fechamento.mes
        modelo.valor_total = fechamento.valor_total
        modelo.quantidade_atendimentos = fechamento.quantidade_atendimentos
        modelo.data_fechamento = fechamento.data_fechamento
        modelo.pago = fechamento.pago
        modelo.data_pagamento = fechamento.data_pagamento
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: FechamentoModel | None) -> Fechamento | None:
        if modelo is None:
            return None
        return Fechamento(
            id=modelo.id,
            clinica_id=modelo.clinica_id,
            ano=modelo.ano,
            mes=modelo.mes,
            valor_total=modelo.valor_total,
            quantidade_atendimentos=modelo.quantidade_atendimentos,
            data_fechamento=modelo.data_fechamento,
            pago=modelo.pago,
            data_pagamento=modelo.data_pagamento,
        )
