import uuid
from dataclasses import replace
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Protocol

from vertere_api.atendimentos.domain import Atendimento, StatusAtendimento
from vertere_api.atendimentos.service import AtendimentoRepository
from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.service import ClinicaRepository
from vertere_api.financeiro.domain import Fechamento, StatusFechamento

_DIA_VENCIMENTO_PADRAO = 10


class FechamentoRepository(Protocol):
    def buscar_por_id(self, fechamento_id: str) -> Fechamento | None: ...
    def buscar_por_clinica_periodo(self, clinica_id: str, ano: int, mes: int) -> Fechamento | None: ...
    def listar_todas(self) -> list[Fechamento]: ...
    def salvar(self, fechamento: Fechamento) -> None: ...


class ClinicaInvalida(Exception):
    def __init__(self, clinica_id: str) -> None:
        super().__init__(f"Clínica {clinica_id} inexistente ou inativa")


class FechamentoJaExiste(Exception):
    def __init__(self, clinica_id: str, ano: int, mes: int) -> None:
        super().__init__(f"Fechamento já existe para a clínica {clinica_id} no período {mes}/{ano}")


class FechamentoNaoEncontrado(Exception):
    def __init__(self, fechamento_id: str) -> None:
        super().__init__(f"Fechamento {fechamento_id} não encontrado")


class FechamentoJaPago(Exception):
    def __init__(self, fechamento_id: str) -> None:
        super().__init__(f"Fechamento {fechamento_id} já está pago")


def _atendimentos_ativos_do_periodo(
    atendimentos: list[Atendimento], clinica_id: str, ano: int, mes: int
) -> list[Atendimento]:
    return [
        a
        for a in atendimentos
        if a.clinica_id == clinica_id
        and a.status == StatusAtendimento.ATIVO
        and a.data_hora.year == ano
        and a.data_hora.month == mes
    ]


def calcular_faturamento_por_clinica(
    atendimentos: list[Atendimento], clinica_id: str, ano: int, mes: int
) -> Decimal:
    """Soma o `valor_total` dos atendimentos ativos de `clinica_id` no mês/ano informado."""
    itens = _atendimentos_ativos_do_periodo(atendimentos, clinica_id, ano, mes)
    return sum((a.valor_total for a in itens), Decimal("0"))


def calcular_resumo_financeiro(
    atendimentos: list[Atendimento], ano: int, mes: int
) -> list[tuple[str, Decimal]]:
    """Faturamento de cada clínica presente nos atendimentos do mês/ano informado."""
    clinicas_ids = {a.clinica_id for a in atendimentos}
    return [
        (clinica_id, calcular_faturamento_por_clinica(atendimentos, clinica_id, ano, mes))
        for clinica_id in clinicas_ids
    ]


def calcular_vencimento(clinica: Clinica, data_fechamento: datetime) -> date:
    """Data de vencimento do pagamento de um fechamento.

    Se `clinica.prazo_pagamento_dias` estiver definido, vence `N` dias após
    `data_fechamento`. Caso contrário, usa a regra padrão: dia 10 do mês
    seguinte ao mês de `data_fechamento`.
    """
    if clinica.prazo_pagamento_dias is not None:
        return (data_fechamento + timedelta(days=clinica.prazo_pagamento_dias)).date()

    ano, mes = data_fechamento.year, data_fechamento.month + 1
    if mes > 12:
        ano, mes = ano + 1, 1
    return date(ano, mes, _DIA_VENCIMENTO_PADRAO)


def status_exibicao(fechamento: Fechamento, clinica: Clinica, hoje: date) -> StatusFechamento:
    """Status exibido de um fechamento, calculado sob demanda (nunca gravado)."""
    if fechamento.pago:
        return StatusFechamento.PAGO
    if hoje > calcular_vencimento(clinica, fechamento.data_fechamento):
        return StatusFechamento.INADIMPLENTE
    return StatusFechamento.PENDENTE


def listar_fechamentos(repo: FechamentoRepository, *, clinica_id: str | None = None) -> list[Fechamento]:
    """Lista fechamentos, opcionalmente filtrando por clínica."""
    fechamentos = repo.listar_todas()
    if clinica_id is not None:
        fechamentos = [f for f in fechamentos if f.clinica_id == clinica_id]
    return fechamentos


def gerar_fechamento(
    clinica_id: str,
    ano: int,
    mes: int,
    repo: FechamentoRepository,
    atendimentos_repo: AtendimentoRepository,
    clinicas_repo: ClinicaRepository,
) -> Fechamento:
    """Gera o snapshot do fechamento mensal de uma clínica.

    Rejeita clínica inexistente/inativa e reprocessamento de um período já
    fechado. Fechar um período sem atendimentos ativos é permitido (gera
    `valor_total=0`).
    """
    clinica = clinicas_repo.buscar_por_id(clinica_id)
    if clinica is None or not clinica.ativo:
        raise ClinicaInvalida(clinica_id)
    if repo.buscar_por_clinica_periodo(clinica_id, ano, mes) is not None:
        raise FechamentoJaExiste(clinica_id, ano, mes)

    atendimentos = atendimentos_repo.listar_todas()
    valor_total = calcular_faturamento_por_clinica(atendimentos, clinica_id, ano, mes)
    quantidade = len(_atendimentos_ativos_do_periodo(atendimentos, clinica_id, ano, mes))

    fechamento = Fechamento(
        id=str(uuid.uuid4()),
        clinica_id=clinica_id,
        ano=ano,
        mes=mes,
        valor_total=valor_total,
        quantidade_atendimentos=quantidade,
        data_fechamento=datetime.now(),
        pago=False,
        data_pagamento=None,
    )
    repo.salvar(fechamento)
    return fechamento


def confirmar_pagamento(
    fechamento_id: str, repo: FechamentoRepository, data_pagamento: datetime | None = None
) -> Fechamento:
    """Dá baixa manual no fechamento, marcando `pago=True`.

    Rejeita confirmar um fechamento já pago (idempotência, mesmo padrão de
    `cancelar_atendimento` em S6) — não existe estorno nesta spec.
    """
    fechamento = repo.buscar_por_id(fechamento_id)
    if fechamento is None:
        raise FechamentoNaoEncontrado(fechamento_id)
    if fechamento.pago:
        raise FechamentoJaPago(fechamento_id)

    atualizado = replace(
        fechamento, pago=True, data_pagamento=data_pagamento or datetime.now()
    )
    repo.salvar(atualizado)
    return atualizado


def exportar_fechamento_csv(fechamento: Fechamento, clinica: Clinica, hoje: date) -> str:
    """Monta um CSV (cabeçalho + uma linha) com os dados do fechamento para cobrança externa."""
    status = status_exibicao(fechamento, clinica, hoje)
    data_pagamento = (
        fechamento.data_pagamento.date().isoformat() if fechamento.data_pagamento else ""
    )
    cabecalho = "clinica,ano,mes,valor_total,quantidade_atendimentos,status,data_pagamento"
    linha = (
        f"{clinica.nome},{fechamento.ano},{fechamento.mes},{fechamento.valor_total},"
        f"{fechamento.quantidade_atendimentos},{status.value},{data_pagamento}"
    )
    return f"{cabecalho}\n{linha}\n"
