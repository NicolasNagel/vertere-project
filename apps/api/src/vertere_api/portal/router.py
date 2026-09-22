from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from vertere_api.atendimentos.domain import Atendimento, StatusAtendimento
from vertere_api.atendimentos.repository import SQLAlchemyAtendimentoRepository
from vertere_api.atendimentos.schemas import AtendimentoResponse, ItemExameResponse
from vertere_api.atendimentos.service import (
    AtendimentoNaoEncontrado,
    buscar_atendimento,
    listar_atendimentos,
)
from vertere_api.auth.deps import exigir_papel_clinica, obter_db
from vertere_api.auth.domain import Usuario
from vertere_api.laudos.domain import Laudo, StatusLaudo
from vertere_api.laudos.repository import SQLAlchemyLaudoRepository
from vertere_api.laudos.schemas import LaudoResponse, ValorCampoSchema
from vertere_api.laudos.service import LaudoNaoEncontrado, listar_laudos, ver_laudo
from vertere_api.pacientes.domain import Paciente
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


def _paciente_para_response(paciente: Paciente) -> PacienteResponse:
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


def _atendimento_para_response(atendimento: Atendimento) -> AtendimentoResponse:
    return AtendimentoResponse(
        id=atendimento.id,
        clinica_id=atendimento.clinica_id,
        veterinario_id=atendimento.veterinario_id,
        paciente_id=atendimento.paciente_id,
        itens_exame=[
            ItemExameResponse(
                exame_id=item.exame_id, preco_unitario=item.preco_unitario, quantidade=item.quantidade
            )
            for item in atendimento.itens_exame
        ],
        metodo_coleta=atendimento.metodo_coleta,
        data_hora=atendimento.data_hora,
        regra_plantao_id=atendimento.regra_plantao_id,
        valor_adicional_plantao=atendimento.valor_adicional_plantao,
        desconto=atendimento.desconto,
        valor_total=atendimento.valor_total,
        status=atendimento.status.value,
    )


def _laudo_para_response(laudo: Laudo) -> LaudoResponse:
    return LaudoResponse(
        id=laudo.id,
        atendimento_id=laudo.atendimento_id,
        exame_id=laudo.exame_id,
        template_id=laudo.template_id,
        valores=[ValorCampoSchema(nome_campo=v.nome_campo, valor=v.valor) for v in laudo.valores],
        status=laudo.status.value,
        criado_por=laudo.criado_por,
        criado_em=laudo.criado_em,
        finalizado_por=laudo.finalizado_por,
        finalizado_em=laudo.finalizado_em,
        enviado_em=laudo.enviado_em,
        erro_envio=laudo.erro_envio,
    )


@router.get("/pacientes", response_model=list[PacienteResponse])
def listar_pacientes_endpoint(
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_papel_clinica),
) -> list[PacienteResponse]:
    repo = SQLAlchemyPacienteRepository(db)
    pacientes = listar_pacientes(repo, usuario, apenas_ativos=apenas_ativos)
    return [_paciente_para_response(p) for p in pacientes]


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
    return _paciente_para_response(paciente)


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
    return HistoricoPacienteResponse(
        paciente=_paciente_para_response(historico.paciente),
        atendimentos=[_atendimento_para_response(a) for a in historico.atendimentos],
        laudos=[_laudo_para_response(l) for l in historico.laudos],
    )


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
    return [_atendimento_para_response(a) for a in atendimentos]


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
    return _atendimento_para_response(atendimento)


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
    return [_laudo_para_response(l) for l in laudos]


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
    return _laudo_para_response(laudo)
