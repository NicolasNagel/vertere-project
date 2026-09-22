# Verificação — S8

**Veredito**: ✅ APROVADA
**Data**: 2026-09-21
**Testes**: `uv run pytest -q` (apps/api) — 390 passed, 0 failed, 2 warnings (deprecation, não relacionados a S8)

## Tasks

18 tasks no checklist, todas marcadas `[x]`. Todas confirmáveis no código e no histórico de commits
(um commit por task, `feat|test(s8): T<N> — ...`, `git log` bate 1:1 com a lista):

- T1 (domínio) → `financeiro/domain.py` (`Fechamento`, `StatusFechamento`), `clinicas/domain.py`
  (`prazo_pagamento_dias`), `Protocol FechamentoRepository` em `financeiro/service.py`. Confirmado.
- T2/T3 (`definir_prazo_pagamento`) → `clinicas/service.py:96-103`, testes em
  `test_clinicas_service.py::TestDefinirPrazoPagamento` (customizado, volta a `None`, clínica
  inexistente, não altera outros campos). Confirmado.
- T4/T5 (`calcular_faturamento_por_clinica`/`calcular_resumo_financeiro`) →
  `financeiro/service.py:56-72`, testes em `test_financeiro_faturamento.py`. Confirmado.
- T6/T7 (`calcular_vencimento`/`status_exibicao`) → `financeiro/service.py:75-97`, testes em
  `test_financeiro_vencimento.py`. Confirmado.
- T8/T9 (`gerar_fechamento`) → `financeiro/service.py:100-136`, testes em
  `test_financeiro_gerar_fechamento.py`. Confirmado.
- T10/T11 (`confirmar_pagamento`) → `financeiro/service.py:139-157`, testes em
  `test_financeiro_confirmar_pagamento.py`. Confirmado.
- T12/T13 (`exportar_fechamento_csv`) → `financeiro/service.py:160-171`, testes em
  `test_financeiro_exportar_csv.py`. Confirmado.
- T14/T15 (bloqueio por período fechado) → `Protocol PeriodoFechadoChecker` +
  parâmetro `periodo_fechado` em `editar_atendimento`/`cancelar_atendimento`
  (`atendimentos/service.py:30-31,235,246-249,279,292-295`), testes em
  `test_atendimentos_editar_cancelar.py::TestBloqueioPorPeriodoFechado` com fake local, sem importar
  `financeiro` — seam correta, exatamente como descrito na spec. Confirmado.
- T16 (persistência) → migração `5e4f2bb2b0e6_create_fechamentos_table_and_clinicas_.py` (tabela
  `fechamentos` com `Numeric(10,2)`, `UniqueConstraint(clinica_id, ano, mes)`, coluna
  `prazo_pagamento_dias` em `clinicas`) + `financeiro/repository.py`
  (`SQLAlchemyFechamentoRepository`). Confirmado.
- T17 (ação `FECHAMENTO_GERENCIAR`) → `auth/service.py:15,41` — presente só em `Papel.ADMIN`.
  Confirmado.
- T18 (endpoints HTTP) → `financeiro/router.py` (gerar fechamento, confirmar pagamento,
  faturamento por clínica, resumo, CSV), `clinicas/router.py:119-132` (prazo-pagamento),
  `financeiro/adapters.py` (`FechamentoPeriodoFechadoChecker`) conectado em
  `atendimentos/router.py:137,161`. Confirmado, incluindo o wiring de DI no nível de composição
  (router), não dentro de `atendimentos/service.py`, como a spec exige.

Nenhuma task marcada sem evidência.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Ver faturamento acumulado por clínica/período | Atendida | `calcular_faturamento_por_clinica` (`financeiro/service.py:56`) + `GET /financeiro/clinicas/{id}/faturamento` (`financeiro/router.py:97-110`), testado em `test_financeiro_router.py::TestVisualizacaoFinanceira::test_admin_ve_faturamento_por_clinica` |
| 2 | Gerar fechamento mensal (soma com descontos/adicionais) | Atendida | `gerar_fechamento` (`financeiro/service.py:100`) reaproveita `Atendimento.valor_total` já calculado em S6; `POST /financeiro/clinicas/{id}/fechamentos`, testado em `test_financeiro_router.py::TestGerarFechamentoEndpoint::test_admin_gera_fechamento` |
| 3 | Bloqueio de edição de atendimentos do período fechado | Atendida | `PeriodoFechadoChecker` + `PeriodoFechado` (`atendimentos/service.py`), `FechamentoPeriodoFechadoChecker` (`financeiro/adapters.py`), testado ponta a ponta em `test_financeiro_router.py::test_fechar_periodo_bloqueia_edicao_de_atendimento` e `..._bloqueia_cancelamento_de_atendimento` |
| 4 | Exportar fechamento (CSV) | Atendida | `exportar_fechamento_csv` (`financeiro/service.py:160`), `GET /financeiro/fechamentos/{id}/csv`, testado em `test_financeiro_exportar_csv.py` e `test_financeiro_router.py::test_admin_exporta_fechamento_csv` |
| 5 | Resumo financeiro geral (todas clínicas, período) | Atendida | `calcular_resumo_financeiro` (`financeiro/service.py:64`), `GET /financeiro/resumo`, testado em `test_financeiro_router.py::test_admin_ve_resumo_financeiro` |
| 6 | Confirmar pagamento (dar baixa) | Atendida | `confirmar_pagamento` (`financeiro/service.py:139`), `POST /financeiro/fechamentos/{id}/confirmar-pagamento`, testado em `test_financeiro_confirmar_pagamento.py` e `test_financeiro_router.py::TestConfirmarPagamentoEndpoint` |
| 7 | Status "Inadimplente" calculado sob demanda | Atendida | `status_exibicao` (`financeiro/service.py:91`, nunca grava o status), testado em `test_financeiro_vencimento.py::TestStatusExibicao` |
| 8 | Prazo de pagamento customizável por clínica | Atendida | `prazo_pagamento_dias` (`clinicas/domain.py`), `definir_prazo_pagamento` (`clinicas/service.py:96`), `calcular_vencimento` (`financeiro/service.py:75`), `POST /clinicas/{id}/prazo-pagamento`, testado em `test_clinicas_service.py::TestDefinirPrazoPagamento` e `test_financeiro_vencimento.py::test_prazo_customizado_conta_dias_a_partir_do_fechamento` |

