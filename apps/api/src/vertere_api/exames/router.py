from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from vertere_api.auth.deps import exigir_acao, obter_db
from vertere_api.auth.domain import Usuario
from vertere_api.auth.service import Acao
from vertere_api.exames.domain import Exame, RegraPlantao
from vertere_api.exames.repository import (
    SQLAlchemyExameRepository,
    SQLAlchemyRegraPlantaoRepository,
)
from vertere_api.exames.schemas import (
    CriarExameRequest,
    CriarRegraPlantaoRequest,
    EditarExameRequest,
    EditarRegraPlantaoRequest,
    ExameResponse,
    RegraPlantaoResponse,
)
from vertere_api.exames.service import (
    ExameNaoEncontrado,
    RegraPlantaoNaoEncontrada,
    cadastrar_exame,
    cadastrar_regra_plantao,
    calcular_adicional_plantao,
    editar_exame,
    editar_regra_plantao,
    inativar_exame,
    inativar_regra_plantao,
    listar_exames,
    listar_regras_plantao,
    reativar_exame,
    reativar_regra_plantao,
)

router_exames = APIRouter(prefix="/exames", tags=["exames"])
router_regras_plantao = APIRouter(prefix="/regras-plantao", tags=["regras-plantao"])


def _exame_para_response(exame: Exame) -> ExameResponse:
    return ExameResponse(
        id=exame.id,
        categoria=exame.categoria,
        nome=exame.nome,
        preco_base=exame.preco_base,
        ativo=exame.ativo,
    )


def _regra_para_response(regra: RegraPlantao) -> RegraPlantaoResponse:
    return RegraPlantaoResponse(
        id=regra.id,
        dia_semana=regra.dia_semana,
        hora_inicio=regra.hora_inicio,
        hora_fim=regra.hora_fim,
        valor_adicional=regra.valor_adicional,
        ativo=regra.ativo,
    )


@router_exames.post(
    "",
    response_model=ExameResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_acao(Acao.EXAME_GERENCIAR))],
)
def criar_exame(dados: CriarExameRequest, db: Session = Depends(obter_db)) -> ExameResponse:
    repo = SQLAlchemyExameRepository(db)
    exame = cadastrar_exame(
        categoria=dados.categoria, nome=dados.nome, preco_base=dados.preco_base, repo=repo
    )
    return _exame_para_response(exame)


@router_exames.patch(
    "/{exame_id}",
    response_model=ExameResponse,
    dependencies=[Depends(exigir_acao(Acao.EXAME_GERENCIAR))],
)
def editar_exame_endpoint(
    exame_id: str, dados: EditarExameRequest, db: Session = Depends(obter_db)
) -> ExameResponse:
    repo = SQLAlchemyExameRepository(db)
    try:
        exame = editar_exame(
            exame_id=exame_id,
            categoria=dados.categoria,
            nome=dados.nome,
            preco_base=dados.preco_base,
            repo=repo,
        )
    except ExameNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _exame_para_response(exame)


@router_exames.post(
    "/{exame_id}/inativar",
    response_model=ExameResponse,
    dependencies=[Depends(exigir_acao(Acao.EXAME_GERENCIAR))],
)
def inativar_exame_endpoint(exame_id: str, db: Session = Depends(obter_db)) -> ExameResponse:
    repo = SQLAlchemyExameRepository(db)
    try:
        exame = inativar_exame(exame_id, repo)
    except ExameNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _exame_para_response(exame)


@router_exames.post(
    "/{exame_id}/reativar",
    response_model=ExameResponse,
    dependencies=[Depends(exigir_acao(Acao.EXAME_GERENCIAR))],
)
def reativar_exame_endpoint(exame_id: str, db: Session = Depends(obter_db)) -> ExameResponse:
    repo = SQLAlchemyExameRepository(db)
    try:
        exame = reativar_exame(exame_id, repo)
    except ExameNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _exame_para_response(exame)


