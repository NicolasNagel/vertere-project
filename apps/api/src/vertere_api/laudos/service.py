import uuid
from dataclasses import replace
from datetime import UTC, datetime
from typing import Protocol

from vertere_api.atendimentos.domain import Atendimento, StatusAtendimento
from vertere_api.atendimentos.service import AtendimentoRepository
from vertere_api.auth.domain import Papel, Usuario
from vertere_api.clinicas.service import ClinicaRepository
from vertere_api.exames.service import ExameRepository
from vertere_api.laudos.domain import (
    CampoDadosLaudo,
    CampoTemplate,
    DadosLaudo,
    Laudo,
    StatusLaudo,
    TemplateLaudo,
    ValorCampo,
)
from vertere_api.pacientes.service import PacienteRepository
from vertere_api.veterinarios.service import VeterinarioRepository


class TemplateLaudoRepository(Protocol):
    def buscar_por_id(self, template_id: str) -> TemplateLaudo | None: ...
    def listar_todas(self) -> list[TemplateLaudo]: ...
    def salvar(self, template: TemplateLaudo) -> None: ...


class LaudoRepository(Protocol):
    def buscar_por_id(self, laudo_id: str) -> Laudo | None: ...
    def listar_todas(self) -> list[Laudo]: ...
    def salvar(self, laudo: Laudo) -> None: ...


class GeradorPdfLaudo(Protocol):
    def gerar(self, dados: DadosLaudo) -> bytes: ...


class EnvioLaudoGateway(Protocol):
    def enviar(
        self, destinatario: str, assunto: str, corpo: str, anexo_pdf: bytes, nome_anexo: str
    ) -> None: ...


class TemplateLaudoNaoEncontrado(Exception):
    def __init__(self, template_id: str) -> None:
        super().__init__(f"Template de laudo {template_id} não encontrado")


def cadastrar_template_laudo(categoria: str, campos: list[CampoTemplate], repo: TemplateLaudoRepository) -> TemplateLaudo:
    """Cadastra um template de laudo para uma categoria de exame."""
    template = TemplateLaudo(id=str(uuid.uuid4()), categoria=categoria, campos=campos, ativo=True)
    repo.salvar(template)
    return template


def _buscar_template_ou_levantar(template_id: str, repo: TemplateLaudoRepository) -> TemplateLaudo:
    template = repo.buscar_por_id(template_id)
    if template is None:
        raise TemplateLaudoNaoEncontrado(template_id)
    return template


def editar_template_laudo(
    template_id: str, categoria: str, campos: list[CampoTemplate], repo: TemplateLaudoRepository
) -> TemplateLaudo:
    """Edita categoria e campos de um template de laudo existente."""
    template = _buscar_template_ou_levantar(template_id, repo)
    atualizado = replace(template, categoria=categoria, campos=campos)
    repo.salvar(atualizado)
    return atualizado


def inativar_template_laudo(template_id: str, repo: TemplateLaudoRepository) -> TemplateLaudo:
    """Inativa um template de laudo, preservando os laudos já criados com ele."""
    return _definir_template_ativo(template_id, ativo=False, repo=repo)


def reativar_template_laudo(template_id: str, repo: TemplateLaudoRepository) -> TemplateLaudo:
    """Reativa um template de laudo previamente inativado."""
    return _definir_template_ativo(template_id, ativo=True, repo=repo)


def _definir_template_ativo(template_id: str, ativo: bool, repo: TemplateLaudoRepository) -> TemplateLaudo:
    template = _buscar_template_ou_levantar(template_id, repo)
    atualizado = replace(template, ativo=ativo)
    repo.salvar(atualizado)
    return atualizado


