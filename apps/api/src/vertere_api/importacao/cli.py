import argparse
import json
from dataclasses import asdict
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from vertere_api.importacao.domain import InconsistenciaImportacao, PlanoImportacao
from vertere_api.importacao.repository import aplicar_plano
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
    conteudo = {
        "modo": modo,
        "aplicavel": aplicavel,
        "contadores": asdict(plano.contadores) if plano else {},
        "inconsistencias": [
            _inconsistencia(item)
            for item in (plano.inconsistencias if plano else inconsistencias)
        ],
    }
    caminho.write_text(
        json.dumps(conteudo, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


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
        engine = create_engine(argumentos.banco)
        try:
            with Session(engine) as session:
                aplicar_plano(plano, session)
        finally:
            engine.dispose()
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
