from datetime import datetime
from decimal import Decimal

import pytest

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.clinicas.domain import Clinica
from vertere_api.financeiro.domain import Fechamento
from vertere_api.financeiro.service import (
    ClinicaInvalida,
    FechamentoJaExiste,
    gerar_fechamento,
)


class FechamentoRepositorioFake:
    def __init__(self, fechamentos: list[Fechamento] | None = None) -> None:
        self._por_id = {f.id: f for f in (fechamentos or [])}

    def buscar_por_id(self, fechamento_id: str) -> Fechamento | None:
        return self._por_id.get(fechamento_id)

    def buscar_por_clinica_periodo(self, clinica_id: str, ano: int, mes: int) -> Fechamento | None:
        for f in self._por_id.values():
            if f.clinica_id == clinica_id and f.ano == ano and f.mes == mes:
                return f
        return None

    def listar_todas(self) -> list[Fechamento]:
        return list(self._por_id.values())

    def salvar(self, fechamento: Fechamento) -> None:
        self._por_id[fechamento.id] = fechamento


class AtendimentoRepositorioFake:
    def __init__(self, atendimentos: list[Atendimento] | None = None) -> None:
        self._itens = list(atendimentos or [])

    def buscar_por_id(self, atendimento_id: str) -> Atendimento | None:
        return next((a for a in self._itens if a.id == atendimento_id), None)

    def listar_todas(self) -> list[Atendimento]:
        return list(self._itens)

    def salvar(self, atendimento: Atendimento) -> None:
        self._itens = [a for a in self._itens if a.id != atendimento.id] + [atendimento]


class ClinicaRepositorioFake:
    def __init__(self, clinicas: list[Clinica] | None = None) -> None:
        self._por_id = {c.id: c for c in (clinicas or [])}

    def buscar_por_id(self, clinica_id: str) -> Clinica | None:
        return self._por_id.get(clinica_id)

    def listar_todas(self) -> list[Clinica]:
        return list(self._por_id.values())

    def salvar(self, clinica: Clinica) -> None:
        self._por_id[clinica.id] = clinica


def _clinica(ativo: bool = True) -> Clinica:
    return Clinica(
        id="clinica-1",
        nome="Clínica Central",
        cnpj="11222333000181",
        endereco="Rua A, 123",
        telefone="47999990000",
        email="contato@clinica.com",
        ativo=ativo,
    )


def _atendimento(valor_total: str, data_hora: datetime, id: str = "a1") -> Atendimento:
    return Atendimento(
        id=id,
        clinica_id="clinica-1",
        veterinario_id="vet-1",
        paciente_id="paciente-1",
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal(valor_total), quantidade=1)],
        metodo_coleta="presencial",
        data_hora=data_hora,
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal(valor_total),
        status=StatusAtendimento.ATIVO,
    )


class TestGerarFechamento:
    def test_gera_fechamento_valido(self) -> None:
        atendimentos = AtendimentoRepositorioFake(
            [
                _atendimento("100.00", datetime(2026, 9, 5), id="a1"),
                _atendimento("50.00", datetime(2026, 9, 20), id="a2"),
            ]
        )
        clinicas = ClinicaRepositorioFake([_clinica()])
        repo = FechamentoRepositorioFake()

        fechamento = gerar_fechamento("clinica-1", 2026, 9, repo, atendimentos, clinicas)

        assert fechamento.valor_total == Decimal("150.00")
        assert fechamento.quantidade_atendimentos == 2
        assert fechamento.pago is False
        assert fechamento.data_pagamento is None
        assert repo.buscar_por_clinica_periodo("clinica-1", 2026, 9) == fechamento

    def test_clinica_inexistente_e_rejeitada(self) -> None:
        with pytest.raises(ClinicaInvalida):
            gerar_fechamento(
                "inexistente", 2026, 9, FechamentoRepositorioFake(), AtendimentoRepositorioFake(), ClinicaRepositorioFake()
            )

    def test_clinica_inativa_e_rejeitada(self) -> None:
        clinicas = ClinicaRepositorioFake([_clinica(ativo=False)])

        with pytest.raises(ClinicaInvalida):
            gerar_fechamento(
                "clinica-1", 2026, 9, FechamentoRepositorioFake(), AtendimentoRepositorioFake(), clinicas
            )

    def test_periodo_ja_fechado_e_rejeitado(self) -> None:
        clinicas = ClinicaRepositorioFake([_clinica()])
        existente = Fechamento(
            id="f1",
            clinica_id="clinica-1",
            ano=2026,
            mes=9,
            valor_total=Decimal("0"),
            quantidade_atendimentos=0,
            data_fechamento=datetime(2026, 10, 1),
            pago=False,
            data_pagamento=None,
        )
        repo = FechamentoRepositorioFake([existente])

        with pytest.raises(FechamentoJaExiste):
            gerar_fechamento("clinica-1", 2026, 9, repo, AtendimentoRepositorioFake(), clinicas)

    def test_periodo_sem_atendimentos_ativos_gera_valor_zero(self) -> None:
        clinicas = ClinicaRepositorioFake([_clinica()])

        fechamento = gerar_fechamento(
            "clinica-1", 2026, 9, FechamentoRepositorioFake(), AtendimentoRepositorioFake(), clinicas
        )

        assert fechamento.valor_total == Decimal("0")
        assert fechamento.quantidade_atendimentos == 0
