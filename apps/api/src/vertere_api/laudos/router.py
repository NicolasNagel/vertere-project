from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from vertere_api.atendimentos.repository import SQLAlchemyAtendimentoRepository
from vertere_api.auth.deps import exigir_acao, obter_db, obter_usuario_atual
from vertere_api.auth.domain import Usuario
from vertere_api.auth.service import Acao, authorize
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.exames.repository import SQLAlchemyExameRepository
from vertere_api.laudos.adapters import FpdfGeradorPdfLaudo, SmtpEnvioLaudoGateway
from vertere_api.laudos.domain import CampoTemplate, DadosLaudo, Laudo, StatusLaudo, TemplateLaudo, ValorCampo
from vertere_api.laudos.repository import SQLAlchemyLaudoRepository, SQLAlchemyTemplateLaudoRepository
from vertere_api.laudos.schemas import (
    CampoTemplateSchema,
    CriarLaudoRequest,
    CriarTemplateLaudoRequest,
    EditarTemplateLaudoRequest,
    LaudoResponse,
    SalvarRascunhoRequest,
    TemplateLaudoResponse,
    ValorCampoSchema,
)
from vertere_api.laudos.service import (
    AtendimentoInvalido,
    ExameForaDoAtendimento,
    LaudoFinalizado,
    LaudoJaExiste,
    LaudoNaoEncontrado,
    LaudoNaoFinalizado,
    TemplateLaudoIndisponivel,
    TemplateLaudoNaoEncontrado,
    cadastrar_template_laudo,
    criar_laudo,
    editar_template_laudo,
    finalizar_laudo,
    inativar_template_laudo,
    listar_laudos,
    listar_templates_laudo,
    montar_dados_laudo,
    reativar_template_laudo,
    reenviar_laudo,
    salvar_rascunho,
    ver_laudo,
)
from vertere_api.pacientes.repository import SQLAlchemyPacienteRepository
from vertere_api.veterinarios.repository import SQLAlchemyVeterinarioRepository

router_templates_laudo = APIRouter(prefix="/templates-laudo", tags=["templates-laudo"])
router_laudos = APIRouter(prefix="/laudos", tags=["laudos"])

_ERROS_REFERENCIA_INVALIDA = (AtendimentoInvalido, ExameForaDoAtendimento, TemplateLaudoIndisponivel, LaudoJaExiste)
_ERROS_NAO_ENCONTRADO = (LaudoNaoEncontrado, TemplateLaudoNaoEncontrado)


def _template_para_response(template: TemplateLaudo) -> TemplateLaudoResponse:
    return TemplateLaudoResponse(
        id=template.id,
        categoria=template.categoria,
        campos=[
            CampoTemplateSchema(nome=c.nome, unidade=c.unidade, faixa_referencia=c.faixa_referencia)
            for c in template.campos
        ],
        ativo=template.ativo,
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


@router_templates_laudo.post(
    "",
    response_model=TemplateLaudoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_acao(Acao.TEMPLATE_LAUDO_GERENCIAR))],
)
def criar_template_laudo(
    dados: CriarTemplateLaudoRequest, db: Session = Depends(obter_db)
) -> TemplateLaudoResponse:
    repo = SQLAlchemyTemplateLaudoRepository(db)
    template = cadastrar_template_laudo(
        categoria=dados.categoria,
        campos=[
            CampoTemplate(nome=c.nome, unidade=c.unidade, faixa_referencia=c.faixa_referencia)
            for c in dados.campos
        ],
        repo=repo,
    )
    return _template_para_response(template)


@router_templates_laudo.patch(
    "/{template_id}",
    response_model=TemplateLaudoResponse,
    dependencies=[Depends(exigir_acao(Acao.TEMPLATE_LAUDO_GERENCIAR))],
)
def editar_template_laudo_endpoint(
    template_id: str, dados: EditarTemplateLaudoRequest, db: Session = Depends(obter_db)
) -> TemplateLaudoResponse:
    repo = SQLAlchemyTemplateLaudoRepository(db)
    try:
        template = editar_template_laudo(
            template_id=template_id,
            categoria=dados.categoria,
            campos=[
                CampoTemplate(nome=c.nome, unidade=c.unidade, faixa_referencia=c.faixa_referencia)
                for c in dados.campos
            ],
            repo=repo,
        )
    except TemplateLaudoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _template_para_response(template)


