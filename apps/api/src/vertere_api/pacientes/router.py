from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from vertere_api.auth.deps import exigir_acao, obter_db
from vertere_api.auth.domain import Usuario
from vertere_api.auth.service import Acao
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.pacientes.domain import Paciente
from vertere_api.pacientes.repository import SQLAlchemyPacienteRepository
from vertere_api.pacientes.schemas import (
    CriarPacienteRequest,
    EditarPacienteRequest,
    PacienteResponse,
)
from vertere_api.pacientes.service import (
    ClinicaInexistente,
    PacienteNaoEncontrado,
    buscar_pacientes,
    cadastrar_paciente,
    editar_paciente,
    inativar_paciente,
    listar_pacientes,
    reativar_paciente,
)

router = APIRouter(prefix="/pacientes", tags=["pacientes"])


def _para_response(paciente: Paciente) -> PacienteResponse:
    return PacienteResponse(
        id=paciente.id,
        nome=paciente.nome,
        especie=paciente.especie,
        raca=paciente.raca,
        sexo=paciente.sexo,
        idade=paciente.idade,
        proprietario=paciente.proprietario,
        clinica_id=paciente.clinica_id,
        ativo=paciente.ativo,
    )


@router.post(
    "",
    response_model=PacienteResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_acao(Acao.PACIENTE_GERENCIAR))],
)
def criar(dados: CriarPacienteRequest, db: Session = Depends(obter_db)) -> PacienteResponse:
    repo = SQLAlchemyPacienteRepository(db)
    clinicas = SQLAlchemyClinicaRepository(db)
    try:
        paciente = cadastrar_paciente(
            nome=dados.nome,
            especie=dados.especie,
            raca=dados.raca,
            sexo=dados.sexo,
            idade=dados.idade,
            proprietario=dados.proprietario,
            clinica_id=dados.clinica_id,
            repo=repo,
            clinicas=clinicas,
        )
    except ClinicaInexistente as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro)) from erro
    return _para_response(paciente)


@router.patch(
    "/{paciente_id}",
    response_model=PacienteResponse,
    dependencies=[Depends(exigir_acao(Acao.PACIENTE_GERENCIAR))],
)
def editar(
    paciente_id: str, dados: EditarPacienteRequest, db: Session = Depends(obter_db)
) -> PacienteResponse:
    repo = SQLAlchemyPacienteRepository(db)
    try:
        paciente = editar_paciente(
            paciente_id=paciente_id,
            nome=dados.nome,
            especie=dados.especie,
            raca=dados.raca,
            sexo=dados.sexo,
            idade=dados.idade,
            proprietario=dados.proprietario,
            repo=repo,
        )
    except PacienteNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(paciente)


@router.post(
    "/{paciente_id}/inativar",
    response_model=PacienteResponse,
    dependencies=[Depends(exigir_acao(Acao.PACIENTE_INATIVAR))],
)
def inativar(paciente_id: str, db: Session = Depends(obter_db)) -> PacienteResponse:
    repo = SQLAlchemyPacienteRepository(db)
    try:
        paciente = inativar_paciente(paciente_id, repo)
    except PacienteNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(paciente)


@router.post(
    "/{paciente_id}/reativar",
    response_model=PacienteResponse,
    dependencies=[Depends(exigir_acao(Acao.PACIENTE_INATIVAR))],
)
def reativar(paciente_id: str, db: Session = Depends(obter_db)) -> PacienteResponse:
    repo = SQLAlchemyPacienteRepository(db)
    try:
        paciente = reativar_paciente(paciente_id, repo)
    except PacienteNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(paciente)


@router.get("", response_model=list[PacienteResponse])
def listar(
    clinica_id: str | None = Query(default=None),
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_acao(Acao.PACIENTE_VER)),
) -> list[PacienteResponse]:
    repo = SQLAlchemyPacienteRepository(db)
    pacientes = listar_pacientes(repo, usuario, clinica_id=clinica_id, apenas_ativos=apenas_ativos)
    return [_para_response(p) for p in pacientes]


@router.get("/busca", response_model=list[PacienteResponse])
def buscar(
    nome: str = Query(...),
    clinica_id: str | None = Query(default=None),
    proprietario: str | None = Query(default=None),
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_acao(Acao.PACIENTE_VER)),
) -> list[PacienteResponse]:
    repo = SQLAlchemyPacienteRepository(db)
    pacientes = buscar_pacientes(
        nome,
        repo,
        usuario,
        clinica_id=clinica_id,
        proprietario=proprietario,
        apenas_ativos=apenas_ativos,
    )
    return [_para_response(p) for p in pacientes]
