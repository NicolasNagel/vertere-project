from pydantic import BaseModel, ConfigDict

from vertere_api.atendimentos.schemas import AtendimentoResponse
from vertere_api.laudos.schemas import LaudoResponse
from vertere_api.pacientes.schemas import PacienteResponse


class HistoricoPacienteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    paciente: PacienteResponse
    atendimentos: list[AtendimentoResponse]
    laudos: list[LaudoResponse]
