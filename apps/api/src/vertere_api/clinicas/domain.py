from dataclasses import dataclass


@dataclass(frozen=True)
class Clinica:
    id: str
    nome: str
    cnpj: str
    endereco: str
    telefone: str
    email: str
    ativo: bool
