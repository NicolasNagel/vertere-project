from datetime import time
from decimal import Decimal

from pydantic import BaseModel


class ExameResponse(BaseModel):
    id: str
    categoria: str
    nome: str
    preco_base: Decimal
    ativo: bool


class CriarExameRequest(BaseModel):
    categoria: str
    nome: str
    preco_base: Decimal


class EditarExameRequest(BaseModel):
    categoria: str
    nome: str
    preco_base: Decimal


class RegraPlantaoResponse(BaseModel):
    id: str
    dia_semana: int
    hora_inicio: time
    hora_fim: time
    valor_adicional: Decimal
    ativo: bool


class CriarRegraPlantaoRequest(BaseModel):
    dia_semana: int
    hora_inicio: time
    hora_fim: time
    valor_adicional: Decimal


class EditarRegraPlantaoRequest(BaseModel):
    dia_semana: int
    hora_inicio: time
    hora_fim: time
    valor_adicional: Decimal
