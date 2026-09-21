from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from vertere_api.atendimentos.repository import SQLAlchemyAtendimentoRepository
from vertere_api.auth.deps import exigir_acao, obter_db
from vertere_api.auth.service import Acao
from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.financeiro.domain import Fechamento
from vertere_api.financeiro.repository import SQLAlchemyFechamentoRepository
from vertere_api.financeiro.schemas import (
    ConfirmarPagamentoRequest,
    FaturamentoClinicaResponse,
    FechamentoResponse,
    GerarFechamentoRequest,
    ResumoFinanceiroItemResponse,
)
from vertere_api.financeiro.service import (
    ClinicaInvalida,
    FechamentoJaExiste,
    FechamentoJaPago,
    FechamentoNaoEncontrado,
    calcular_faturamento_por_clinica,
    calcular_resumo_financeiro,
    confirmar_pagamento,
    exportar_fechamento_csv,
    gerar_fechamento,
    status_exibicao,
)

router = APIRouter(prefix="/financeiro", tags=["financeiro"])


def _para_response(fechamento: Fechamento, clinica: Clinica) -> FechamentoResponse:
    status_atual = status_exibicao(fechamento, clinica, date.today())
    return FechamentoResponse(
        id=fechamento.id,
        clinica_id=fechamento.clinica_id,
        ano=fechamento.ano,
        mes=fechamento.mes,
        valor_total=fechamento.valor_total,
        quantidade_atendimentos=fechamento.quantidade_atendimentos,
        data_fechamento=fechamento.data_fechamento,
        pago=fechamento.pago,
        data_pagamento=fechamento.data_pagamento,
        status=status_atual.value,
    )


@router.post(
    "/clinicas/{clinica_id}/fechamentos",
    response_model=FechamentoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_acao(Acao.FECHAMENTO_GERENCIAR))],
)
def gerar_fechamento_endpoint(
    clinica_id: str, dados: GerarFechamentoRequest, db: Session = Depends(obter_db)
) -> FechamentoResponse:
    clinicas_repo = SQLAlchemyClinicaRepository(db)
    try:
        fechamento = gerar_fechamento(
            clinica_id,
            dados.ano,
            dados.mes,
            SQLAlchemyFechamentoRepository(db),
            SQLAlchemyAtendimentoRepository(db),
            clinicas_repo,
        )
    except ClinicaInvalida as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro)) from erro
    except FechamentoJaExiste as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    return _para_response(fechamento, clinicas_repo.buscar_por_id(clinica_id))


@router.post(
    "/fechamentos/{fechamento_id}/confirmar-pagamento",
    response_model=FechamentoResponse,
    dependencies=[Depends(exigir_acao(Acao.FECHAMENTO_GERENCIAR))],
)
def confirmar_pagamento_endpoint(
    fechamento_id: str, dados: ConfirmarPagamentoRequest, db: Session = Depends(obter_db)
) -> FechamentoResponse:
    repo = SQLAlchemyFechamentoRepository(db)
    try:
        fechamento = confirmar_pagamento(fechamento_id, repo, dados.data_pagamento)
    except FechamentoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    except FechamentoJaPago as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    clinica = SQLAlchemyClinicaRepository(db).buscar_por_id(fechamento.clinica_id)
    return _para_response(fechamento, clinica)


@router.get(
    "/clinicas/{clinica_id}/faturamento",
    response_model=FaturamentoClinicaResponse,
    dependencies=[Depends(exigir_acao(Acao.FINANCEIRO_VER))],
)
def faturamento_por_clinica_endpoint(
    clinica_id: str,
    ano: int = Query(...),
    mes: int = Query(...),
    db: Session = Depends(obter_db),
) -> FaturamentoClinicaResponse:
    atendimentos = SQLAlchemyAtendimentoRepository(db).listar_todas()
    valor_total = calcular_faturamento_por_clinica(atendimentos, clinica_id, ano, mes)
    return FaturamentoClinicaResponse(clinica_id=clinica_id, ano=ano, mes=mes, valor_total=valor_total)


@router.get(
    "/resumo",
    response_model=list[ResumoFinanceiroItemResponse],
    dependencies=[Depends(exigir_acao(Acao.FINANCEIRO_VER))],
)
def resumo_financeiro_endpoint(
    ano: int = Query(...), mes: int = Query(...), db: Session = Depends(obter_db)
) -> list[ResumoFinanceiroItemResponse]:
    atendimentos = SQLAlchemyAtendimentoRepository(db).listar_todas()
    resumo = calcular_resumo_financeiro(atendimentos, ano, mes)
    return [
        ResumoFinanceiroItemResponse(clinica_id=clinica_id, valor_total=valor_total)
        for clinica_id, valor_total in resumo
    ]


@router.get(
    "/fechamentos/{fechamento_id}/csv",
    dependencies=[Depends(exigir_acao(Acao.FINANCEIRO_VER))],
)
def exportar_fechamento_csv_endpoint(
    fechamento_id: str, db: Session = Depends(obter_db)
) -> Response:
    repo = SQLAlchemyFechamentoRepository(db)
    fechamento = repo.buscar_por_id(fechamento_id)
    if fechamento is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Fechamento {fechamento_id} não encontrado"
        )
    clinica = SQLAlchemyClinicaRepository(db).buscar_por_id(fechamento.clinica_id)
    csv = exportar_fechamento_csv(fechamento, clinica, date.today())
    return Response(content=csv, media_type="text/csv")
