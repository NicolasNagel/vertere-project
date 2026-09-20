from pydantic import BaseModel, EmailStr


class ClinicaResponse(BaseModel):
    id: str
    nome: str
    cnpj: str
    endereco: str
    telefone: str
    email: str
    ativo: bool


class CriarClinicaRequest(BaseModel):
    nome: str
    cnpj: str
    endereco: str
    telefone: str
    email: EmailStr


class EditarClinicaRequest(BaseModel):
    nome: str
    endereco: str
    telefone: str
    email: EmailStr
