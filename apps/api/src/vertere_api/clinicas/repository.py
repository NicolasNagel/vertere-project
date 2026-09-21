from sqlalchemy.orm import Session

from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.models import ClinicaModel


class SQLAlchemyClinicaRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_cnpj(self, cnpj: str) -> Clinica | None:
        modelo = (
            self._session.query(ClinicaModel)
            .filter(ClinicaModel.cnpj == cnpj)
            .one_or_none()
        )
        return self._para_dominio(modelo)

    def buscar_por_id(self, clinica_id: str) -> Clinica | None:
        modelo = self._session.get(ClinicaModel, clinica_id)
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[Clinica]:
        modelos = self._session.query(ClinicaModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, clinica: Clinica) -> None:
        modelo = self._session.get(ClinicaModel, clinica.id)
        if modelo is None:
            modelo = ClinicaModel(id=clinica.id)
            self._session.add(modelo)
        modelo.nome = clinica.nome
        modelo.cnpj = clinica.cnpj
        modelo.endereco = clinica.endereco
        modelo.telefone = clinica.telefone
        modelo.email = clinica.email
        modelo.ativo = clinica.ativo
        modelo.prazo_pagamento_dias = clinica.prazo_pagamento_dias
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: ClinicaModel | None) -> Clinica | None:
        if modelo is None:
            return None
        return Clinica(
            id=modelo.id,
            nome=modelo.nome,
            cnpj=modelo.cnpj,
            endereco=modelo.endereco,
            telefone=modelo.telefone,
            email=modelo.email,
            ativo=modelo.ativo,
            prazo_pagamento_dias=modelo.prazo_pagamento_dias,
        )
