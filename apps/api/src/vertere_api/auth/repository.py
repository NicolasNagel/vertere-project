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
