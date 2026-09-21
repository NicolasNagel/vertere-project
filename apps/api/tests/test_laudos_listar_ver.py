from datetime import UTC, datetime
from decimal import Decimal

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.auth.domain import Papel, Usuario
from vertere_api.laudos.domain import Laudo, StatusLaudo
from vertere_api.laudos.service import LaudoNaoEncontrado, listar_laudos, ver_laudo
import pytest


class _RepositorioFakeGenerico:
    def __init__(self, itens: list) -> None:
        self._por_id = {item.id: item for item in itens}

    def buscar_por_id(self, item_id: str):
        return self._por_id.get(item_id)

    def listar_todas(self) -> list:
        return list(self._por_id.values())


class LaudoRepositorioFake:
    def __init__(self, laudos: list[Laudo] | None = None) -> None:
        self._por_id = {laudo.id: laudo for laudo in (laudos or [])}

    def buscar_por_id(self, laudo_id: str) -> Laudo | None:
        return self._por_id.get(laudo_id)

    def listar_todas(self) -> list[Laudo]:
        return list(self._por_id.values())

    def salvar(self, laudo: Laudo) -> None:
        self._por_id[laudo.id] = laudo


def _atendimento(atendimento_id: str, clinica_id: str) -> Atendimento:
    return Atendimento(
        id=atendimento_id,
        clinica_id=clinica_id,
        veterinario_id="vet-1",
        paciente_id="paciente-1",
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal("45.00"), quantidade=1)],
        metodo_coleta="Venosa",
        data_hora=datetime(2026, 9, 20, 10, 0, tzinfo=UTC),
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal("45.00"),
        status=StatusAtendimento.ATIVO,
    )


def _laudo(
    laudo_id: str,
    atendimento_id: str,
    status: StatusLaudo = StatusLaudo.RASCUNHO,
    criado_em: datetime = datetime(2026, 9, 20, 11, 0, tzinfo=UTC),
) -> Laudo:
    return Laudo(
        id=laudo_id,
        atendimento_id=atendimento_id,
        exame_id="exame-1",
        template_id="tpl-1",
        valores=[],
        status=status,
        criado_por="usuario-1",
        criado_em=criado_em,
    )


def _usuario(papel: Papel, clinica_id: str | None = None) -> Usuario:
    return Usuario(
        id="usuario-1", email="u@vertere.com", senha_hash="hash", papel=papel, ativo=True, clinica_id=clinica_id
    )


class TestListarLaudos:
    def _cenario(self) -> tuple[LaudoRepositorioFake, _RepositorioFakeGenerico]:
        atendimentos = _RepositorioFakeGenerico(
            [_atendimento("atendimento-1", "clinica-1"), _atendimento("atendimento-2", "clinica-2")]
        )
        laudos = LaudoRepositorioFake(
            [
                _laudo("laudo-1", "atendimento-1", StatusLaudo.RASCUNHO, datetime(2026, 9, 1, tzinfo=UTC)),
                _laudo("laudo-2", "atendimento-1", StatusLaudo.FINALIZADO, datetime(2026, 9, 10, tzinfo=UTC)),
                _laudo("laudo-3", "atendimento-2", StatusLaudo.RASCUNHO, datetime(2026, 9, 15, tzinfo=UTC)),
            ]
        )
        return laudos, atendimentos

    def test_lista_todos_para_admin(self) -> None:
        laudos, atendimentos = self._cenario()

        resultado = listar_laudos(laudos, _usuario(Papel.ADMIN), atendimentos)

        assert {l.id for l in resultado} == {"laudo-1", "laudo-2", "laudo-3"}

    def test_filtra_por_atendimento(self) -> None:
        laudos, atendimentos = self._cenario()

        resultado = listar_laudos(laudos, _usuario(Papel.ADMIN), atendimentos, atendimento_id="atendimento-1")

        assert {l.id for l in resultado} == {"laudo-1", "laudo-2"}

    def test_filtra_por_status(self) -> None:
        laudos, atendimentos = self._cenario()

        resultado = listar_laudos(laudos, _usuario(Papel.ADMIN), atendimentos, status=StatusLaudo.FINALIZADO)

        assert {l.id for l in resultado} == {"laudo-2"}

    def test_filtra_por_periodo(self) -> None:
        laudos, atendimentos = self._cenario()

        resultado = listar_laudos(
            laudos,
            _usuario(Papel.ADMIN),
            atendimentos,
            data_inicio=datetime(2026, 9, 5, tzinfo=UTC),
            data_fim=datetime(2026, 9, 12, tzinfo=UTC),
        )

        assert {l.id for l in resultado} == {"laudo-2"}

    def test_filtra_automaticamente_por_clinica_do_usuario(self) -> None:
        laudos, atendimentos = self._cenario()

        resultado = listar_laudos(laudos, _usuario(Papel.CLINICA, clinica_id="clinica-2"), atendimentos)

        assert {l.id for l in resultado} == {"laudo-3"}


class TestVerLaudo:
    def test_admin_ve_qualquer_laudo(self) -> None:
        atendimentos = _RepositorioFakeGenerico([_atendimento("atendimento-1", "clinica-1")])
        laudos = LaudoRepositorioFake([_laudo("laudo-1", "atendimento-1")])

        laudo = ver_laudo("laudo-1", _usuario(Papel.ADMIN), laudos, atendimentos)

        assert laudo.id == "laudo-1"

    def test_clinica_ve_laudo_da_propria_clinica(self) -> None:
        atendimentos = _RepositorioFakeGenerico([_atendimento("atendimento-1", "clinica-1")])
        laudos = LaudoRepositorioFake([_laudo("laudo-1", "atendimento-1")])

        laudo = ver_laudo("laudo-1", _usuario(Papel.CLINICA, clinica_id="clinica-1"), laudos, atendimentos)

        assert laudo.id == "laudo-1"

    def test_clinica_nao_ve_laudo_de_outra_clinica(self) -> None:
        atendimentos = _RepositorioFakeGenerico([_atendimento("atendimento-1", "clinica-1")])
        laudos = LaudoRepositorioFake([_laudo("laudo-1", "atendimento-1")])

        with pytest.raises(LaudoNaoEncontrado):
            ver_laudo("laudo-1", _usuario(Papel.CLINICA, clinica_id="clinica-2"), laudos, atendimentos)
