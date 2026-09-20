import uuid
from dataclasses import replace
from datetime import datetime, time
from decimal import Decimal
from typing import Protocol

from vertere_api.exames.domain import Exame, RegraPlantao


class ExameRepository(Protocol):
    def buscar_por_id(self, exame_id: str) -> Exame | None: ...
    def listar_todas(self) -> list[Exame]: ...
    def salvar(self, exame: Exame) -> None: ...


class RegraPlantaoRepository(Protocol):
    def buscar_por_id(self, regra_id: str) -> RegraPlantao | None: ...
    def listar_todas(self) -> list[RegraPlantao]: ...
    def salvar(self, regra: RegraPlantao) -> None: ...


def _regra_cobre_instante(regra: RegraPlantao, data_hora: datetime) -> bool:
    dia_semana = data_hora.weekday()
    hora = data_hora.time()

    if regra.hora_inicio <= regra.hora_fim:
        return dia_semana == regra.dia_semana and regra.hora_inicio <= hora < regra.hora_fim

    dia_seguinte = (regra.dia_semana + 1) % 7
    if dia_semana == regra.dia_semana:
        return hora >= regra.hora_inicio
    if dia_semana == dia_seguinte:
        return hora < regra.hora_fim
    return False


def calcular_adicional_plantao(
    data_hora: datetime, regras: list[RegraPlantao]
) -> RegraPlantao | None:
    """Decide qual `RegraPlantao` ativa (se houver) se aplica a `data_hora`.

    Regras inativas são ignoradas. Uma regra com `hora_inicio > hora_fim`
    representa uma janela que cruza a meia-noite (ex: 18:00 de `dia_semana`
    até 06:00 do dia seguinte). Se mais de uma regra ativa combinar com o
    mesmo instante, retorna a de maior `valor_adicional` (desempate
    determinístico, decisão de código).
    """
    candidatas = [
        regra for regra in regras if regra.ativo and _regra_cobre_instante(regra, data_hora)
    ]
    if not candidatas:
        return None
    return max(candidatas, key=lambda regra: regra.valor_adicional)


class ExameNaoEncontrado(Exception):
    def __init__(self, exame_id: str) -> None:
        super().__init__(f"Exame {exame_id} não encontrado")


def cadastrar_exame(
    categoria: str, nome: str, preco_base: Decimal, repo: ExameRepository
) -> Exame:
    """Cadastra um exame no catálogo."""
    exame = Exame(
        id=str(uuid.uuid4()), categoria=categoria, nome=nome, preco_base=preco_base, ativo=True
    )
    repo.salvar(exame)
    return exame


def _buscar_exame_ou_levantar(exame_id: str, repo: ExameRepository) -> Exame:
    exame = repo.buscar_por_id(exame_id)
    if exame is None:
        raise ExameNaoEncontrado(exame_id)
    return exame


def editar_exame(
    exame_id: str, categoria: str, nome: str, preco_base: Decimal, repo: ExameRepository
) -> Exame:
    """Edita categoria, nome e preço-base de um exame existente."""
    exame = _buscar_exame_ou_levantar(exame_id, repo)
    atualizado = replace(exame, categoria=categoria, nome=nome, preco_base=preco_base)
    repo.salvar(atualizado)
    return atualizado


def inativar_exame(exame_id: str, repo: ExameRepository) -> Exame:
    """Inativa um exame, preservando histórico associado a ele."""
    return _definir_exame_ativo(exame_id, ativo=False, repo=repo)


def reativar_exame(exame_id: str, repo: ExameRepository) -> Exame:
    """Reativa um exame previamente inativado."""
    return _definir_exame_ativo(exame_id, ativo=True, repo=repo)


def _definir_exame_ativo(exame_id: str, ativo: bool, repo: ExameRepository) -> Exame:
    exame = _buscar_exame_ou_levantar(exame_id, repo)
    atualizado = replace(exame, ativo=ativo)
    repo.salvar(atualizado)
    return atualizado


def listar_exames(
    repo: ExameRepository, *, categoria: str | None = None, apenas_ativos: bool = False
) -> list[Exame]:
    """Lista os exames cadastrados, opcionalmente filtrando por categoria e/ou ativos."""
    exames = repo.listar_todas()
    if categoria is not None:
        exames = [e for e in exames if e.categoria == categoria]
    if apenas_ativos:
        exames = [e for e in exames if e.ativo]
    return exames


class RegraPlantaoNaoEncontrada(Exception):
    def __init__(self, regra_id: str) -> None:
        super().__init__(f"Regra de plantão {regra_id} não encontrada")


def cadastrar_regra_plantao(
    dia_semana: int,
    hora_inicio: time,
    hora_fim: time,
    valor_adicional: Decimal,
    repo: RegraPlantaoRepository,
) -> RegraPlantao:
    """Cadastra uma regra de adicional de plantão."""
    regra = RegraPlantao(
        id=str(uuid.uuid4()),
        dia_semana=dia_semana,
        hora_inicio=hora_inicio,
        hora_fim=hora_fim,
        valor_adicional=valor_adicional,
        ativo=True,
    )
    repo.salvar(regra)
    return regra


def _buscar_regra_ou_levantar(regra_id: str, repo: RegraPlantaoRepository) -> RegraPlantao:
    regra = repo.buscar_por_id(regra_id)
    if regra is None:
        raise RegraPlantaoNaoEncontrada(regra_id)
    return regra


def editar_regra_plantao(
    regra_id: str,
    dia_semana: int,
    hora_inicio: time,
    hora_fim: time,
    valor_adicional: Decimal,
    repo: RegraPlantaoRepository,
) -> RegraPlantao:
    """Edita dia da semana, faixa de horário e valor adicional de uma regra existente."""
    regra = _buscar_regra_ou_levantar(regra_id, repo)
    atualizada = replace(
        regra,
        dia_semana=dia_semana,
        hora_inicio=hora_inicio,
        hora_fim=hora_fim,
        valor_adicional=valor_adicional,
    )
    repo.salvar(atualizada)
    return atualizada


def inativar_regra_plantao(regra_id: str, repo: RegraPlantaoRepository) -> RegraPlantao:
    """Inativa uma regra de plantão, preservando histórico associado a ela."""
    return _definir_regra_ativa(regra_id, ativo=False, repo=repo)


def reativar_regra_plantao(regra_id: str, repo: RegraPlantaoRepository) -> RegraPlantao:
    """Reativa uma regra de plantão previamente inativada."""
    return _definir_regra_ativa(regra_id, ativo=True, repo=repo)


def _definir_regra_ativa(
    regra_id: str, ativo: bool, repo: RegraPlantaoRepository
) -> RegraPlantao:
    regra = _buscar_regra_ou_levantar(regra_id, repo)
    atualizada = replace(regra, ativo=ativo)
    repo.salvar(atualizada)
    return atualizada


def listar_regras_plantao(
    repo: RegraPlantaoRepository, *, apenas_ativos: bool = False
) -> list[RegraPlantao]:
    """Lista as regras de plantão cadastradas, opcionalmente filtrando por ativas."""
    regras = repo.listar_todas()
    if apenas_ativos:
        regras = [r for r in regras if r.ativo]
    return regras
