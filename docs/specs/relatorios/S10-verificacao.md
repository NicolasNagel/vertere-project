# Verificação — S10

**Veredito**: ✅ APROVADA
**Data**: 2026-09-23
**Testes**: `uv run pytest` (em `apps/api`) — 456 passed, 0 failed, 2 warnings

## Tasks

A spec possui 14 tasks marcadas `[x]`; as 14 têm commits e artefatos correspondentes confirmáveis no código.

- T1 — contratos, códigos de inconsistência, contadores, plano e namespaces UUIDv5 em `importacao/domain.py` (`7db18e7`).
- T2/T3 — testes e implementação do planejamento de clínicas/veterinários em `test_importacao_planejar_cadastros.py` e `importacao/service.py` (`d5e983e`, `57aa5c7`), complementados pelos testes e pela correção da coleta de duplicidades após linhas inválidas (`96997f1`, `523ac0a`).
- T4/T5 — testes e planejamento/deduplicação de pacientes em `test_importacao_planejar_pacientes.py` e `importacao/service.py` (`1d0e9ad`, `6beaf3f`).
- T6/T7 — testes e planejamento de exames, atendimentos, financeiro histórico e proveniência em `test_importacao_planejar_atendimentos.py` e `importacao/service.py` (`39322fc`, `b1ec8dc`).
- T8 — campos de origem no domínio, ORM, schemas, repositório e migration Alembic (`2f48197`).
- T9/T10 — testes e adapter XLSX, com `openpyxl` nas dependências (`f856b6b`, `5a1ce1b`).
- T11/T12 — testes e aplicação SQLAlchemy transacional/idempotente em `test_importacao_repository.py` e `importacao/repository.py` (`3d16c6e`, `258e525`).
- T13/T14 — testes, CLI e runbook operacional em `test_importacao_cli.py`, `importacao/cli.py` e `docs/operacao/importacao-historica.md` (`d44d3f8`, `3b036ee`).

Não há task marcada sem evidência. A pendência da verificação anterior foi corrigida: CNPJ e CRMV válidos são registrados como observados antes de a linha ser descartada por outro erro, sem criar entidade planejada inválida.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Importar clínicas, veterinários e atendimentos | Atendida | `ler_planilha` em `importacao/xlsx.py`, `planejar_importacao` em `importacao/service.py` e `aplicar_plano` em `importacao/repository.py`; caminho integrado em `test_importacao_cli.py::test_aplicar_persiste_plano_valido`. |
| 2 | Deduplicar pacientes pela identidade normalizada | Atendida | Agrupamento pela chave clínica/nome/proprietário e escolha cronológica em `planejar_importacao`; cenários em `test_importacao_planejar_pacientes.py`. |
| 3 | Preservar valores financeiros históricos | Atendida | `AtendimentoPlanejado`, validação com `Decimal` e persistência de preço, desconto, adicional e total; cobertura em `test_importacao_planejar_atendimentos.py` e `test_importacao_repository.py`. |
| 4 | Validar toda a fonte antes de gravar, sem parcialidade | Atendida | O plano acumula erros e fica não aplicável; `aplicar_plano` recusa plano inválido e faz rollback integral. Os casos compostos de CNPJ/CRMV duplicado após uma primeira linha inválida estão cobertos em `test_importacao_planejar_cadastros.py`. |
| 5 | Relatório com totais e erros localizados | Atendida | `_salvar_relatorio` em `importacao/cli.py` emite contadores e inconsistências por aba/linha/coluna; o dry-run real confirmou o contrato sem dados pessoais. |
| 6 | Reexecutar sem duplicar | Atendida | UUIDv5 determinístico no planejamento e validação de conteúdo existente no adapter; cobertura por `test_aplica_plano_e_reexecuta_sem_duplicar`. |

## Seam de teste

A seam especificada, `planejar_importacao(dados_planilha) -> PlanoImportacao`, está no ponto correto e é exercitada com estruturas em memória. A cobertura inclui normalização e resolução de referências, deduplicação/canonicalização de pacientes, valores históricos, catálogo, IDs estáveis, coleta acumulada de inconsistências e, após a correção, duplicidade de CNPJ/CRMV quando a primeira ocorrência contém outro erro. Os adapters XLSX e SQLAlchemy e a CLI possuem testes próprios nos limites correspondentes.

## Out of Scope

Não foi encontrado scope creep. A entrega não cria endpoint ou tela de importação, não corrige/inventa dados da fonte, não importa laudos, usuários, fechamentos ou regras de plantão, não recalcula valores históricos e não armazena a planilha ou dados pessoais em fixtures/relatórios.

## ADRs

A implementação adere aos ADRs 0001 e 0002: backend Python, dependências geridas por `uv`, SQLAlchemy 2.x, Alembic e pytest. `openpyxl` foi incluído no `pyproject.toml` e no lockfile como adapter de leitura XLSX. Não há desvio arquitetural não documentado.

## Funcional de ponta a ponta

- A CLI foi executada novamente contra `PLANILHA DE CONTROLE 2026 - VERTERE LAB (4).xlsx`, em dry-run. Ela terminou com código 1, como esperado para uma fonte com erros bloqueantes, sem receber URL de banco nem executar aplicação, e gerou JSON válido.
- Resultado observado: 27 clínicas, 87 veterinários, 1 paciente, 284 exames e 2 atendimentos planejados; 4.608 inconsistências, sendo 4.573 erros e 35 avisos. O resultado coincide com a verificação anterior e confirma o planejamento determinístico.
- O caminho `--aplicar` foi exercitado na suíte por `test_aplicar_persiste_plano_valido`, usando CLI e banco SQLite reais, e confirmou persistência completa. Executar a importação na base de produção permanece corretamente fora do escopo.

## Pendências (se bloqueada)

Nenhuma.