def listar_templates_laudo(
    repo: TemplateLaudoRepository, *, categoria: str | None = None, apenas_ativos: bool = False
) -> list[TemplateLaudo]:
    """Lista os templates de laudo cadastrados, opcionalmente filtrando por categoria e/ou ativos."""
    templates = repo.listar_todas()
    if categoria is not None:
        templates = [t for t in templates if t.categoria == categoria]
    if apenas_ativos:
        templates = [t for t in templates if t.ativo]
    return templates


def montar_dados_laudo(
    laudo: Laudo,
    template: TemplateLaudo,
    atendimento: Atendimento,
    exame_nome: str,
    exame_categoria: str,
    paciente_nome: str,
    veterinario_nome: str,
    veterinario_crmv: str,
    clinica_nome: str,
) -> DadosLaudo:
    """Monta o conteúdo final de um laudo a partir das entidades já carregadas.

    Função pura: não acessa repositório nem gera PDF/e-mail — só alinha os
    `valores` preenchidos do laudo aos `campos` do template snapshot,
    produzindo a lista final de campo+valor+unidade+faixa_referência.
    """
    valores_por_campo = {v.nome_campo: v.valor for v in laudo.valores}
    campos = [
        CampoDadosLaudo(
            nome=campo.nome,
            valor=valores_por_campo.get(campo.nome, ""),
            unidade=campo.unidade,
            faixa_referencia=campo.faixa_referencia,
        )
        for campo in template.campos
    ]
    return DadosLaudo(
        laudo_id=laudo.id,
        paciente_nome=paciente_nome,
        clinica_nome=clinica_nome,
        veterinario_nome=veterinario_nome,
        veterinario_crmv=veterinario_crmv,
        exame_nome=exame_nome,
        exame_categoria=exame_categoria,
        data_atendimento=atendimento.data_hora,
        campos=campos,
    )


class AtendimentoInvalido(Exception):
    def __init__(self, atendimento_id: str) -> None:
        super().__init__(f"Atendimento {atendimento_id} inexistente ou cancelado")


class ExameForaDoAtendimento(Exception):
    def __init__(self, exame_id: str, atendimento_id: str) -> None:
        super().__init__(f"Exame {exame_id} não está no atendimento {atendimento_id}")


class TemplateLaudoIndisponivel(Exception):
    def __init__(self, categoria: str) -> None:
        super().__init__(f"Nenhum template de laudo ativo para a categoria '{categoria}'")


class LaudoJaExiste(Exception):
    def __init__(self, atendimento_id: str, exame_id: str) -> None:
        super().__init__(f"Já existe laudo para o atendimento {atendimento_id} e exame {exame_id}")


class LaudoNaoEncontrado(Exception):
    def __init__(self, laudo_id: str) -> None:
        super().__init__(f"Laudo {laudo_id} não encontrado")


class LaudoFinalizado(Exception):
    def __init__(self, laudo_id: str) -> None:
        super().__init__(f"Laudo {laudo_id} já está finalizado")


class LaudoNaoFinalizado(Exception):
    def __init__(self, laudo_id: str) -> None:
        super().__init__(f"Laudo {laudo_id} ainda não foi finalizado")


def _buscar_atendimento_ativo_ou_levantar(
    atendimento_id: str, atendimentos: AtendimentoRepository
) -> Atendimento:
    atendimento = atendimentos.buscar_por_id(atendimento_id)
    if atendimento is None or atendimento.status != StatusAtendimento.ATIVO:
        raise AtendimentoInvalido(atendimento_id)
    return atendimento


def _buscar_template_ativo_da_categoria_ou_levantar(
    categoria: str, templates: TemplateLaudoRepository
) -> TemplateLaudo:
    candidatos = [t for t in templates.listar_todas() if t.categoria == categoria and t.ativo]
    if not candidatos:
        raise TemplateLaudoIndisponivel(categoria)
    return candidatos[0]


