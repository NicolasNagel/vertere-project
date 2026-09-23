from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CampoTemplateSchema(BaseModel):
    nome: str
    unidade: str | None = None
    faixa_referencia: str | None = None


class TemplateLaudoResponse(BaseModel):
    id: str
    categoria: str
    campos: list[CampoTemplateSchema]
    ativo: bool


class CriarTemplateLaudoRequest(BaseModel):
    categoria: str
    campos: list[CampoTemplateSchema]


class EditarTemplateLaudoRequest(BaseModel):
    categoria: str
    campos: list[CampoTemplateSchema]


class ValorCampoSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nome_campo: str
    valor: str


class LaudoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    atendimento_id: str
    exame_id: str
    template_id: str
    valores: list[ValorCampoSchema]
    status: str
    criado_por: str
    criado_em: datetime
    finalizado_por: str | None
    finalizado_em: datetime | None
    enviado_em: datetime | None
    erro_envio: str | None


class CriarLaudoRequest(BaseModel):
    atendimento_id: str
    exame_id: str


class SalvarRascunhoRequest(BaseModel):
    valores: list[ValorCampoSchema]
