from pydantic import BaseModel, ConfigDict


class PacienteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
