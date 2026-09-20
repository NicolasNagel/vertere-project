from dataclasses import dataclass


@dataclass(frozen=True)
class Veterinario:
    id: str
    nome: str
    crmv: str
    telefone: str
    email: str
    clinica_id: str
    ativo: bool