@router_exames.get("", response_model=list[ExameResponse])
def listar_exames_endpoint(
    categoria: str | None = Query(default=None),
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    _usuario: Usuario = Depends(exigir_acao(Acao.EXAME_VER)),
) -> list[ExameResponse]:
    repo = SQLAlchemyExameRepository(db)
    exames = listar_exames(repo, categoria=categoria, apenas_ativos=apenas_ativos)
    return [_exame_para_response(e) for e in exames]


@router_regras_plantao.post(
    "",
    response_model=RegraPlantaoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_acao(Acao.REGRA_PLANTAO_GERENCIAR))],
)
def criar_regra_plantao(
    dados: CriarRegraPlantaoRequest, db: Session = Depends(obter_db)
) -> RegraPlantaoResponse:
    repo = SQLAlchemyRegraPlantaoRepository(db)
    regra = cadastrar_regra_plantao(
        dia_semana=dados.dia_semana,
        hora_inicio=dados.hora_inicio,
        hora_fim=dados.hora_fim,
        valor_adicional=dados.valor_adicional,
        repo=repo,
    )
    return _regra_para_response(regra)


@router_regras_plantao.get(
    "/sugestao-adicional",
    response_model=RegraPlantaoResponse | None,
    dependencies=[Depends(exigir_acao(Acao.REGRA_PLANTAO_VER))],
)
def sugerir_adicional_plantao(
    data_hora: datetime = Query(...), db: Session = Depends(obter_db)
) -> RegraPlantaoResponse | None:
    repo = SQLAlchemyRegraPlantaoRepository(db)
    regras = listar_regras_plantao(repo, apenas_ativos=True)
    regra = calcular_adicional_plantao(data_hora, regras)
    return _regra_para_response(regra) if regra is not None else None


@router_regras_plantao.patch(
    "/{regra_id}",
    response_model=RegraPlantaoResponse,
    dependencies=[Depends(exigir_acao(Acao.REGRA_PLANTAO_GERENCIAR))],
)
def editar_regra_plantao_endpoint(
    regra_id: str, dados: EditarRegraPlantaoRequest, db: Session = Depends(obter_db)
) -> RegraPlantaoResponse:
    repo = SQLAlchemyRegraPlantaoRepository(db)
    try:
        regra = editar_regra_plantao(
            regra_id=regra_id,
            dia_semana=dados.dia_semana,
            hora_inicio=dados.hora_inicio,
            hora_fim=dados.hora_fim,
            valor_adicional=dados.valor_adicional,
            repo=repo,
        )
    except RegraPlantaoNaoEncontrada as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _regra_para_response(regra)


@router_regras_plantao.post(
    "/{regra_id}/inativar",
    response_model=RegraPlantaoResponse,
    dependencies=[Depends(exigir_acao(Acao.REGRA_PLANTAO_GERENCIAR))],
)
def inativar_regra_plantao_endpoint(
    regra_id: str, db: Session = Depends(obter_db)
) -> RegraPlantaoResponse:
    repo = SQLAlchemyRegraPlantaoRepository(db)
    try:
        regra = inativar_regra_plantao(regra_id, repo)
    except RegraPlantaoNaoEncontrada as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _regra_para_response(regra)


@router_regras_plantao.post(
    "/{regra_id}/reativar",
    response_model=RegraPlantaoResponse,
    dependencies=[Depends(exigir_acao(Acao.REGRA_PLANTAO_GERENCIAR))],
)
def reativar_regra_plantao_endpoint(
    regra_id: str, db: Session = Depends(obter_db)
) -> RegraPlantaoResponse:
    repo = SQLAlchemyRegraPlantaoRepository(db)
    try:
        regra = reativar_regra_plantao(regra_id, repo)
    except RegraPlantaoNaoEncontrada as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _regra_para_response(regra)


@router_regras_plantao.get("", response_model=list[RegraPlantaoResponse])
def listar_regras_plantao_endpoint(
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    _usuario: Usuario = Depends(exigir_acao(Acao.REGRA_PLANTAO_VER)),
) -> list[RegraPlantaoResponse]:
    repo = SQLAlchemyRegraPlantaoRepository(db)
    regras = listar_regras_plantao(repo, apenas_ativos=apenas_ativos)
    return [_regra_para_response(r) for r in regras]
