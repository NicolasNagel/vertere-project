from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from vertere_api.auth.deps import exigir_acao, obter_db
from vertere_api.auth.domain import Usuario
from vertere_api.auth.service import Acao
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.veterinarios.domain import Veterinario
from vertere_api.veterinarios.repository import SQLAlchemyVeterinarioRepository
from vertere_api.veterinarios.schemas import (
    CriarVeterinarioRequest,
    EditarVeterinarioRequest,
    VeterinarioResponse,
)
from vertere_api.veterinarios.service import (
    ClinicaInexistente,
    CrmvJaCadastrado,
    CrmvVazio,
    VeterinarioNaoEncontrado,
    buscar_veterinarios,
    cadastrar_veterinario,
    editar_veterinario,
    inativar_veterinario,
    listar_veterinarios,
    reativar_veterinario,
)

router = APIRouter(prefix="/veterinarios", tags=["veterinarios"])


def _para_response(veterinario: Veterinario) -> VeterinarioResponse:
    return VeterinarioResponse(
        id=veterinario.id,
        nome=veterinario.nome,
        crmv=veterinario.crmv,
        telefone=veterinario.telefone,
        email=veterinario.email,
        clinica_id=veterinario.clinica_id,
        ativo=veterinario.ativo,
    )


@router.post(
    "",
    response_model=VeterinarioResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_acao(Acao.VETERINARIO_GERENCIAR))],
)
def criar(dados: CriarVeterinarioRequest, db: Session = Depends(obter_db)) -> VeterinarioResponse:
    repo = SQLAlchemyVeterinarioRepository(db)
    clinicas = SQLAlchemyClinicaRepository(db)
    try:
        veterinario = cadastrar_veterinario(
            nome=dados.nome,
            crmv=dados.crmv,
            telefone=dados.telefone,
            email=dados.email,
            clinica_id=dados.clinica_id,
            repo=repo,
            clinicas=clinicas,
        )
    except CrmvVazio as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro)) from erro
    except ClinicaInexistente as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro)) from erro
    except CrmvJaCadastrado as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    return _para_response(veterinario)


@router.patch(
    "/{veterinario_id}",
    response_model=VeterinarioResponse,
    dependencies=[Depends(exigir_acao(Acao.VETERINARIO_GERENCIAR))],
)
def editar(
    veterinario_id: str, dados: EditarVeterinarioRequest, db: Session = Depends(obter_db)
) -> VeterinarioResponse:
    repo = SQLAlchemyVeterinarioRepository(db)
    try:
        veterinario = editar_veterinario(
            veterinario_id=veterinario_id,
            nome=dados.nome,
            telefone=dados.telefone,
            email=dados.email,
            repo=repo,
        )
    except VeterinarioNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(veterinario)


@router.post(
    "/{veterinario_id}/inativar",
    response_model=VeterinarioResponse,
    dependencies=[Depends(exigir_acao(Acao.VETERINARIO_GERENCIAR))],
)
def inativar(veterinario_id: str, db: Session = Depends(obter_db)) -> VeterinarioResponse:
    repo = SQLAlchemyVeterinarioRepository(db)
    try:
        veterinario = inativar_veterinario(veterinario_id, repo)
    except VeterinarioNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(veterinario)


@router.post(
    "/{veterinario_id}/reativar",
    response_model=VeterinarioResponse,
    dependencies=[Depends(exigir_acao(Acao.VETERINARIO_GERENCIAR))],
)
def reativar(veterinario_id: str, db: Session = Depends(obter_db)) -> VeterinarioResponse:
    repo = SQLAlchemyVeterinarioRepository(db)
    try:
        veterinario = reativar_veterinario(veterinario_id, repo)
    except VeterinarioNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(veterinario)


@router.get("", response_model=list[VeterinarioResponse])
def listar(
    clinica_id: str | None = Query(default=None),
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    _usuario: Usuario = Depends(exigir_acao(Acao.VETERINARIO_VER)),
) -> list[VeterinarioResponse]:
    repo = SQLAlchemyVeterinarioRepository(db)
    veterinarios = listar_veterinarios(repo, clinica_id=clinica_id, apenas_ativos=apenas_ativos)
    return [_para_response(v) for v in veterinarios]


@router.get("/busca", response_model=list[VeterinarioResponse])
def buscar(
    nome: str = Query(...),
    clinica_id: str | None = Query(default=None),
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    _usuario: Usuario = Depends(exigir_acao(Acao.VETERINARIO_VER)),
) -> list[VeterinarioResponse]:
    repo = SQLAlchemyVeterinarioRepository(db)
    veterinarios = buscar_veterinarios(
        nome, repo, clinica_id=clinica_id, apenas_ativos=apenas_ativos
    )
    return [_para_response(v) for v in veterinarios]
