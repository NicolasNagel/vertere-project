from datetime import UTC, datetime
from decimal import Decimal

import pytest

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.auth.domain import Papel, Usuario
from vertere_api.laudos.domain import Laudo, StatusLaudo
from vertere_api.pacientes.domain import Paciente
from vertere_api.pacientes.service import PacienteNaoEncontrado, buscar_historico_paciente


class _RepositorioFakeGenerico:
    def __init__(self, itens: list) -> None:
        self._itens = list(itens)

    def listar_todas(self) -> list:
        return list(self._itens)


class PacienteRepositorioFake:
    def __init__(self, pacientes: list[Paciente]) -> None:
        self._por_id = {p.id: p for p in pacientes}

    def buscar_por_id(self, paciente_id: str) -> Paciente | None:
        return self._por_id.get(paciente_id)

    def listar_todas(self) -> list[Paciente]:
        return list(self._por_id.values())

    def salvar(self, paciente: Paciente) -> None:
        self._por_id[paciente.id] = paciente


def _paciente(id_: str, clinica_id: str) -> Paciente:
    return Paciente(
        id=id_, nome="Rex", especie="Canina", raca="Labrador", sexo="M",
        idade=3, proprietario="Maria Souza", clinica_id=clinica_id, ativo=True,
    )


def _atendimento(id_: str, paciente_id: str, clinica_id: str) -> Atendimento:
    return Atendimento(
        id=id_,
        clinica_id=clinica_id,
        veterinario_id="vet-1",
        paciente_id=paciente_id,
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal("45.00"), quantidade=1)],
        metodo_coleta="Punção venosa",
        data_hora=datetime(2026, 9, 20, 10, 0, tzinfo=UTC),
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal("45.00"),
        status=StatusAtendimento.ATIVO,
    )


def _laudo(id_: str, atendimento_id: str) -> Laudo:
    return Laudo(
        id=id_,
        atendimento_id=atendimento_id,
        exame_id="exame-1",
        template_id="tpl-1",
        valores=[],
        status=StatusLaudo.RASCUNHO,
        criado_por="usuario-1",
        criado_em=datetime(2026, 9, 20, 11, 0, tzinfo=UTC),
    )


def _usuario(papel: Papel, clinica_id: str | None = None) -> Usuario:
    return Usuario(
        id="usuario-1", email="u@vertere.com", senha_hash="hash", papel=papel, ativo=True, clinica_id=clinica_id
    )


class TestBuscarHistoricoPaciente:
    def _cenario(self):
        pacientes = PacienteRepositorioFake(
            [_paciente("paciente-1", "clinica-1"), _paciente("paciente-2", "clinica-2")]
        )
        atendimentos = _RepositorioFakeGenerico(
            [
                _atendimento("atendimento-1", "paciente-1", "clinica-1"),
                _atendimento("atendimento-2", "paciente-1", "clinica-1"),
                _atendimento("atendimento-3", "paciente-2", "clinica-2"),
            ]
        )
        laudos = _RepositorioFakeGenerico(
            [
                _laudo("laudo-1", "atendimento-1"),
                _laudo("laudo-2", "atendimento-3"),
            ]
        )
        return pacientes, atendimentos, laudos

    def test_admin_ve_historico_completo_do_paciente(self) -> None:
        pacientes, atendimentos, laudos = self._cenario()

        historico = buscar_historico_paciente(
            "paciente-1", _usuario(Papel.ADMIN), pacientes, atendimentos, laudos
        )

        assert historico.paciente.id == "paciente-1"
        assert {a.id for a in historico.atendimentos} == {"atendimento-1", "atendimento-2"}
        assert {l.id for l in historico.laudos} == {"laudo-1"}

    def test_clinica_ve_historico_de_paciente_da_propria_clinica(self) -> None:
        pacientes, atendimentos, laudos = self._cenario()

        historico = buscar_historico_paciente(
            "paciente-1", _usuario(Papel.CLINICA, clinica_id="clinica-1"), pacientes, atendimentos, laudos
        )

        assert historico.paciente.id == "paciente-1"
        assert {a.id for a in historico.atendimentos} == {"atendimento-1", "atendimento-2"}

    def test_clinica_nao_ve_historico_de_paciente_de_outra_clinica(self) -> None:
        pacientes, atendimentos, laudos = self._cenario()

        with pytest.raises(PacienteNaoEncontrado):
            buscar_historico_paciente(
                "paciente-2", _usuario(Papel.CLINICA, clinica_id="clinica-1"), pacientes, atendimentos, laudos
            )

    def test_paciente_inexistente_levanta_erro(self) -> None:
        pacientes, atendimentos, laudos = self._cenario()

        with pytest.raises(PacienteNaoEncontrado):
            buscar_historico_paciente(
                "inexistente", _usuario(Papel.ADMIN), pacientes, atendimentos, laudos
            )