@router_templates_laudo.post(
    "/{template_id}/inativar",
    response_model=TemplateLaudoResponse,
    dependencies=[Depends(exigir_acao(Acao.TEMPLATE_LAUDO_GERENCIAR))],
)
def inativar_template_laudo_endpoint(
    template_id: str, db: Session = Depends(obter_db)
) -> TemplateLaudoResponse:
    repo = SQLAlchemyTemplateLaudoRepository(db)
    try:
        template = inativar_template_laudo(template_id, repo)
    except TemplateLaudoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _template_para_response(template)


@router_templates_laudo.post(
    "/{template_id}/reativar",
    response_model=TemplateLaudoResponse,
    dependencies=[Depends(exigir_acao(Acao.TEMPLATE_LAUDO_GERENCIAR))],
)
def reativar_template_laudo_endpoint(
    template_id: str, db: Session = Depends(obter_db)
) -> TemplateLaudoResponse:
    repo = SQLAlchemyTemplateLaudoRepository(db)
    try:
        template = reativar_template_laudo(template_id, repo)
    except TemplateLaudoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _template_para_response(template)


@router_templates_laudo.get("", response_model=list[TemplateLaudoResponse])
def listar_templates_laudo_endpoint(
    categoria: str | None = Query(default=None),
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(obter_db),
    _usuario: Usuario = Depends(exigir_acao(Acao.TEMPLATE_LAUDO_VER)),
) -> list[TemplateLaudoResponse]:
    repo = SQLAlchemyTemplateLaudoRepository(db)
    templates = listar_templates_laudo(repo, categoria=categoria, apenas_ativos=apenas_ativos)
    return [_template_para_response(t) for t in templates]


@router_laudos.post("", response_model=LaudoResponse, status_code=status.HTTP_201_CREATED)
def criar_laudo_endpoint(
    dados: CriarLaudoRequest,
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_acao(Acao.LAUDO_GERENCIAR)),
) -> LaudoResponse:
    try:
        laudo = criar_laudo(
            atendimento_id=dados.atendimento_id,
            exame_id=dados.exame_id,
            usuario_id=usuario.id,
            repo=SQLAlchemyLaudoRepository(db),
            atendimentos=SQLAlchemyAtendimentoRepository(db),
            exames=SQLAlchemyExameRepository(db),
            templates=SQLAlchemyTemplateLaudoRepository(db),
        )
    except _ERROS_REFERENCIA_INVALIDA as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro)) from erro
    return _laudo_para_response(laudo)


@router_laudos.patch(
    "/{laudo_id}/rascunho",
    response_model=LaudoResponse,
    dependencies=[Depends(exigir_acao(Acao.LAUDO_GERENCIAR))],
)
def salvar_rascunho_endpoint(
    laudo_id: str, dados: SalvarRascunhoRequest, db: Session = Depends(obter_db)
) -> LaudoResponse:
    repo = SQLAlchemyLaudoRepository(db)
    try:
        laudo = salvar_rascunho(
            laudo_id,
            [ValorCampo(nome_campo=v.nome_campo, valor=v.valor) for v in dados.valores],
            repo,
        )
    except LaudoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    except LaudoFinalizado as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    return _laudo_para_response(laudo)


def _montar_dados_e_destinatario(laudo_id: str, db: Session) -> tuple[DadosLaudo, str]:
    laudo_repo = SQLAlchemyLaudoRepository(db)
    laudo = laudo_repo.buscar_por_id(laudo_id)
    if laudo is None:
        raise LaudoNaoEncontrado(laudo_id)

    atendimentos = SQLAlchemyAtendimentoRepository(db)
    atendimento = atendimentos.buscar_por_id(laudo.atendimento_id)

    templates = SQLAlchemyTemplateLaudoRepository(db)
    template = templates.buscar_por_id(laudo.template_id)
    if template is None:
        raise TemplateLaudoNaoEncontrado(laudo.template_id)

    exames = SQLAlchemyExameRepository(db)
    exame = exames.buscar_por_id(laudo.exame_id)

    pacientes = SQLAlchemyPacienteRepository(db)
    paciente = pacientes.buscar_por_id(atendimento.paciente_id)

    veterinarios = SQLAlchemyVeterinarioRepository(db)
    veterinario = veterinarios.buscar_por_id(atendimento.veterinario_id)

    clinicas = SQLAlchemyClinicaRepository(db)
    clinica = clinicas.buscar_por_id(atendimento.clinica_id)

    dados = montar_dados_laudo(
        laudo=laudo,
        template=template,
        atendimento=atendimento,
        exame_nome=exame.nome,
        exame_categoria=exame.categoria,
        paciente_nome=paciente.nome,
        veterinario_nome=veterinario.nome,
        veterinario_crmv=veterinario.crmv,
        clinica_nome=clinica.nome,
    )
    return dados, veterinario.email


