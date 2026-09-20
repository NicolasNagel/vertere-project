from datetime import datetime, time
from decimal import Decimal

import pytest

from vertere_api.atendimentos.domain import Atendimento, ItemExameEntrada, StatusAtendimento
from vertere_api.atendimentos.service import (
    ClinicaInvalida,
    ExameInvalido,
    PacienteInvalido,
    VeterinarioInvalido,
    registrar_atendimento,
)
from vertere_api.clinicas.domain import Clinica
from vertere_api.exames.domain import Exame, RegraPlantao
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


def _clinica(ativo: bool = True) -> Clinica:
    return Clinica(
        id="clinica-1",
        nome="Clínica Central",
        cnpj="00.000.000/0001-00",
        endereco="Rua A, 123",
        telefone="47999990000",
        email="contato@clinica.com",
        ativo=ativo,
    )


def _veterinario(ativo: bool = True) -> Veterinario:
    return Veterinario(
        id="vet-1",
        nome="Dr. João",
        crmv="SC-1234",
        telefone="47988880000",
        email="joao@clinica.com",
        clinica_id="clinica-1",
        ativo=ativo,
    )


def _paciente(ativo: bool = True) -> Paciente:
    return Paciente(
        id="paciente-1",
        nome="Rex",
        especie="Canina",
        raca="SRD",
        sexo="M",
        idade=3,
        proprietario="Maria",
        clinica_id="clinica-1",
        ativo=ativo,
    )


def _exame(ativo: bool = True) -> Exame:
    return Exame(
        id="exame-1", categoria="Hematologia", nome="Hemograma", preco_base=Decimal("45.00"), ativo=ativo
    )


def _regra_plantao() -> RegraPlantao:
    return RegraPlantao(
        id="regra-1",
        dia_semana=2,
        hora_inicio=time(18, 0),
        hora_fim=time(23, 59, 59),
        valor_adicional=Decimal("30.00"),
        ativo=True,
    )


class _Contexto:
    def __init__(
        self,
        clinica: Clinica | None = None,
        veterinario: Veterinario | None = None,
        paciente: Paciente | None = None,
        exame: Exame | None = None,
        regras_plantao: list[RegraPlantao] | None = None,
    ) -> None:
        self.repo = AtendimentoRepositorioFake()
        self.clinicas = _RepositorioFakeGenerico([clinica or _clinica()])
        self.veterinarios = _RepositorioFakeGenerico([veterinario or _veterinario()])
        self.pacientes = _RepositorioFakeGenerico([paciente or _paciente()])
        self.exames = _RepositorioFakeGenerico([exame or _exame()])
        self.regras_plantao = _RepositorioFakeGenerico(
            regras_plantao if regras_plantao is not None else []
        )

    def registrar(self, **kwargs):
        base = dict(
            clinica_id="clinica-1",
            veterinario_id="vet-1",
            paciente_id="paciente-1",
            itens_exame=[ItemExameEntrada(exame_id="exame-1", quantidade=1)],
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
        return registrar_atendimento(**base)


class TestRegistrarAtendimento:
    def test_registro_valido_sem_regra_de_plantao_aplicavel(self) -> None:
        ctx = _Contexto()

        atendimento = ctx.registrar()

        assert atendimento.clinica_id == "clinica-1"
        assert atendimento.veterinario_id == "vet-1"
        assert atendimento.paciente_id == "paciente-1"
        assert atendimento.itens_exame[0].preco_unitario == Decimal("45.00")
        assert atendimento.itens_exame[0].quantidade == 1
        assert atendimento.valor_adicional_plantao == Decimal("0")
        assert atendimento.regra_plantao_id is None
        assert atendimento.valor_total == Decimal("45.00")
        assert atendimento.status == StatusAtendimento.ATIVO
        assert ctx.repo.buscar_por_id(atendimento.id) == atendimento

    def test_registro_com_sugestao_automatica_de_plantao(self) -> None:
        ctx = _Contexto(regras_plantao=[_regra_plantao()])

        atendimento = ctx.registrar(data_hora=datetime(2026, 9, 23, 19, 0))

        assert atendimento.regra_plantao_id == "regra-1"
        assert atendimento.valor_adicional_plantao == Decimal("30.00")
        assert atendimento.valor_total == Decimal("75.00")

    def test_registro_com_ajuste_manual_do_adicional(self) -> None:
        ctx = _Contexto(regras_plantao=[_regra_plantao()])

        atendimento = ctx.registrar(
            data_hora=datetime(2026, 9, 23, 19, 0),
            valor_adicional_plantao=Decimal("10.00"),
        )

        assert atendimento.valor_adicional_plantao == Decimal("10.00")
        assert atendimento.regra_plantao_id is None
        assert atendimento.valor_total == Decimal("55.00")

    def test_registro_com_desconto(self) -> None:
        ctx = _Contexto()

        atendimento = ctx.registrar(desconto=Decimal("5.00"))

        assert atendimento.desconto == Decimal("5.00")
        assert atendimento.valor_total == Decimal("40.00")

    def test_rejeita_clinica_inexistente(self) -> None:
        ctx = _Contexto()

        with pytest.raises(ClinicaInvalida):
            ctx.registrar(clinica_id="inexistente")

    def test_rejeita_clinica_inativa(self) -> None:
        ctx = _Contexto(clinica=_clinica(ativo=False))

        with pytest.raises(ClinicaInvalida):
            ctx.registrar()

    def test_rejeita_veterinario_inexistente(self) -> None:
        ctx = _Contexto()

        with pytest.raises(VeterinarioInvalido):
            ctx.registrar(veterinario_id="inexistente")

    def test_rejeita_veterinario_inativo(self) -> None:
        ctx = _Contexto(veterinario=_veterinario(ativo=False))

        with pytest.raises(VeterinarioInvalido):
            ctx.registrar()

    def test_rejeita_paciente_inexistente(self) -> None:
        ctx = _Contexto()

        with pytest.raises(PacienteInvalido):
            ctx.registrar(paciente_id="inexistente")

    def test_rejeita_paciente_inativo(self) -> None:
        ctx = _Contexto(paciente=_paciente(ativo=False))

        with pytest.raises(PacienteInvalido):
            ctx.registrar()

    def test_rejeita_exame_inexistente(self) -> None:
        ctx = _Contexto()

        with pytest.raises(ExameInvalido):
            ctx.registrar(itens_exame=[ItemExameEntrada(exame_id="inexistente", quantidade=1)])

    def test_rejeita_exame_inativo(self) -> None:
        ctx = _Contexto(exame=_exame(ativo=False))

        with pytest.raises(ExameInvalido):
            ctx.registrar()
