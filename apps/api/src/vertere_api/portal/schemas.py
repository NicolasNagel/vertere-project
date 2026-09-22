from pydantic import BaseModel

from vertere_api.atendimentos.schemas import AtendimentoResponse
from vertere_api.laudos.schemas import LaudoResponse
from vertere_api.pacientes.schemas import PacienteResponse


class HistoricoPacienteResponse(BaseModel):
    paciente: PacienteResponse
    atendimentos: list[AtendimentoResponse]
    laudos: list[LaudoResponse]