@router_laudos.post("/{laudo_id}/finalizar", response_model=LaudoResponse)
def finalizar_laudo_endpoint(
    laudo_id: str,
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(exigir_acao(Acao.LAUDO_GERENCIAR)),
) -> LaudoResponse:
    try:
        dados, destinatario = _montar_dados_e_destinatario(laudo_id, db)
        laudo = finalizar_laudo(
            laudo_id=laudo_id,
            usuario_id=usuario.id,
            destinatario=destinatario,
            dados=dados,
            repo=SQLAlchemyLaudoRepository(db),
            gerador_pdf=FpdfGeradorPdfLaudo(),
            envio_gateway=SmtpEnvioLaudoGateway(),
        )
    except _ERROS_NAO_ENCONTRADO as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    except LaudoFinalizado as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    return _laudo_para_response(laudo)


@router_laudos.post(
    "/{laudo_id}/reenviar",
    response_model=LaudoResponse,
    dependencies=[Depends(exigir_acao(Acao.LAUDO_GERENCIAR))],
)
def reenviar_laudo_endpoint(laudo_id: str, db: Session = Depends(obter_db)) -> LaudoResponse:
    try:
        dados, destinatario = _montar_dados_e_destinatario(laudo_id, db)
        laudo = reenviar_laudo(
            laudo_id=laudo_id,
            destinatario=destinatario,
            dados=dados,
            repo=SQLAlchemyLaudoRepository(db),
            gerador_pdf=FpdfGeradorPdfLaudo(),
            envio_gateway=SmtpEnvioLaudoGateway(),
        )
    except _ERROS_NAO_ENCONTRADO as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    except LaudoNaoFinalizado as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    return _laudo_para_response(laudo)


@router_laudos.get("", response_model=list[LaudoResponse])
def listar_laudos_endpoint(
    atendimento_id: str | None = Query(default=None),
    laudo_status: StatusLaudo | None = Query(default=None, alias="status"),
    data_inicio: datetime | None = Query(default=None),
    data_fim: datetime | None = Query(default=None),
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(obter_usuario_atual),
) -> list[LaudoResponse]:
    # `Acao.LAUDO_VER` já está em `_ACOES_COM_ESCOPO_DE_CLINICA` desde S1, então
    # `exigir_acao` (que chama `authorize()` sem contexto de clínica) bloquearia
    # todo usuário `clinica` aqui. Para uma listagem, o escopo correto é "a
    # clínica só enxerga os próprios laudos" (filtrado abaixo por
    # `listar_laudos`), não "recurso de uma clínica específica" — por isso o
    # gate usa a própria clínica do usuário como `clinica_recurso`.
    if not authorize(
        usuario.papel, Acao.LAUDO_VER, clinica_usuario=usuario.clinica_id, clinica_recurso=usuario.clinica_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Não autorizado")
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


@router_laudos.get("/{laudo_id}", response_model=LaudoResponse)
def ver_laudo_endpoint(
    laudo_id: str,
    db: Session = Depends(obter_db),
    usuario: Usuario = Depends(obter_usuario_atual),
) -> LaudoResponse:
    # Recurso único: `ver_laudo` já decide via `authorize()` com o
    # `clinica_recurso` real do atendimento do laudo (ver Implementation
    # Decisions) — não usa `exigir_acao` aqui pelo mesmo motivo do comentário
    # em `listar_laudos_endpoint`.
    try:
        laudo = ver_laudo(laudo_id, usuario, SQLAlchemyLaudoRepository(db), SQLAlchemyAtendimentoRepository(db))
    except LaudoNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _laudo_para_response(laudo)
