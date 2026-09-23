# Verificação — S10

**Veredito**: ❌ BLOQUEADA  
**Data**: 2026-09-23  
**Testes**: `uv run pytest` (em `apps/api`) — 454 passed, 0 failed, 2 warnings

## Tasks

A spec possui 14 tasks marcadas `[x]`, todas com commits dedicados e artefatos correspondentes no código. Doze são confirmáveis integralmente. T2 e T3 existem, mas não estão integralmente concluídas: a coleta acumulada de inconsistências deixa de detectar duplicidades quando a primeira ocorrência da chave também possui outro erro.

- T1 e T4–T14: evidência encontrada nos commits `7db18e7`, `1d0e9ad`, `6beaf3f`, `39322fc`, `b1ec8dc`, `2f48197`, `f856b6b`, `5a1ce1b`, `3d16c6e`, `258e525`, `d44d3f8` e `3b036ee` e nos respectivos arquivos de domínio, adapters, migration, testes, CLI e runbook.
- T2/T3: `apps/api/src/vertere_api/importacao/service.py:161-241` e `:244-335` implementam a validação, porém `cnpjs_vistos` e `crmvs_vistos` só recebem uma chave depois que toda a linha foi considerada válida. Assim, uma chave repetida cuja primeira linha tenha, por exemplo, status ou referência inválida não é reportada como duplicada nessa passagem. Isso contraria a coleta completa para correção da fonte em uma única rodada.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Importar clínicas, veterinários e atendimentos | Atendida | `ler_planilha` em `xlsx.py:59`, `planejar_importacao` em `service.py:156` e `aplicar_plano` em `repository.py:44`; teste integrado em `tests/test_importacao_cli.py::test_aplicar_persiste_plano_valido`. |
| 2 | Deduplicar pacientes pela identidade normalizada | Atendida | Agrupamento e escolha da ocorrência mais recente em `service.py`; testes em `test_importacao_planejar_pacientes.py`. |
| 3 | Preservar valores financeiros históricos | Atendida | `AtendimentoPlanejado`, validação Decimal e persistência de item/adicional/desconto/total; testes em `test_importacao_planejar_atendimentos.py` e `test_importacao_repository.py`. |
| 4 | Validar tudo antes de gravar, sem parcialidade | Parcialmente atendida | O plano bloqueia escrita e o adapter faz rollback, mas a validação de duplicidades de CNPJ/CRMV não acumula todos os erros quando a primeira ocorrência já é inválida. |
| 5 | Relatório com totais e erros localizados | Atendida | JSON produzido por `cli.py:40`; dry-run real gerou contadores e inconsistências com aba/linha/coluna/código sem dados pessoais. |
| 6 | Reexecutar sem duplicar | Atendida | UUIDv5 no planejamento e validação de conteúdo no adapter; `test_aplica_plano_e_reexecuta_sem_duplicar`. |

## Seam de teste

A seam especificada, `planejar_importacao(dados_planilha) -> PlanoImportacao`, está no ponto correto e é exercitada por estruturas em memória. Há cobertura dos caminhos principais de normalização, resolução, pacientes, financeiro, IDs, XLSX, aplicação transacional e CLI. Falta o caso composto essencial para a promessa de coleta completa: chave duplicada quando a primeira ocorrência tem outro erro. A ausência desse caso permitiu a falha de T2/T3.

## Out of Scope

Não foi encontrado scope creep: não há endpoint/tela de importação, correção automática, importação de laudos/usuários/fechamentos/regras, recálculo histórico ou cópia da planilha para banco/fixtures/relatórios.

## ADRs

A implementação adere aos ADRs 0001 e 0002: backend Python, dependências geridas por `uv`, SQLAlchemy 2.x, Alembic e pytest. `openpyxl` foi adicionado ao `pyproject.toml` e ao lockfile.

## Funcional de ponta a ponta

- A CLI foi executada de verdade contra `PLANILHA DE CONTROLE 2026 - VERTERE LAB (4).xlsx`, em dry-run. Terminou com código 1, como esperado para a fonte ainda inconsistente, sem escrever no banco, e produziu relatório JSON.
- Resultado observado: 27 clínicas, 87 veterinários, 1 paciente, 284 exames e 2 atendimentos planejados; 4.608 inconsistências (4.573 erros e 35 avisos). A maioria dos erros de idade decorre dos valores reais como `2a`, `7m` e `NI`, incompatíveis com a decisão explícita de aceitar somente inteiro não negativo; esse bloqueio é consistente com a spec.
- O caminho de aplicação foi exercitado pela suíte com XLSX real gerado em disco, CLI real e banco SQLite real (`test_aplicar_persiste_plano_valido`), confirmando uma gravação completa. A aplicação da planilha de produção está corretamente fora de escopo.

## Pendências (se bloqueada)

1. Corrigir a coleta de duplicidades em `service.py`: registrar CNPJs e CRMVs observados independentemente dos demais erros da linha, preservando a emissão de `CHAVE_DUPLICADA` sem transformar linha inválida em entidade planejada.
2. Adicionar testes de seam em que a primeira ocorrência de CNPJ/CRMV possui outro erro e uma ocorrência posterior repete a chave. O plano deve conter simultaneamente o erro original e a duplicidade, para permitir correção em uma única rodada.

