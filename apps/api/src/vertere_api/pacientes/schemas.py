from pydantic import BaseModel


class PacienteResponse(BaseModel):
    id: str
    nome: str
    especie: str
    raca: str
    sexo: str
    idade: int
    proprietario: str
    clinica_id: str
    ativo: bool


class CriarPacienteRequest(BaseModel):
    nome: str
    especie: str
    raca: str
    sexo: str
    idade: int
    proprietario: str
    clinica_id: str


class EditarPacienteRequest(BaseModel):
    nome: str
    especie: str
    raca: str
    sexo: str
    idade: int
    proprietario: str
