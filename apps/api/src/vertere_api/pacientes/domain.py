from dataclasses import dataclass

from vertere_api.atendimentos.domain import Atendimento
from vertere_api.laudos.domain import Laudo


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


@dataclass(frozen=True)
class HistoricoPaciente:
    """Agregação de leitura para o portal (S9): paciente + seus atendimentos + os laudos desses atendimentos.

    Não é uma entidade persistida — monta-se sob demanda em
    `pacientes.service.buscar_historico_paciente`.
    """

    paciente: Paciente
    atendimentos: list[Atendimento]
    laudos: list[Laudo]
