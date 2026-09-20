from pydantic import BaseModel, EmailStr

from vertere_api.auth.domain import Papel


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioResponse(BaseModel):
    id: str
    email: str
    papel: Papel
    ativo: bool
    clinica_id: str | None = None


class CriarUsuarioRequest(BaseModel):
    email: EmailStr
    senha: str
    papel: Papel
    clinica_id: str | None = None


class EditarPapelRequest(BaseModel):
    papel: Papel


class ResetarSenhaRequest(BaseModel):
    nova_senha: str
