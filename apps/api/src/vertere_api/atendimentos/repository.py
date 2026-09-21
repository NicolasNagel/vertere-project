from sqlalchemy.orm import Session

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.atendimentos.models import AtendimentoItemExameModel, AtendimentoModel


class SQLAlchemyAtendimentoRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_id(self, atendimento_id: str) -> Atendimento | None:
        modelo = self._session.get(AtendimentoModel, atendimento_id)
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[Atendimento]:
        modelos = self._session.query(AtendimentoModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, atendimento: Atendimento) -> None:
        modelo = self._session.get(AtendimentoModel, atendimento.id)
        if modelo is None:
            modelo = AtendimentoModel(id=atendimento.id)
            self._session.add(modelo)
        modelo.clinica_id = atendimento.clinica_id
        modelo.veterinario_id = atendimento.veterinario_id
        modelo.paciente_id = atendimento.paciente_id
        modelo.metodo_coleta = atendimento.metodo_coleta
        modelo.data_hora = atendimento.data_hora
        modelo.regra_plantao_id = atendimento.regra_plantao_id
        modelo.valor_adicional_plantao = atendimento.valor_adicional_plantao
        modelo.desconto = atendimento.desconto
        modelo.valor_total = atendimento.valor_total
        modelo.status = atendimento.status.value
        modelo.itens_exame = [
            AtendimentoItemExameModel(
                exame_id=item.exame_id,
                preco_unitario=item.preco_unitario,
                quantidade=item.quantidade,
                ordem=indice,
            )
            for indice, item in enumerate(atendimento.itens_exame)
        ]
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: AtendimentoModel | None) -> Atendimento | None:
        if modelo is None:
            return None
        itens = sorted(modelo.itens_exame, key=lambda i: i.ordem)
        return Atendimento(
            id=modelo.id,
            clinica_id=modelo.clinica_id,
            veterinario_id=modelo.veterinario_id,
            paciente_id=modelo.paciente_id,
            itens_exame=[
                ItemExame(
                    exame_id=item.exame_id,
                    preco_unitario=item.preco_unitario,
                    quantidade=item.quantidade,
                )
                for item in itens
            ],
            metodo_coleta=modelo.metodo_coleta,
            data_hora=modelo.data_hora,
            regra_plantao_id=modelo.regra_plantao_id,
            valor_adicional_plantao=modelo.valor_adicional_plantao,
            desconto=modelo.desconto,
            valor_total=modelo.valor_total,
            status=StatusAtendimento(modelo.status),
        )
