# Verificação — S10

**Veredito**: ❌ BLOQUEADA
**Data**: 2026-09-23
**Testes**: `uv run pytest` (em `apps/api`) — 461 passed, 0 failed, 2 warnings

## Tasks

A spec possui 14 tasks marcadas `[x]`. Há commits e artefatos correspondentes para todas, mas somente 12 são confirmáveis como concluídas funcionalmente nesta verificação.

- T1–T9 e T11–T13 possuem código e cobertura correspondente nos commits `7db18e7` a `d44d3f8`, incluindo contratos, seam pura, pacientes, exames, atendimentos, proveniência, testes XLSX, adapter transacional e CLI.
- T10 não está concluída na realidade: `ler_planilha` não consegue ler integralmente a planilha histórica que esta spec deve importar. Na linha 545 da aba `Dados`, `openpyxl` retorna a coluna `Hora` como `datetime.timedelta`; `ValorCelula` não admite esse tipo e Pydantic interrompe a leitura com `ValidationError`.
- T14 não está concluída funcionalmente: embora a CLI e o runbook existam, o comando documentado aborta contra a planilha real antes do planejamento e não produz o relatório JSON prometido.

Portanto, T10 e T14 estão marcadas `[x]` sem que a entrega descrita por elas funcione sobre a fonte-alvo.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Importar clínicas, veterinários e atendimentos | Parcialmente atendida | O fluxo existe em `importacao/xlsx.py`, `service.py` e `repository.py`, mas `ler_planilha` aborta na linha 545 da planilha real antes de produzir um plano. |
| 2 | Deduplicar pacientes pela identidade normalizada | Atendida | `planejar_importacao` agrupa pela chave normalizada clínica/nome/proprietário e escolhe a ocorrência canônica; cenários em `test_importacao_planejar_pacientes.py` (T4/T5). |
| 3 | Preservar valores financeiros históricos | Atendida | `AtendimentoPlanejado`, validação com `Decimal` e persistência de preço, desconto, adicional e total; cobertura em `test_importacao_planejar_atendimentos.py` e `test_importacao_repository.py` (T6/T7/T11/T12). |
| 4 | Validar toda a fonte antes de gravar, sem parcialidade | Parcialmente atendida | A seam acumula inconsistências e o adapter aplica em transação única, mas a fonte real causa uma exceção de tipo não convertida em inconsistência/relatório. |
| 5 | Relatório com totais e erros localizados | Parcialmente atendida | `_salvar_relatorio` cobre planos e erros estruturais previstos, mas a falha de leitura da planilha real termina em traceback e nenhum JSON é criado. |
| 6 | Reexecutar sem duplicar | Parcialmente atendida | UUIDv5 e upsert idempotente são cobertos no adapter, inclusive colisões por chave natural, porém o arquivo-alvo não chega à fase de aplicação. |

## Seam de teste

A seam central `planejar_importacao(dados_planilha) -> PlanoImportacao` está corretamente isolada e cobre normalização, referências, deduplicação, valores históricos, IDs e coleta de inconsistências. Os adapters e a CLI também têm testes próprios.

Existe, contudo, uma lacuna decisiva no teste XLSX: o fixture grava `Hora` como texto (`"10:30"`). A fonte real possui 3.279 valores `datetime.time`, 6 textos e 1 `datetime.timedelta` nessa coluna; o caso `timedelta`, na linha 545, não é coberto. Assim, a seam do adapter não representa integralmente os tipos produzidos pela fonte-alvo.

## Out of Scope

Não foi encontrado scope creep. A entrega não cria endpoint ou tela, não corrige nem inventa dados, não importa os outros módulos excluídos, não recalcula valores históricos e não copia dados pessoais para fixtures ou relatórios.

## ADRs

A implementação adere aos ADRs 0001 e 0002: backend Python, dependências por `uv`, SQLAlchemy 2.x, Alembic e pytest. `openpyxl` está declarado no `pyproject.toml` e no lockfile. Não foi encontrado desvio arquitetural silencioso.

## Funcional de ponta a ponta

Foi executado o comando documentado em `apps/api` contra `PLANILHA DE CONTROLE 2026 - VERTERE LAB (4).xlsx`, em dry-run e sem URL de banco. O processo terminou com código 1 por uma exceção não tratada, não pelo resultado esperado de validação:

```text
pydantic_core._pydantic_core.ValidationError: 7 validation errors for LinhaAtendimentoPlanilha
hora.str / hora.int / hora.float / hora.decimal / hora.date / hora.datetime / hora.time
Input should be a valid ... input_value=datetime.timedelta(seconds=61860)
```

O arquivo de relatório solicitado não foi criado. O caminho `--aplicar` passa nos testes com SQLite e fixture sintético, mas não é alcançável com a fonte real enquanto o erro de leitura existir. Executar em produção permanece corretamente fora do escopo.

## Pendências (se bloqueada)

1. Em `apps/api/src/vertere_api/importacao/xlsx.py`/`domain.py`, aceitar e normalizar de forma determinística o `datetime.timedelta` retornado pelo `openpyxl` para a coluna `Hora`, ou convertê-lo em inconsistência localizada sem abortar a leitura inteira.
2. Em `apps/api/tests/test_importacao_xlsx.py`, adicionar um fixture com célula de hora formatada como `[h]:mm:ss` que seja relida como `timedelta`, cobrindo o comportamento esperado.
3. Reexecutar a CLI contra a planilha real e confirmar que ela conclui o dry-run, gera JSON válido com totais/inconsistências e não escreve no banco.
