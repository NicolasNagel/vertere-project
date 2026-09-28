# Importação de dados históricos

A importação é executada em duas etapas. O modo padrão apenas lê, valida e gera um
relatório JSON sem dados pessoais. Nenhuma escrita no banco ocorre nessa etapa.

## Pré-requisitos

- faça backup do banco de destino;
- aplique as migrações com `uv run alembic upgrade head` em `apps/api`;
- use uma cópia preservada da planilha original;
- execute primeiro o dry-run e corrija na origem todos os erros bloqueantes.

## Validar

Em `apps/api`, execute:

```powershell
uv run python -m vertere_api.importacao.cli CAMINHO_DA_PLANILHA.xlsx `
  --relatorio CAMINHO_DO_RELATORIO.json
```

O processo retorna código `0` quando o plano é aplicável e `1` quando há
inconsistências bloqueantes. O relatório contém somente contagens, localização e
tipo dos problemas; não contém nomes de pacientes ou proprietários.

## Aplicar

Após revisar um relatório aplicável, use a mesma planilha e informe explicitamente
o banco de destino:

```powershell
uv run python -m vertere_api.importacao.cli CAMINHO_DA_PLANILHA.xlsx `
  --relatorio CAMINHO_DO_RELATORIO_APLICADO.json `
  --aplicar `
  --banco $env:DATABASE_URL
```

A aplicação ocorre em uma transação única. Uma falha reverte toda a operação. Os
identificadores determinísticos permitem repetir exatamente a mesma importação;
uma colisão com conteúdo diferente interrompe a execução para revisão manual.
