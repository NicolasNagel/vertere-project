import argparse
import json
from dataclasses import asdict
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from vertere_api.importacao.domain import (
    CodigoInconsistencia,
    InconsistenciaImportacao,
    PlanoImportacao,
    SeveridadeInconsistencia,
)
from vertere_api.importacao.repository import ColisaoDestino, aplicar_plano
from vertere_api.importacao.service import planejar_importacao
from vertere_api.importacao.xlsx import EstruturaPlanilhaInvalida, ler_planilha


def _argumentos(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Valida e importa dados históricos do laboratório.",
    )
    parser.add_argument("planilha", type=Path)
    parser.add_argument("--relatorio", type=Path, required=True)
    parser.add_argument("--aplicar", action="store_true")
    parser.add_argument("--banco", help="URL SQLAlchemy do banco de destino")
    argumentos = parser.parse_args(argv)
    if argumentos.aplicar and not argumentos.banco:
        parser.error("--banco é obrigatório quando --aplicar for informado")
    return argumentos


def _inconsistencia(item: InconsistenciaImportacao) -> dict[str, object]:
    return {
        "severidade": item.severidade.value,
        "codigo": item.codigo.value,
        "aba": item.aba,
        "linha": item.linha,
        "coluna": item.coluna,
        "mensagem": item.mensagem,
    }


def _salvar_relatorio(
    caminho: Path,
    *,
    modo: str,
    aplicavel: bool,
    plano: PlanoImportacao | None = None,
    inconsistencias: tuple[InconsistenciaImportacao, ...] = (),
) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    itens = (*plano.inconsistencias, *inconsistencias) if plano else inconsistencias
    conteudo = {
        "modo": modo,
        "aplicavel": aplicavel,
        "contadores": asdict(plano.contadores) if plano else {},
        "totais_inconsistencias": {
            "erros": sum(item.severidade is SeveridadeInconsistencia.ERRO for item in itens),
            "avisos": sum(item.severidade is SeveridadeInconsistencia.AVISO for item in itens),
        },
        "inconsistencias": [_inconsistencia(item) for item in itens],
    }
    serializado = json.dumps(conteudo, ensure_ascii=False, indent=2) + "\n"
    caminho.write_text(serializado, encoding="utf-8")
    print(serializado, end="")


def executar(argv: list[str] | None = None) -> int:
    argumentos = _argumentos(argv)
    try:
        dados = ler_planilha(argumentos.planilha)
    except EstruturaPlanilhaInvalida as erro:
        _salvar_relatorio(
            argumentos.relatorio,
            modo="dry-run",
            aplicavel=False,
            inconsistencias=erro.inconsistencias,
        )
        return 1

    plano = planejar_importacao(dados)
    if not plano.aplicavel:
        _salvar_relatorio(
            argumentos.relatorio,
            modo="dry-run",
            aplicavel=False,
            plano=plano,
        )
        return 1

    modo = "dry-run"
    if argumentos.aplicar:
        motor = create_engine(argumentos.banco)
        try:
            with Session(motor) as sessao:
                aplicar_plano(plano, sessao)
        except ColisaoDestino as erro:
            colisao = InconsistenciaImportacao(
                severidade=SeveridadeInconsistencia.ERRO,
                codigo=CodigoInconsistencia.COLISAO_DESTINO,
                aba="Banco de destino",
                linha=None,
                coluna=erro.entidade,
                mensagem="Registro existente possui conteúdo incompatível",
            )
            _salvar_relatorio(
                argumentos.relatorio,
                modo="falhou",
                aplicavel=False,
                plano=plano,
                inconsistencias=(colisao,),
            )
            return 1
        finally:
            motor.dispose()
        modo = "aplicado"

    _salvar_relatorio(
        argumentos.relatorio,
        modo=modo,
        aplicavel=True,
        plano=plano,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(executar())