def criar_laudo(
    atendimento_id: str,
    exame_id: str,
    usuario_id: str,
    repo: LaudoRepository,
    atendimentos: AtendimentoRepository,
    exames: ExameRepository,
    templates: TemplateLaudoRepository,
) -> Laudo:
    """Cria um laudo em rascunho para um exame de um atendimento.

    Valida que o atendimento existe e está ativo, que o exame faz parte do
    atendimento, que existe um template ativo para a categoria do exame, e
    que não existe já um laudo para o mesmo par (atendimento, exame).
    """
    atendimento = _buscar_atendimento_ativo_ou_levantar(atendimento_id, atendimentos)

    if not any(item.exame_id == exame_id for item in atendimento.itens_exame):
        raise ExameForaDoAtendimento(exame_id, atendimento_id)

    exame = exames.buscar_por_id(exame_id)
    if exame is None:
        raise ExameForaDoAtendimento(exame_id, atendimento_id)

    if any(
        laudo.atendimento_id == atendimento_id and laudo.exame_id == exame_id
        for laudo in repo.listar_todas()
    ):
        raise LaudoJaExiste(atendimento_id, exame_id)

    template = _buscar_template_ativo_da_categoria_ou_levantar(exame.categoria, templates)

    laudo = Laudo(
        id=str(uuid.uuid4()),
        atendimento_id=atendimento_id,
        exame_id=exame_id,
        template_id=template.id,
        valores=[],
        status=StatusLaudo.RASCUNHO,
        criado_por=usuario_id,
        criado_em=datetime.now(UTC),
    )
    repo.salvar(laudo)
    return laudo


def _buscar_laudo_ou_levantar(laudo_id: str, repo: LaudoRepository) -> Laudo:
    laudo = repo.buscar_por_id(laudo_id)
    if laudo is None:
        raise LaudoNaoEncontrado(laudo_id)
    return laudo


def salvar_rascunho(laudo_id: str, valores: list[ValorCampo], repo: LaudoRepository) -> Laudo:
    """Atualiza os valores preenchidos de um laudo em rascunho.

    Rejeitado se o laudo já estiver finalizado (conteúdo finalizado não é
    editável — ver "Implementation Decisions" da spec).
    """
    laudo = _buscar_laudo_ou_levantar(laudo_id, repo)
    if laudo.status == StatusLaudo.FINALIZADO:
        raise LaudoFinalizado(laudo_id)
    atualizado = replace(laudo, valores=valores)
    repo.salvar(atualizado)
    return atualizado


def _tentar_enviar(
    laudo: Laudo,
    dados: DadosLaudo,
    destinatario: str,
    gerador_pdf: GeradorPdfLaudo,
    envio_gateway: EnvioLaudoGateway,
) -> Laudo:
    pdf = gerador_pdf.gerar(dados)
    try:
        envio_gateway.enviar(
            destinatario=destinatario,
            assunto=f"Laudo — {dados.exame_nome} — {dados.paciente_nome}",
            corpo=f"Segue em anexo o laudo de {dados.exame_nome} do paciente {dados.paciente_nome}.",
            anexo_pdf=pdf,
            nome_anexo=f"laudo-{laudo.id}.pdf",
        )
    except Exception as erro:  # noqa: BLE001 — gateway externo, qualquer falha é elegível a retry manual
        return replace(laudo, erro_envio=str(erro))
    return replace(laudo, enviado_em=datetime.now(UTC), erro_envio=None)


def finalizar_laudo(
    laudo_id: str,
    usuario_id: str,
    destinatario: str,
    dados: DadosLaudo,
    repo: LaudoRepository,
    gerador_pdf: GeradorPdfLaudo,
    envio_gateway: EnvioLaudoGateway,
) -> Laudo:
    """Finaliza um laudo em rascunho e tenta enviá-lo por e-mail.

    A finalização não fica bloqueada por falha de envio: `status` sempre
    muda para `finalizado`; sucesso de envio grava `enviado_em`, falha grava
    `erro_envio` para orientar um `reenviar_laudo` posterior (US31).
    `dados` já vem montado pelo chamador via `montar_dados_laudo`.
    """
    laudo = _buscar_laudo_ou_levantar(laudo_id, repo)
    if laudo.status == StatusLaudo.FINALIZADO:
        raise LaudoFinalizado(laudo_id)

    finalizado = replace(
        laudo,
        status=StatusLaudo.FINALIZADO,
        finalizado_por=usuario_id,
        finalizado_em=datetime.now(UTC),
    )
    enviado = _tentar_enviar(finalizado, dados, destinatario, gerador_pdf, envio_gateway)
    repo.salvar(enviado)
    return enviado


