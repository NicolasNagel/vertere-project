# Verificação — S9

**Veredito**: ✅ APROVADA
**Data**: 2026-09-22
**Testes**: `uv run pytest` (em `apps/api`) — 438 passed, 0 failed, 2 warnings (204.29s)

## Tasks

A spec tem 14 tasks, todas marcadas `[x]`. As 14 são confirmáveis no histórico e no código; nenhuma foi marcada sem evidência.

| Task | Commit | Evidência no código |
|---|---|---|
| T1 | `c9bd7fe` | `HistoricoPaciente` em `pacientes/domain.py` |
| T2 | `fcaeadb` | `TestBuscarPaciente` em `tests/test_pacientes_service.py` |
| T3 | `0eab866` | `buscar_paciente` em `pacientes/service.py` |
| T4 | `5c7d6a7` | Casos de `ATENDIMENTO_VER` em `tests/test_auth_service.py` |
| T5 | `22117c1` | `Acao.ATENDIMENTO_VER` em `_ACOES_COM_ESCOPO_DE_CLINICA`, `auth/service.py` |
| T6 | `36aec85` | `TestBuscarAtendimento` em `tests/test_atendimentos_buscar.py` |
| T7 | `7c2bcf1` | `buscar_atendimento` em `atendimentos/service.py` |
| T8 | `67c85a2` | `TestBuscarHistoricoPaciente` em `tests/test_pacientes_historico.py` |
| T9 | `e59db72` | `buscar_historico_paciente` em `pacientes/service.py` |
| T10 | `31395b0` | `exigir_papel_clinica` em `auth/deps.py` e gate exercitado pelo router |
| T11 | `38d4a50` | Sete endpoints GET em `portal/router.py`, registrados em `main.py` |
| T12 | `a989a78` | Regressões de autorização, vínculo inconsistente e matriz de papéis nos testes de auth, histórico e portal |
| T13 | `1e48976` | `PORTAL_ACESSAR` usa `authorize()` e a agregação filtra cada atendimento com `ATENDIMENTO_VER` |
| T14 | `d587964` | Respostas usam `model_validate(..., from_attributes=True)` nos schemas proprietários e no portal, sem conversores duplicados |

O diff `main...HEAD` não contém migration nova. O worktree estava limpo antes da verificação.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Clínica acessa somente dados da própria clínica | Atendida | Listagens escopam por `usuario.clinica_id`; recursos únicos chamam `authorize()` com a clínica real; testes cobrem sucesso próprio e 404 cruzado |
| 2 | Ver detalhe de paciente específico | Atendida | `GET /portal/pacientes/{paciente_id}` chama `buscar_paciente`; testes de service e router cobrem 200, 404 cruzado e id inexistente |
| 3 | Ver detalhe de atendimento específico | Atendida | `GET /portal/atendimentos/{atendimento_id}` chama `buscar_atendimento`; testes cobrem acesso próprio, papéis internos na seam e 404 cruzado |
| 4 | Ver histórico completo do paciente | Atendida | `buscar_historico_paciente` agrega paciente, atendimentos autorizados e seus laudos; testes cobrem agregação, acesso cruzado, inexistente e vínculo inconsistente |
| 5 | Acessar/baixar laudos em JSON | Atendida | `GET /portal/laudos` e `GET /portal/laudos/{laudo_id}` reutilizam `listar_laudos`/`ver_laudo`; `TestPortalLaudos` cobre lista, detalhe e 404 entre clínicas |
| 6 | Papéis internos não acessam `/portal/*` | Atendida | `PORTAL_ACESSAR` existe apenas para `Papel.CLINICA`; dependency no router; testes cobrem admin/atendente/técnico com 403, clínica com 200 e anônimo com 401 |

## Seam de teste

A seam corresponde à decisão da spec: `buscar_paciente`, `buscar_atendimento` e `buscar_historico_paciente` são funções puras exercitadas com repositórios fake em memória. Para paciente e atendimento, há casos de clínica dona, clínica externa, admin, atendente e técnico. Para histórico, os mesmos papéis relevantes são cobertos, além da agregação de laudos e da resistência a atendimento que aponta para o paciente mas pertence a outra clínica.

Os testes HTTP validam conteúdo e ids nas sete rotas, 401 sem autenticação, 403 para cada papel interno e 404 para tentativa entre clínicas.

## Out of Scope

Nenhum vazamento de escopo encontrado:

- O portal só possui métodos `GET`; não edita dados.
- Laudos são retornados como JSON; não há geração de PDF/arquivo.
- Não há rota/agregação financeira e `Papel.CLINICA` continua sem `FINANCEIRO_VER`/`FECHAMENTO_GERENCIAR`.
- Não houve implementação de onboarding, notificação ou e-mail.
- Não foi adicionada migration Alembic.

## ADRs

A implementação segue ADR-0001/0002: backend Python, FastAPI, Pydantic, SQLAlchemy 2.x, `uv` e pytest. O portal reutiliza repositórios e schemas dos módulos proprietários. Nenhuma dependência ou ferramenta divergente foi introduzida.

## Funcional de ponta a ponta

Validado agora contra servidor real: `uv run uvicorn vertere_api.main:app --host 127.0.0.1 --port 8765`, usando banco SQLite temporário com tabelas e dados persistidos. O fluxo HTTP executado foi:

- `POST /auth/login` com usuário `clinica` → token emitido;
- `GET /portal/pacientes` com Bearer token → um paciente da clínica autenticada;
- `GET /portal/pacientes/{id}` → o mesmo paciente persistido;
- `GET /portal/pacientes/{id}/historico` → paciente correto e listas vazias coerentes para o cenário sem atendimentos/laudos.

O servidor foi encerrado e banco/logs temporários foram removidos. As rotas de atendimento e laudo, inclusive o isolamento entre clínicas, também foram exercitadas pela integração FastAPI + SQLAlchemy em `tests/test_portal_router.py`, dentro da suíte executada agora.

## Pendências (se bloqueada)

Não aplicável — spec aprovada.
