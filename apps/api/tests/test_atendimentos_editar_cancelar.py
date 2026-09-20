from datetime import datetime
from decimal import Decimal

import pytest

from vertere_api.atendimentos.domain import Atendimento, ItemExame, ItemExameEntrada, StatusAtendimento
from vertere_api.atendimentos.service import (
    AtendimentoCancelado,
    AtendimentoNaoEncontrado,
    cancelar_atendimento,
    editar_atendimento,
)
from vertere_api.clinicas.domain import Clinica
from vertere_api.exames.domain import Exame
from vertere_api.pacientes.domain import Paciente
from vertere_api.veterinarios.domain import Veterinario


class AtendimentoRepositorioFake:
    def __init__(self, atendimentos: list[Atendimento] | None = None) -> None:
        self._por_id = {a.id: a for a in (atendimentos or [])}

    def buscar_por_id(self, atendimento_id: str) -> Atendimento | None:
        return self._por_id.get(atendimento_id)

    def listar_todas(self) -> list[Atendimento]:
        return list(self._por_id.values())

    def salvar(self, atendimento: Atendimento) -> None:
        self._por_id[atendimento.id] = atendimento


class _RepositorioFakeGenerico:
    def __init__(self, itens: list) -> None:
        self._por_id = {item.id: item for item in itens}

    def buscar_por_id(self, item_id: str):
        return self._por_id.get(item_id)

    def listar_todas(self) -> list:
        return list(self._por_id.values())


def _clinica() -> Clinica:
    return Clinica(
        id="clinica-1",
        nome="Clínica Central",
        cnpj="00.000.000/0001-00",
        endereco="Rua A, 123",
        telefone="47999990000",
        email="contato@clinica.com",
        ativo=True,
    )


def _veterinario() -> Veterinario:
    return Veterinario(
        id="vet-1",
        nome="Dr. João",
        crmv="SC-1234",
        telefone="47988880000",
        email="joao@clinica.com",
        clinica_id="clinica-1",
        ativo=True,
    )


def _paciente() -> Paciente:
    return Paciente(
        id="paciente-1",
        nome="Rex",
        especie="Canina",
        raca="SRD",
        sexo="M",
        idade=3,
        proprietario="Maria",
        clinica_id="clinica-1",
        ativo=True,
    )


def _exame() -> Exame:
    return Exame(
        id="exame-1", categoria="Hematologia", nome="Hemograma", preco_base=Decimal("45.00"), ativo=True
    )


def _atendimento(status: StatusAtendimento = StatusAtendimento.ATIVO) -> Atendimento:
    return Atendimento(
        id="atendimento-1",
        clinica_id="clinica-1",
        veterinario_id="vet-1",
        paciente_id="paciente-1",
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal("45.00"), quantidade=1)],
        metodo_coleta="Punção venosa",
        data_hora=datetime(2026, 9, 23, 13, 0),
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal("45.00"),
        status=status,
    )


class _Contexto:
    def __init__(self, atendimento: Atendimento | None = None) -> None:
        self.repo = AtendimentoRepositorioFake([atendimento or _atendimento()])
        self.clinicas = _RepositorioFakeGenerico([_clinica()])
        self.veterinarios = _RepositorioFakeGenerico([_veterinario()])
        self.pacientes = _RepositorioFakeGenerico([_paciente()])
        self.exames = _RepositorioFakeGenerico([_exame()])
        self.regras_plantao = _RepositorioFakeGenerico([])

    def editar(self, atendimento_id: str = "atendimento-1", **kwargs):
        base = dict(
            atendimento_id=atendimento_id,
            clinica_id="clinica-1",
            veterinario_id="vet-1",
            paciente_id="paciente-1",
            itens_exame=[ItemExameEntrada(exame_id="exame-1", quantidade=2)],
            metodo_coleta="Punção venosa",
            data_hora=datetime(2026, 9, 23, 13, 0),
            repo=self.repo,
            clinicas=self.clinicas,
            veterinarios=self.veterinarios,
            pacientes=self.pacientes,
            exames=self.exames,
            regras_plantao=self.regras_plantao,
        )
        base.update(kwargs)
        return editar_atendimento(**base)


class TestEditarAtendimento:
    def test_edita_atendimento_ativo_recalculando_valor_total(self) -> None:
        ctx = _Contexto()

        atualizado = ctx.editar()

        assert atualizado.itens_exame[0].quantidade == 2
        assert atualizado.valor_total == Decimal("90.00")
        assert ctx.repo.buscar_por_id("atendimento-1").valor_total == Decimal("90.00")

    def test_edita_desconto(self) -> None:
        ctx = _Contexto()

        atualizado = ctx.editar(desconto=Decimal("10.00"))

        assert atualizado.desconto == Decimal("10.00")
        assert atualizado.valor_total == Decimal("80.00")

    def test_editar_atendimento_inexistente_levanta_erro(self) -> None:
        ctx = _Contexto()

        with pytest.raises(AtendimentoNaoEncontrado):
            ctx.editar(atendimento_id="inexistente")

    def test_editar_atendimento_cancelado_levanta_erro(self) -> None:
        ctx = _Contexto(atendimento=_atendimento(status=StatusAtendimento.CANCELADO))

        with pytest.raises(AtendimentoCancelado):
            ctx.editar()


class TestCancelarAtendimento:
    def test_cancela_atendimento_ativo(self) -> None:
        repo = AtendimentoRepositorioFake([_atendimento()])

        cancelado = cancelar_atendimento("atendimento-1", repo)

        assert cancelado.status == StatusAtendimento.CANCELADO
        assert repo.buscar_por_id("atendimento-1").status == StatusAtendimento.CANCELADO

    def test_cancelar_atendimento_inexistente_levanta_erro(self) -> None:
        repo = AtendimentoRepositorioFake()

        with pytest.raises(AtendimentoNaoEncontrado):
            cancelar_atendimento("inexistente", repo)
