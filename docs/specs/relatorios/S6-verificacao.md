# Verificação — S6

**Veredito**: ✅ APROVADA
**Data**: 2026-09-20
**Testes**: `uv run pytest -q` (em `apps/api`) — 259 passed, 0 failed, 2 warnings (não relacionados: deprecations de `httpx`/`anyio`)

## Tasks

Todas as 12 tasks (T1–T12) estão marcadas `[x]` no arquivo da spec. Auditei cada uma contra código
e commits reais (branch `spec/s6-atendimentos`, 12 commits `feat(s6)`/`test(s6)`, um por task):

| Task | Evidência |
|---|---|
| T1 | `atendimentos/domain.py` (`Atendimento`, `ItemExame`, `ItemExameEntrada`, `StatusAtendimento`) + `AtendimentoRepository` (Protocol) em `service.py`; fakes em memória em todos os arquivos de teste. Commit `8ed2c16`. |
| T2/T3 | `test_atendimentos_calcular_valor_total.py` (6 casos: item único, múltiplos, quantidade>1, com/sem adicional, desconto válido, desconto excedente) + `calcular_valor_total` em `service.py:70-82`. Commits `41a0fb0`/`0f0b616`. |
| T4/T5 | `test_atendimentos_registrar.py` (13 testes) + `registrar_atendimento` em `service.py:143-191`. Commits `5ed39f8`/`ee57969`. |
| T6/T7 | `test_atendimentos_editar_cancelar.py` (6 testes) + `editar_atendimento`/`cancelar_atendimento` em `service.py:201-261`. Commits `e558294`/`94f10e2`. |
| T8/T9 | `test_atendimentos_listar.py` (8 testes) + `listar_atendimentos` em `service.py:264-297`. Commits `cceb715`/`7040150`. |
| T10 | `atendimentos/models.py` (`AtendimentoModel`, `AtendimentoItemExameModel`, `Numeric(10,2)`), migração `b4e3cf8d7186_create_atendimentos_and_atendimento_.py`, `repository.py` (`SQLAlchemyAtendimentoRepository`), testado em `test_atendimento_repository.py` (4 testes). Commit `3b13b38`. |
| T11 | `auth/service.py:15-16,37-38,53-54,63,71` — `ATENDIMENTO_GERENCIAR` (admin, atendente) e `ATENDIMENTO_VER` (admin, atendente, tecnico, clinica), exatamente como especificado. Commit `20cf0d2`. |
| T12 | `atendimentos/router.py` (4 endpoints: `POST /atendimentos`, `PATCH /atendimentos/{id}`, `POST /atendimentos/{id}/cancelar`, `GET /atendimentos`) + `schemas.py`, mapeamento de erros (404/409/422). Commit `7ad5371`. |

Nenhuma task marcada sem evidência correspondente no código.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Registrar atendimento (clínica, vet, paciente, exames, coleta, horário) | Atendida | `registrar_atendimento` (`service.py:143`), endpoint `POST /atendimentos` (`router.py:76`), T4/T5/T12 |
| 2 | Cálculo automático do valor total | Atendida | `calcular_valor_total` (`service.py:70`), testado isoladamente e via registro/edição, T2/T3 |
| 3 | Desconto manual | Atendida | parâmetro `desconto` em `registrar_atendimento`/`editar_atendimento`, validado por `DescontoInvalido`; testes `test_com_desconto_valido`, `test_registro_com_desconto`, `test_edita_desconto` |
| 4 | Listar/filtrar por período, clínica, veterinário, status | Atendida | `listar_atendimentos` (`service.py:264`), `GET /atendimentos` com `Query` params, 8 testes em `test_atendimentos_listar.py` cobrindo cada filtro isoladamente e combinado |
| 5 | Editar atendimento antes do fechamento (bloqueado só por cancelamento nesta spec) | Atendida | `editar_atendimento` (`service.py:201`), rejeita `status=cancelado` via `AtendimentoCancelado`; endpoint mapeia para 409; verificado também via requisição HTTP real nesta verificação |
| 6 | Sugestão automática de adicional de plantão, ajustável manualmente | Atendida | `_resolver_adicional_plantao` (`service.py:130`) reaproveita `calcular_adicional_plantao` de S5; testes `test_registro_com_sugestao_automatica_de_plantao` e `test_registro_com_ajuste_manual_do_adicional` cobrem ambos os caminhos |
| 7 | Cancelar atendimento (terminal, preserva histórico) | Atendida | `cancelar_atendimento` (`service.py:253`), sem operação de reabertura no código; endpoint `POST /atendimentos/{id}/cancelar`; testado em unitário, integração de router e na verificação E2E |