Todas as 8 user stories atendidas com evidência direta de código + teste.

## Seam de teste

Segue exatamente o padrão descrito em "Testing Decisions":
- Funções puras de `financeiro/service.py` (`calcular_faturamento_por_clinica`,
  `calcular_resumo_financeiro`, `calcular_vencimento`, `status_exibicao`, `exportar_fechamento_csv`)
  testadas isoladamente, sem repositório/HTTP/DB — cenários da spec cobertos: mês sem atendimentos,
  atendimento cancelado excluído, múltiplas clínicas, regra padrão dia 10, prazo customizado,
  pago sempre `PAGO`, pendente antes/depois do vencimento.
- `gerar_fechamento`/`confirmar_pagamento` testadas com fakes de repositório (`Protocol`), cobrindo
  clínica inexistente/inativa, período já fechado, fechamento sem atendimentos (valor 0), pagamento
  já confirmado.
- Bloqueio de edição testado em `test_atendimentos_editar_cancelar.py` com fake `PeriodoFechadoChecker`
  local — sem depender do módulo `financeiro` real, provando que o `Protocol` é a seam certa,
  exatamente como a spec pede.
- Autorização testada via `authorize()` real em `test_financeiro_router.py`, cobrindo admin
  autorizado e atendente bloqueado em `FECHAMENTO_GERENCIAR` e `FINANCEIRO_VER`.

Não é teste que só "não quebrou": cada cenário de prior art listado na spec está coberto por um
teste nomeado especificamente para ele.

## Out of Scope

Verificado sem scope creep: nenhuma menção a estorno/reabertura de fechamento, pagamento parcial,
notificação automática, nota fiscal/boleto/PIX ou edição em massa de `prazo_pagamento_dias` no
código (`grep` confirma a única ocorrência de "estorno" é um comentário explicando a ausência
proposital). `confirmar_pagamento` é binário, sem parâmetro de valor parcial. Fechamento é sempre
mensal (`ano`+`mes`, sem range de datas).

## ADRs

Aderente a ADR-0001/0002: FastAPI, SQLAlchemy 2.x (`Session`, `Numeric`) + Alembic (migração nova
gerada corretamente, com `down_revision` encadeada), PostgreSQL, `pytest`, contratos Pydantic em
`financeiro/schemas.py` e `clinicas/schemas.py`. `Decimal`/`Numeric` para valor monetário, mesma
convenção de S5/S6. Nenhum desvio de stack encontrado.

## Funcional de ponta a ponta

Validado agora via suíte de integração real: `test_financeiro_router.py` sobe a aplicação FastAPI
completa (`TestClient(app)`) contra o Postgres real configurado em `.env`
(`postgresql+psycopg://vertere:vertere@localhost:5434/vertere`), exercitando o fluxo completo:
login → criar clínica/veterinário/paciente/exame → registrar atendimento → gerar fechamento →
confirmar pagamento → exportar CSV → tentar editar/cancelar atendimento de período fechado
(bloqueado com 409) → checagem de autorização (403 para atendente). Todos os 19 testes desse
arquivo passaram na execução da suíte completa (390 passed). Não subi um segundo processo manual
adicional (uvicorn + curl) além da suíte, pois o `TestClient` já exercita a pilha ASGI completa
contra banco real, não apenas a função de serviço isolada — considero isso suficiente para
"funcional", mas registro que não foi feita uma chamada HTTP externa via processo servidor separado
como limitação adicional da verificação.

## Pendências (se bloqueada)

Nenhuma. Spec aprovada.
