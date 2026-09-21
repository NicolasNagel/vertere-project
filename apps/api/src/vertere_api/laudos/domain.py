from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class StatusLaudo(StrEnum):
    RASCUNHO = "rascunho"
    FINALIZADO = "finalizado"


@dataclass(frozen=True)
class CampoTemplate:
    nome: str
    unidade: str | None
    faixa_referencia: str | None


@dataclass(frozen=True)
class TemplateLaudo:
    id: str
    categoria: str
    campos: list[CampoTemplate]
    ativo: bool


@dataclass(frozen=True)
class ValorCampo:
    nome_campo: str
    valor: str


@dataclass(frozen=True)
class Laudo:
    id: str
    atendimento_id: str
    exame_id: str
    template_id: str
    valores: list[ValorCampo]
    status: StatusLaudo
    criado_por: str
    criado_em: datetime
    finalizado_por: str | None = None
    finalizado_em: datetime | None = None
    enviado_em: datetime | None = None
    erro_envio: str | None = None


@dataclass(frozen=True)
class CampoDadosLaudo:
    nome: str
    valor: str
    unidade: str | None
    faixa_referencia: str | None


@dataclass(frozen=True)
class DadosLaudo:
    """Estrutura final de conteúdo de um laudo, pronta para renderização (PDF/e-mail).

    Montada por `montar_dados_laudo` a partir das entidades já carregadas
    pelo chamador (`Laudo`, `TemplateLaudo`, `Atendimento`, `Exame`,
    `Paciente`, `Veterinario`, `Clinica`) — não carrega nada sozinha.
    """

    laudo_id: str
    paciente_nome: str
    clinica_nome: str
    veterinario_nome: str
    veterinario_crmv: str
    exame_nome: str
    exame_categoria: str
    data_atendimento: datetime
    campos: list[CampoDadosLaudo] = field(default_factory=list)