def reenviar_laudo(
    laudo_id: str,
    destinatario: str,
    dados: DadosLaudo,
    repo: LaudoRepository,
    gerador_pdf: GeradorPdfLaudo,
    envio_gateway: EnvioLaudoGateway,
) -> Laudo:
    """Reenvia um laudo já finalizado (US31), regenerando o PDF a partir do conteúdo atual."""
    laudo = _buscar_laudo_ou_levantar(laudo_id, repo)
    if laudo.status != StatusLaudo.FINALIZADO:
        raise LaudoNaoFinalizado(laudo_id)

    enviado = _tentar_enviar(laudo, dados, destinatario, gerador_pdf, envio_gateway)
    repo.salvar(enviado)
    return enviado


def listar_laudos(
    repo: LaudoRepository,
    usuario: Usuario,
    atendimentos: AtendimentoRepository,
    *,
    atendimento_id: str | None = None,
    status: StatusLaudo | None = None,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
) -> list[Laudo]:
    """Lista laudos, filtrando por atendimento, status e período de criação.

    Um usuário com `papel=clinica` só enxerga laudos de atendimentos da
    própria clínica — mesmo padrão de filtro de escopo de
    `atendimentos.service.listar_atendimentos` (S6): `authorize()` decide
    acesso a um recurso único, não filtro de lista.
    """
    laudos = repo.listar_todas()

    if usuario.papel == Papel.CLINICA:
        clinicas_por_atendimento = {a.id: a.clinica_id for a in atendimentos.listar_todas()}
        laudos = [
            laudo
            for laudo in laudos
            if clinicas_por_atendimento.get(laudo.atendimento_id) == usuario.clinica_id
        ]

    if atendimento_id is not None:
        laudos = [laudo for laudo in laudos if laudo.atendimento_id == atendimento_id]
    if status is not None:
        laudos = [laudo for laudo in laudos if laudo.status == status]
    if data_inicio is not None:
        laudos = [laudo for laudo in laudos if laudo.criado_em >= data_inicio]
    if data_fim is not None:
        laudos = [laudo for laudo in laudos if laudo.criado_em <= data_fim]

    return laudos


def ver_laudo(
    laudo_id: str,
    usuario: Usuario,
    repo: LaudoRepository,
    atendimentos: AtendimentoRepository,
) -> Laudo:
    """Busca um laudo único, aplicando o escopo de clínica via `authorize()`.

    Diferente de `listar_laudos`, este é um recurso único — usa
    `authorize(papel, Acao.LAUDO_VER, clinica_usuario=..., clinica_recurso=...)`
    de verdade, o primeiro consumidor real do escopo de `_ACOES_COM_ESCOPO_DE_CLINICA`
    desde que existe em S1.
    """
    from vertere_api.auth.service import Acao, authorize

    laudo = _buscar_laudo_ou_levantar(laudo_id, repo)
    atendimento = atendimentos.buscar_por_id(laudo.atendimento_id)
    clinica_recurso = atendimento.clinica_id if atendimento else None

    if not authorize(
        usuario.papel,
        Acao.LAUDO_VER,
        clinica_usuario=usuario.clinica_id,
        clinica_recurso=clinica_recurso,
    ):
        raise LaudoNaoEncontrado(laudo_id)

    return laudo
