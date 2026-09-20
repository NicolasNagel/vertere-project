from dataclasses import dataclass
from enum import StrEnum


class Papel(StrEnum):
    ADMIN = "admin"
    ATENDENTE = "atendente"
    TECNICO = "tecnico"
    CLINICA = "clinica"


@dataclass(frozen=True)
class Usuario:
    id: str
    email: str
    senha_hash: str
    papel: Papel
    ativo: bool
    clinica_id: str | None = None
    """Obrigatório quando papel == Papel.CLINICA; ignorado para os demais papéis."""
