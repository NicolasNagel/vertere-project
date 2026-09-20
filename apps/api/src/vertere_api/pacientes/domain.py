from dataclasses import dataclass


@dataclass(frozen=True)
class Paciente:
    id: str
    nome: str
    especie: str
    raca: str
    sexo: str
    idade: int
    proprietario: str
    clinica_id: str
    ativo: bool
