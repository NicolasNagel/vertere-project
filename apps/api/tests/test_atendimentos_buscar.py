from datetime import datetime
from decimal import Decimal

import pytest

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.atendimentos.service import AtendimentoNaoEncontrado, buscar_atendimento
from vertere_api.auth.domain import Papel, Usuario


class AtendimentoRepositorioFake:
    def __init__(self, atendimentos: list[Atendimento] | None = None) -> None:
        self._por_id = {a.id: a for a in (atendimentos or [])}

    def buscar_por_id(self, atendimento_id: str) -> Atendimento | None:
        return self._por_id.get(atendimento_id)

    def listar_todas(self) -> list[Atendimento]:
        return list(self._por_id.values())

    def salvar(self, atendimento: Atendimento) -> None:
        self._por_id[atendimento.id] = atendimento


def _atendimento(id_: str, clinica_id: str = "clinica-1") -> Atendimento:
    return Atendimento(
        id=id_,
        clinica_id=clinica_id,
        veterinario_id="vet-1",
        paciente_id="paciente-1",
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal("45.00"), quantidade=1)],
        metodo_coleta="Punção venosa",
        data_hora=datetime(2026, 9, 10, 10, 0),
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal("45.00"),
        status=StatusAtendimento.ATIVO,
    )


def _usuario(papel: Papel, clinica_id: str | None = None) -> Usuario:
    return Usuario(
        id="usuario-1", email="user@vertere.com", senha_hash="hash", papel=papel, ativo=True, clinica_id=clinica_id
    )


class TestBuscarAtendimento:
    def test_admin_ve_qualquer_atendimento(self) -> None:
        repo = AtendimentoRepositorioFake([_atendimento("atendimento-1", "clinica-1")])

        atendimento = buscar_atendimento("atendimento-1", _usuario(Papel.ADMIN), repo)

        assert atendimento.id == "atendimento-1"

    def test_clinica_ve_atendimento_da_propria_clinica(self) -> None:
        repo = AtendimentoRepositorioFake([_atendimento("atendimento-1", "clinica-1")])

        atendimento = buscar_atendimento(
            "atendimento-1", _usuario(Papel.CLINICA, clinica_id="clinica-1"), repo
        )

        assert atendimento.id == "atendimento-1"

    def test_clinica_nao_ve_atendimento_de_outra_clinica(self) -> None:
        repo = AtendimentoRepositorioFake([_atendimento("atendimento-1", "clinica-1")])

        with pytest.raises(AtendimentoNaoEncontrado):
            buscar_atendimento("atendimento-1", _usuario(Papel.CLINICA, clinica_id="clinica-2"), repo)

    def test_atendimento_inexistente_levanta_erro(self) -> None:
        repo = AtendimentoRepositorioFake()

        with pytest.raises(AtendimentoNaoEncontrado):
            buscar_atendimento("inexistente", _usuario(Papel.ADMIN), repo)
