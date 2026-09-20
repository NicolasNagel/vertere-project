from sqlalchemy.orm import Session

from vertere_api.auth.domain import Usuario
from vertere_api.auth.models import UsuarioModel


class SQLAlchemyUsuarioRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_email(self, email: str) -> Usuario | None:
        modelo = (
            self._session.query(UsuarioModel)
            .filter(UsuarioModel.email == email)
            .one_or_none()
        )
        return self._para_dominio(modelo)

    def buscar_por_id(self, usuario_id: str) -> Usuario | None:
        modelo = self._session.get(UsuarioModel, usuario_id)
        return self._para_dominio(modelo)

    def salvar(self, usuario: Usuario) -> None:
        modelo = self._session.get(UsuarioModel, usuario.id)
        if modelo is None:
            modelo = UsuarioModel(id=usuario.id)
            self._session.add(modelo)
        modelo.email = usuario.email
        modelo.senha_hash = usuario.senha_hash
        modelo.papel = usuario.papel
        modelo.ativo = usuario.ativo
        modelo.clinica_id = usuario.clinica_id
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: UsuarioModel | None) -> Usuario | None:
        if modelo is None:
            return None
        return Usuario(
            id=modelo.id,
            email=modelo.email,
            senha_hash=modelo.senha_hash,
            papel=modelo.papel,
            ativo=modelo.ativo,
            clinica_id=modelo.clinica_id,
        )
