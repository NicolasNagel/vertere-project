from datetime import datetime
from decimal import Decimal

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.atendimentos.service import listar_atendimentos
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


def _atendimento(
    id_: str,
    clinica_id: str = "clinica-1",
    veterinario_id: str = "vet-1",
    data_hora: datetime = datetime(2026, 9, 10, 10, 0),
    status: StatusAtendimento = StatusAtendimento.ATIVO,
) -> Atendimento:
    return Atendimento(
        id=id_,
        clinica_id=clinica_id,
        veterinario_id=veterinario_id,
        paciente_id="paciente-1",
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal("45.00"), quantidade=1)],
        metodo_coleta="Punção venosa",
        data_hora=data_hora,
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal("45.00"),
        status=status,
    )


def _usuario(papel: Papel, clinica_id: str | None = None) -> Usuario:
    return Usuario(
        id="usuario-1",
        email="user@vertere.com",
        senha_hash="hash",
        papel=papel,
        ativo=True,
        clinica_id=clinica_id,
    )


def _repo() -> AtendimentoRepositorioFake:
    return AtendimentoRepositorioFake(
        [
            _atendimento("atendimento-1", clinica_id="clinica-1", veterinario_id="vet-1", data_hora=datetime(2026, 9, 10, 10, 0)),
            _atendimento("atendimento-2", clinica_id="clinica-2", veterinario_id="vet-2", data_hora=datetime(2026, 9, 15, 10, 0)),
            _atendimento(
                "atendimento-3",
                clinica_id="clinica-1",
                veterinario_id="vet-2",
                data_hora=datetime(2026, 9, 20, 10, 0),
                status=StatusAtendimento.CANCELADO,
            ),
        ]
    )


class TestListarAtendimentos:
    def test_lista_todos_para_admin(self) -> None:
        resultado = listar_atendimentos(_repo(), _usuario(Papel.ADMIN))

        assert {a.id for a in resultado} == {"atendimento-1", "atendimento-2", "atendimento-3"}

    def test_filtra_por_clinica(self) -> None:
        resultado = listar_atendimentos(_repo(), _usuario(Papel.ADMIN), clinica_id="clinica-1")

        assert {a.id for a in resultado} == {"atendimento-1", "atendimento-3"}

    def test_filtra_por_veterinario(self) -> None:
        resultado = listar_atendimentos(_repo(), _usuario(Papel.ADMIN), veterinario_id="vet-2")

        assert {a.id for a in resultado} == {"atendimento-2", "atendimento-3"}

    def test_filtra_por_status(self) -> None:
        resultado = listar_atendimentos(
            _repo(), _usuario(Papel.ADMIN), status=StatusAtendimento.CANCELADO
        )

        assert {a.id for a in resultado} == {"atendimento-3"}

    def test_filtra_por_periodo(self) -> None:
        resultado = listar_atendimentos(
            _repo(),
            _usuario(Papel.ADMIN),
            data_inicio=datetime(2026, 9, 12),
            data_fim=datetime(2026, 9, 18),
        )

        assert {a.id for a in resultado} == {"atendimento-2"}

    def test_usuario_clinica_so_ve_a_propria_clinica_mesmo_sem_filtro(self) -> None:
        resultado = listar_atendimentos(
            _repo(), _usuario(Papel.CLINICA, clinica_id="clinica-1")
        )

        assert {a.id for a in resultado} == {"atendimento-1", "atendimento-3"}

    def test_usuario_clinica_ignora_filtro_de_clinica_de_outra(self) -> None:
        resultado = listar_atendimentos(
            _repo(), _usuario(Papel.CLINICA, clinica_id="clinica-1"), clinica_id="clinica-2"
        )

        assert {a.id for a in resultado} == {"atendimento-1", "atendimento-3"}
