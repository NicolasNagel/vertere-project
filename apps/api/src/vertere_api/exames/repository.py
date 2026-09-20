from sqlalchemy.orm import Session

from vertere_api.exames.domain import Exame, RegraPlantao
from vertere_api.exames.models import ExameModel, RegraPlantaoModel


class SQLAlchemyExameRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_id(self, exame_id: str) -> Exame | None:
        modelo = self._session.get(ExameModel, exame_id)
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[Exame]:
        modelos = self._session.query(ExameModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, exame: Exame) -> None:
        modelo = self._session.get(ExameModel, exame.id)
        if modelo is None:
            modelo = ExameModel(id=exame.id)
            self._session.add(modelo)
        modelo.categoria = exame.categoria
        modelo.nome = exame.nome
        modelo.preco_base = exame.preco_base
        modelo.ativo = exame.ativo
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: ExameModel | None) -> Exame | None:
        if modelo is None:
            return None
        return Exame(
            id=modelo.id,
            categoria=modelo.categoria,
            nome=modelo.nome,
            preco_base=modelo.preco_base,
            ativo=modelo.ativo,
        )


class SQLAlchemyRegraPlantaoRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_id(self, regra_id: str) -> RegraPlantao | None:
        modelo = self._session.get(RegraPlantaoModel, regra_id)
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[RegraPlantao]:
        modelos = self._session.query(RegraPlantaoModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, regra: RegraPlantao) -> None:
        modelo = self._session.get(RegraPlantaoModel, regra.id)
        if modelo is None:
            modelo = RegraPlantaoModel(id=regra.id)
            self._session.add(modelo)
        modelo.dia_semana = regra.dia_semana
        modelo.hora_inicio = regra.hora_inicio
        modelo.hora_fim = regra.hora_fim
        modelo.valor_adicional = regra.valor_adicional
        modelo.ativo = regra.ativo
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: RegraPlantaoModel | None) -> RegraPlantao | None:
        if modelo is None:
            return None
        return RegraPlantao(
            id=modelo.id,
            dia_semana=modelo.dia_semana,
            hora_inicio=modelo.hora_inicio,
            hora_fim=modelo.hora_fim,
            valor_adicional=modelo.valor_adicional,
            ativo=modelo.ativo,
        )
