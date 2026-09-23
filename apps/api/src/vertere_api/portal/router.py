from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from vertere_api.atendimentos.domain import StatusAtendimento
from vertere_api.atendimentos.repository import SQLAlchemyAtendimentoRepository
from vertere_api.atendimentos.schemas import AtendimentoResponse
from vertere_api.atendimentos.service import (
    AtendimentoNaoEncontrado,
    buscar_atendimento,
    listar_atendimentos,
)
from vertere_api.auth.deps import exigir_papel_clinica, obter_db
from vertere_api.auth.domain import Usuario
from vertere_api.laudos.domain import StatusLaudo
from vertere_api.laudos.repository import SQLAlchemyLaudoRepository
from vertere_api.laudos.schemas import LaudoResponse
from vertere_api.laudos.service import LaudoNaoEncontrado, listar_laudos, ver_laudo
from vertere_api.pacientes.repository import SQLAlchemyPacienteRepository
from vertere_api.pacientes.schemas import PacienteResponse
from vertere_api.pacientes.service import (
    PacienteNaoEncontrado,
    buscar_historico_paciente,
    buscar_paciente,
    listar_pacientes,
)
from vertere_api.portal.schemas import HistoricoPacienteResponse

router = APIRouter(prefix="/portal", tags=["portal"], dependencies=[Depends(exigir_papel_clinica)])


@router.get("/pacientes", response_model=list[PacienteResponse])
def listar_pacientes_endpoint(
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_papel_clinica),
) -> list[PacienteResponse]:
    repo = SQLAlchemyPacienteRepository(db)
    pacientes = listar_pacientes(repo, usuario, apenas_ativos=apenas_ativos)
    return [PacienteResponse.model_validate(p) for p in pacientes]


@router.get("/pacientes/{paciente_id}", response_model=PacienteResponse)
def buscar_paciente_endpoint(
    paciente_id: str,
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_papel_clinica),
) -> PacienteResponse:
    try:
        paciente = buscar_paciente(paciente_id, usuario, SQLAlchemyPacienteRepository(db))
    except PacienteNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return PacienteResponse.model_validate(paciente)


@router.get("/pacientes/{paciente_id}/historico", response_model=HistoricoPacienteResponse)
def buscar_historico_paciente_endpoint(
    paciente_id: str,
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_papel_clinica),
) -> HistoricoPacienteResponse:
    try:
        historico = buscar_historico_paciente(
            paciente_id,
            usuario,
            SQLAlchemyPacienteRepository(db),
            SQLAlchemyAtendimentoRepository(db),
            SQLAlchemyLaudoRepository(db),
        )
    except PacienteNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return HistoricoPacienteResponse.model_validate(historico)


@router.get("/atendimentos", response_model=list[AtendimentoResponse])
def listar_atendimentos_endpoint(
    veterinario_id: str | None = Query(default=None),
    atendimento_status: StatusAtendimento | None = Query(default=None, alias="status"),
    data_inicio: datetime | None = Query(default=None),
    data_fim: datetime | None = Query(default=None),
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_papel_clinica),
) -> list[AtendimentoResponse]:
    repo = SQLAlchemyAtendimentoRepository(db)
    atendimentos = listar_atendimentos(
        repo,
        usuario,
        veterinario_id=veterinario_id,
        status=atendimento_status,
        data_inicio=data_inicio,
        data_fim=data_fim,
    )
    return [AtendimentoResponse.model_validate(a) for a in atendimentos]


@router.get("/atendimentos/{atendimento_id}", response_model=AtendimentoResponse)
def buscar_atendimento_endpoint(
    atendimento_id: str,
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_papel_clinica),
) -> AtendimentoResponse:
    try:
        atendimento = buscar_atendimento(atendimento_id, usuario, SQLAlchemyAtendimentoRepository(db))
    except AtendimentoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return AtendimentoResponse.model_validate(atendimento)


@router.get("/laudos", response_model=list[LaudoResponse])
def listar_laudos_endpoint(
    atendimento_id: str | None = Query(default=None),
    laudo_status: StatusLaudo | None = Query(default=None, alias="status"),
    data_inicio: datetime | None = Query(default=None),
    data_fim: datetime | None = Query(default=None),
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_papel_clinica),
) -> list[LaudoResponse]:
    laudos = listar_laudos(
        SQLAlchemyLaudoRepository(db),
        usuario,
        SQLAlchemyAtendimentoRepository(db),
        atendimento_id=atendimento_id,
        status=laudo_status,
        data_inicio=data_inicio,
        data_fim=data_fim,
    )
    return [LaudoResponse.model_validate(l) for l in laudos]


@router.get("/laudos/{laudo_id}", response_model=LaudoResponse)
def ver_laudo_endpoint(
    laudo_id: str,
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_papel_clinica),
) -> LaudoResponse:
    try:
        laudo = ver_laudo(laudo_id, usuario, SQLAlchemyLaudoRepository(db), SQLAlchemyAtendimentoRepository(db))
    except LaudoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return LaudoResponse.model_validate(laudo)
