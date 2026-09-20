from sqlalchemy.orm import Session

from vertere_api.veterinarios.domain import Veterinario
from vertere_api.veterinarios.models import VeterinarioModel


class SQLAlchemyVeterinarioRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_crmv(self, crmv: str) -> Veterinario | None:
        modelo = (
            self._session.query(VeterinarioModel)
            .filter(VeterinarioModel.crmv == crmv)
            .one_or_none()
        )
        return self._para_dominio(modelo)

    def buscar_por_id(self, veterinario_id: str) -> Veterinario | None:
        modelo = self._session.get(VeterinarioModel, veterinario_id)
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[Veterinario]:
        modelos = self._session.query(VeterinarioModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, veterinario: Veterinario) -> None:
        modelo = self._session.get(VeterinarioModel, veterinario.id)
        if modelo is None:
            modelo = VeterinarioModel(id=veterinario.id)
            self._session.add(modelo)
        modelo.nome = veterinario.nome
        modelo.crmv = veterinario.crmv
        modelo.telefone = veterinario.telefone
        modelo.email = veterinario.email
        modelo.clinica_id = veterinario.clinica_id
        modelo.ativo = veterinario.ativo
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: VeterinarioModel | None) -> Veterinario | None:
        if modelo is None:
            return None
        return Veterinario(
            id=modelo.id,
            nome=modelo.nome,
            crmv=modelo.crmv,
            telefone=modelo.telefone,
            email=modelo.email,
            clinica_id=modelo.clinica_id,
            ativo=modelo.ativo,
        )
