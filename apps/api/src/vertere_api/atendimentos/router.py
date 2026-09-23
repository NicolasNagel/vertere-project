from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from vertere_api.atendimentos.domain import ItemExameEntrada, StatusAtendimento
from vertere_api.atendimentos.repository import SQLAlchemyAtendimentoRepository
from vertere_api.atendimentos.schemas import (
    AtendimentoResponse,
    CriarAtendimentoRequest,
    EditarAtendimentoRequest,
)
from vertere_api.atendimentos.service import (
    AtendimentoCancelado,
    AtendimentoNaoEncontrado,
    AtendimentoSemItens,
    ClinicaInvalida,
    DescontoInvalido,
    ExameInvalido,
    PacienteInvalido,
    PeriodoFechado,
    QuantidadeInvalida,
    VeterinarioInvalido,
    cancelar_atendimento,
    editar_atendimento,
    listar_atendimentos,
    registrar_atendimento,
)
from vertere_api.auth.deps import exigir_acao, obter_db
from vertere_api.auth.domain import Usuario
from vertere_api.auth.service import Acao
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.exames.repository import SQLAlchemyExameRepository, SQLAlchemyRegraPlantaoRepository
from vertere_api.financeiro.adapters import FechamentoPeriodoFechadoChecker
from vertere_api.financeiro.repository import SQLAlchemyFechamentoRepository
from vertere_api.pacientes.repository import SQLAlchemyPacienteRepository
from vertere_api.veterinarios.repository import SQLAlchemyVeterinarioRepository

router = APIRouter(prefix="/atendimentos", tags=["atendimentos"])

_ERROS_REFERENCIA_INVALIDA = (
    ClinicaInvalida,
    VeterinarioInvalido,
    PacienteInvalido,
    ExameInvalido,
    AtendimentoSemItens,
    QuantidadeInvalida,
    DescontoInvalido,
)


@router.post(
    "",
    response_model=AtendimentoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_acao(Acao.ATENDIMENTO_GERENCIAR))],
)
def criar_atendimento(
    dados: CriarAtendimentoRequest, db: Session = Depends(obter_db)
) -> AtendimentoResponse:
    try:
        atendimento = registrar_atendimento(
            clinica_id=dados.clinica_id,
            veterinario_id=dados.veterinario_id,
            paciente_id=dados.paciente_id,
            itens_exame=[
                ItemExameEntrada(exame_id=item.exame_id, quantidade=item.quantidade)
                for item in dados.itens_exame
            ],
            metodo_coleta=dados.metodo_coleta,
            data_hora=dados.data_hora,
            repo=SQLAlchemyAtendimentoRepository(db),
            clinicas=SQLAlchemyClinicaRepository(db),
            veterinarios=SQLAlchemyVeterinarioRepository(db),
            pacientes=SQLAlchemyPacienteRepository(db),
            exames=SQLAlchemyExameRepository(db),
            regras_plantao=SQLAlchemyRegraPlantaoRepository(db),
            desconto=dados.desconto,
            valor_adicional_plantao=dados.valor_adicional_plantao,
        )
    except _ERROS_REFERENCIA_INVALIDA as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro)) from erro
    return AtendimentoResponse.model_validate(atendimento)


@router.patch(
    "/{atendimento_id}",
    response_model=AtendimentoResponse,
    dependencies=[Depends(exigir_acao(Acao.ATENDIMENTO_GERENCIAR))],
)
def editar_atendimento_endpoint(
    atendimento_id: str, dados: EditarAtendimentoRequest, db: Session = Depends(obter_db)
) -> AtendimentoResponse:
    try:
        atendimento = editar_atendimento(
            atendimento_id=atendimento_id,
            clinica_id=dados.clinica_id,
            veterinario_id=dados.veterinario_id,
            paciente_id=dados.paciente_id,
            itens_exame=[
                ItemExameEntrada(exame_id=item.exame_id, quantidade=item.quantidade)
                for item in dados.itens_exame
            ],
            metodo_coleta=dados.metodo_coleta,
            data_hora=dados.data_hora,
            repo=SQLAlchemyAtendimentoRepository(db),
            clinicas=SQLAlchemyClinicaRepository(db),
            veterinarios=SQLAlchemyVeterinarioRepository(db),
            pacientes=SQLAlchemyPacienteRepository(db),
            exames=SQLAlchemyExameRepository(db),
            regras_plantao=SQLAlchemyRegraPlantaoRepository(db),
            desconto=dados.desconto,
            valor_adicional_plantao=dados.valor_adicional_plantao,
            periodo_fechado=FechamentoPeriodoFechadoChecker(SQLAlchemyFechamentoRepository(db)),
        )
    except AtendimentoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    except (AtendimentoCancelado, PeriodoFechado) as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    except _ERROS_REFERENCIA_INVALIDA as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro)) from erro
    return AtendimentoResponse.model_validate(atendimento)


@router.post(
    "/{atendimento_id}/cancelar",
    response_model=AtendimentoResponse,
    dependencies=[Depends(exigir_acao(Acao.ATENDIMENTO_GERENCIAR))],
)
def cancelar_atendimento_endpoint(
    atendimento_id: str, db: Session = Depends(obter_db)
) -> AtendimentoResponse:
    repo = SQLAlchemyAtendimentoRepository(db)
    try:
        atendimento = cancelar_atendimento(
            atendimento_id,
            repo,
            periodo_fechado=FechamentoPeriodoFechadoChecker(SQLAlchemyFechamentoRepository(db)),
        )
    except AtendimentoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    except (AtendimentoCancelado, PeriodoFechado) as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    return AtendimentoResponse.model_validate(atendimento)


@router.get("", response_model=list[AtendimentoResponse])
def listar_atendimentos_endpoint(
    clinica_id: str | None = Query(default=None),
    veterinario_id: str | None = Query(default=None),
    atendimento_status: StatusAtendimento | None = Query(default=None, alias="status"),
    data_inicio: datetime | None = Query(default=None),
    data_fim: datetime | None = Query(default=None),
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_acao(Acao.ATENDIMENTO_VER)),
) -> list[AtendimentoResponse]:
    repo = SQLAlchemyAtendimentoRepository(db)
    atendimentos = listar_atendimentos(
        repo,
        usuario,
        clinica_id=clinica_id,
        veterinario_id=veterinario_id,
        status=atendimento_status,
        data_inicio=data_inicio,
        data_fim=data_fim,
    )
    return [AtendimentoResponse.model_validate(a) for a in atendimentos]
