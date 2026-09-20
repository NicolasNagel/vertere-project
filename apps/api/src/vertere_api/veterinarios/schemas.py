from pydantic import BaseModel, EmailStr


class VeterinarioResponse(BaseModel):
    id: str
    nome: str
    crmv: str
    telefone: str
    email: str
    clinica_id: str
    ativo: bool


class CriarVeterinarioRequest(BaseModel):
    nome: str
    crmv: str
    telefone: str
    email: EmailStr
    clinica_id: str


class EditarVeterinarioRequest(BaseModel):
    nome: str
    telefone: str
    email: EmailStr
