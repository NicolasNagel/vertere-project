from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from vertere_api.auth.deps import exigir_acao, obter_db
from vertere_api.auth.domain import Usuario
from vertere_api.auth.service import Acao
from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.clinicas.schemas import (
    ClinicaResponse,
    CriarClinicaRequest,
    EditarClinicaRequest,
)
from vertere_api.clinicas.service import (
    ClinicaNaoEncontrada,
    CnpjInvalido,
    CnpjJaCadastrado,
    buscar_por_nome,
    criar_clinica,
    editar_clinica,
    inativar_clinica,
    listar_clinicas,
    reativar_clinica,
)

router = APIRouter(prefix="/clinicas", tags=["clinicas"])


def _para_response(clinica: Clinica) -> ClinicaResponse:
    return ClinicaResponse(
        id=clinica.id,
        nome=clinica.nome,
        cnpj=clinica.cnpj,
        endereco=clinica.endereco,
        telefone=clinica.telefone,
        email=clinica.email,
        ativo=clinica.ativo,
    )


@router.post(
    "",
    response_model=ClinicaResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_acao(Acao.CLINICA_GERENCIAR))],
)
def criar(dados: CriarClinicaRequest, db: Session = Depends(obter_db)) -> ClinicaResponse:
    repo = SQLAlchemyClinicaRepository(db)
    try:
        clinica = criar_clinica(
            nome=dados.nome,
            cnpj=dados.cnpj,
            endereco=dados.endereco,
            telefone=dados.telefone,
            email=dados.email,
            repo=repo,
        )
    except CnpjInvalido as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro)) from erro
    except CnpjJaCadastrado as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    return _para_response(clinica)


@router.patch(
    "/{clinica_id}",
    response_model=ClinicaResponse,
    dependencies=[Depends(exigir_acao(Acao.CLINICA_GERENCIAR))],
)
def editar(
    clinica_id: str, dados: EditarClinicaRequest, db: Session = Depends(obter_db)
) -> ClinicaResponse:
    repo = SQLAlchemyClinicaRepository(db)
    try:
        clinica = editar_clinica(
            clinica_id=clinica_id,
            nome=dados.nome,
            endereco=dados.endereco,
            telefone=dados.telefone,
            email=dados.email,
            repo=repo,
        )
    except ClinicaNaoEncontrada as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(clinica)


@router.post(
    "/{clinica_id}/inativar",
    response_model=ClinicaResponse,
    dependencies=[Depends(exigir_acao(Acao.CLINICA_GERENCIAR))],
)
def inativar(clinica_id: str, db: Session = Depends(obter_db)) -> ClinicaResponse:
    repo = SQLAlchemyClinicaRepository(db)
    try:
        clinica = inativar_clinica(clinica_id, repo)
    except ClinicaNaoEncontrada as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(clinica)


@router.post(
    "/{clinica_id}/reativar",
    response_model=ClinicaResponse,
    dependencies=[Depends(exigir_acao(Acao.CLINICA_GERENCIAR))],
)
def reativar(clinica_id: str, db: Session = Depends(obter_db)) -> ClinicaResponse:
    repo = SQLAlchemyClinicaRepository(db)
    try:
        clinica = reativar_clinica(clinica_id, repo)
    except ClinicaNaoEncontrada as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(clinica)


@router.get("", response_model=list[ClinicaResponse])
def listar(
    apenas_ativas: bool = Query(default=False),
    db: Session = Depends(obter_db),
    _usuario: Usuario = Depends(exigir_acao(Acao.CLINICA_VER)),
) -> list[ClinicaResponse]:
    repo = SQLAlchemyClinicaRepository(db)
    clinicas = listar_clinicas(repo, apenas_ativas=apenas_ativas)
    return [_para_response(c) for c in clinicas]


@router.get("/busca", response_model=list[ClinicaResponse])
def buscar(
    nome: str = Query(...),
    apenas_ativas: bool = Query(default=False),
    db: Session = Depends(obter_db),
    _usuario: Usuario = Depends(exigir_acao(Acao.CLINICA_VER)),
) -> list[ClinicaResponse]:
    repo = SQLAlchemyClinicaRepository(db)
    clinicas = buscar_por_nome(nome, repo, apenas_ativas=apenas_ativas)
    return [_para_response(c) for c in clinicas]
