from sqlalchemy.orm import Session

from vertere_api.laudos.domain import (
    CampoTemplate,
    Laudo,
    StatusLaudo,
    TemplateLaudo,
    ValorCampo,
)
from vertere_api.laudos.models import LaudoModel, TemplateLaudoModel


class SQLAlchemyTemplateLaudoRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_id(self, template_id: str) -> TemplateLaudo | None:
        modelo = self._session.get(TemplateLaudoModel, template_id)
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[TemplateLaudo]:
        modelos = self._session.query(TemplateLaudoModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, template: TemplateLaudo) -> None:
        modelo = self._session.get(TemplateLaudoModel, template.id)
        if modelo is None:
            modelo = TemplateLaudoModel(id=template.id)
            self._session.add(modelo)
        modelo.categoria = template.categoria
        modelo.campos = [
            {"nome": c.nome, "unidade": c.unidade, "faixa_referencia": c.faixa_referencia}
            for c in template.campos
        ]
        modelo.ativo = template.ativo
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: TemplateLaudoModel | None) -> TemplateLaudo | None:
        if modelo is None:
            return None
        return TemplateLaudo(
            id=modelo.id,
            categoria=modelo.categoria,
            campos=[
                CampoTemplate(
                    nome=c["nome"], unidade=c["unidade"], faixa_referencia=c["faixa_referencia"]
                )
                for c in modelo.campos
            ],
            ativo=modelo.ativo,
        )


class SQLAlchemyLaudoRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_id(self, laudo_id: str) -> Laudo | None:
        modelo = self._session.get(LaudoModel, laudo_id)
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[Laudo]:
        modelos = self._session.query(LaudoModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, laudo: Laudo) -> None:
        modelo = self._session.get(LaudoModel, laudo.id)
        if modelo is None:
            modelo = LaudoModel(id=laudo.id)
            self._session.add(modelo)
        modelo.atendimento_id = laudo.atendimento_id
        modelo.exame_id = laudo.exame_id
        modelo.template_id = laudo.template_id
        modelo.valores = [{"nome_campo": v.nome_campo, "valor": v.valor} for v in laudo.valores]
        modelo.status = laudo.status.value
        modelo.criado_por = laudo.criado_por
        modelo.criado_em = laudo.criado_em
        modelo.finalizado_por = laudo.finalizado_por
        modelo.finalizado_em = laudo.finalizado_em
        modelo.enviado_em = laudo.enviado_em
        modelo.erro_envio = laudo.erro_envio
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: LaudoModel | None) -> Laudo | None:
        if modelo is None:
            return None
        return Laudo(
            id=modelo.id,
            atendimento_id=modelo.atendimento_id,
            exame_id=modelo.exame_id,
            template_id=modelo.template_id,
            valores=[ValorCampo(nome_campo=v["nome_campo"], valor=v["valor"]) for v in modelo.valores],
            status=StatusLaudo(modelo.status),
            criado_por=modelo.criado_por,
            criado_em=modelo.criado_em,
            finalizado_por=modelo.finalizado_por,
            finalizado_em=modelo.finalizado_em,
            enviado_em=modelo.enviado_em,
            erro_envio=modelo.erro_envio,
        )