## Seam de teste

Segue exatamente o padrão descrito em "Testing Decisions" e o padrão de S5: funções de serviço
puras recebendo `AtendimentoRepository` (Protocol) + repositórios de S2/S3/S4/S5 como parâmetros,
testadas com fakes em memória, sem HTTP/DB (`test_atendimentos_calcular_valor_total.py`,
`test_atendimentos_registrar.py`, `test_atendimentos_editar_cancelar.py`,
`test_atendimentos_listar.py`). `calcular_valor_total` é testada isoladamente sem nenhum
repositório, cobrindo exatamente os cenários listados na spec (item único, múltiplos itens,
quantidade > 1, com/sem adicional, desconto válido, desconto excedente rejeitado).

Autorização testada via `test_atendimentos_router.py`, camada de integração leve confirmando
`ATENDIMENTO_GERENCIAR`/`ATENDIMENTO_VER` como pontos de decisão distintos
(`test_tecnico_nao_pode_gerenciar_mas_pode_ver`), e o filtro automático por clínica para papel
`clinica` (`test_usuario_clinica_so_ve_atendimentos_da_propria_clinica`). Persistência real
coberta em `test_atendimento_repository.py` (insert, update com substituição de itens, listagem).

Todos os cenários de prior art listados em "Testing Decisions" têm teste correspondente — nenhum
teste do tipo "só não quebrou".

## Out of Scope

Nenhum item da lista de Out of Scope foi implementado: não há endpoint de laudos, nenhum bloqueio
por fechamento financeiro, nenhum endpoint de faturamento agregado, nenhuma operação de reabertura
de atendimento cancelado, nenhuma constraint de unicidade nova, nenhum endpoint de busca/
autocomplete novo (confirmado por grep no módulo — a única menção a "fechamento" é comentário
explicando a decisão de não implementar o bloqueio, consistente com a spec).

## ADRs

Aderente a ADR-0001/0002: Python 3.13 + `uv`, FastAPI, SQLAlchemy 2.x (`Mapped`/`mapped_column`) +
Alembic, PostgreSQL, `pytest`, contratos Pydantic na fronteira do router, tipos monetários
`Decimal`/`Numeric(10,2)` consistente com S5. Nenhum desvio de stack identificado.

## Funcional de ponta a ponta

Validado agora, não apenas por inferência dos testes:
1. Subi a API real (`uv run uvicorn vertere_api.main:app --port 8123`) contra o PostgreSQL real de
   desenvolvimento (`localhost:5434`, mesmo `DATABASE_URL` usado pelos testes de integração).
2. Criei um usuário admin diretamente no banco, fiz login via `POST /auth/login` e obtive um JWT
   real.
3. Via HTTP real (curl com o token): criei clínica, veterinário, paciente e exame; registrei um
   atendimento com 2 itens e desconto (`POST /atendimentos` → 201, `valor_total` calculado
   corretamente: `45.00*2 - 5.00 = 85.00`); listei (`GET /atendimentos` → retornou o registro);
   editei reduzindo a quantidade (`PATCH` → `valor_total` recalculado para `45.00`); cancelei
   (`POST /atendimentos/{id}/cancelar` → `status: cancelado`); tentei editar o atendimento
   cancelado e recebi `409` como esperado.
4. Limpei os dados de teste criados manualmente e derrubei o servidor. Reexecutei a suíte completa
   depois da limpeza: 259 passed, confirmando que o ambiente ficou no mesmo estado de antes da
   verificação.

Esse ciclo cobre exatamente o caminho principal das User Stories 1, 2, 3, 5, 7 via requisição HTTP
real contra a API rodando (não apenas a função de serviço isolada).

## Pendências (se bloqueada)

Não aplicável — spec aprovada sem pendências.
