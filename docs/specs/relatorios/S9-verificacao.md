# Verificação — S9

**Veredito**: ✅ APROVADA
**Data**: 2026-09-22
**Testes**: `uv run pytest -q` (apps/api) — 427 passed, 0 failed (164.39s)

## Tasks

A spec tem 11 tasks, todas marcadas `[x]`. Todas têm commit correspondente em `git log` (branch
`spec/s9-portal-clinica`, um commit por task, mensagens `feat(s9)/test(s9)/spec(s9): T<N> — ...`)
e código real confirmado por leitura direta:

| Task | Commit | Evidência no código |
|---|---|---|
| T1 | `c9bd7fe` | `HistoricoPaciente` (dataclass frozen) em `pacientes/domain.py:20-30` |
| T2 | `fcaeadb` | `TestBuscarPaciente` em `tests/test_pacientes_service.py:378-413` |
| T3 | `0eab866` | `buscar_paciente` em `pacientes/service.py:172-193` |
| T4 | `5c7d6a7` | `test_clinica_pode_ver_atendimento_da_propria_clinica`/`..._nao_pode_...` em `tests/test_auth_service.py:130-153` |
| T5 | `22117c1` | `Acao.ATENDIMENTO_VER` em `_ACOES_COM_ESCOPO_DE_CLINICA` — `auth/service.py:36` |
| T6 | `36aec85` | `TestBuscarAtendimento` em `tests/test_atendimentos_buscar.py` |
| T7 | `7c2bcf1` | `buscar_atendimento` em `atendimentos/service.py:305-327` |
| T8 | `67c85a2` | `TestBuscarHistoricoPaciente` em `tests/test_pacientes_historico.py` |
| T9 | `e59db72` | `buscar_historico_paciente` em `pacientes/service.py:196-216` |
| T10 | `31395b0` | `exigir_papel_clinica` em `auth/deps.py:94-98`; gate coberto por `TestGatePapelClinica` em `tests/test_portal_router.py:188-225` (não há teste unitário isolado da dependency, exatamente como a task descreve como aceitável, mirror de `exigir_admin`) |
| T11 | `38d4a50` | `portal/router.py` (7 endpoints GET) registrado em `main.py:12,26` |

Nenhuma task marcada sem evidência. Checklist confiável.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Clínica só vê dados da própria clínica (atend./laudos/pacientes) | Atendida | `listar_pacientes`/`listar_atendimentos`/`listar_laudos` filtram por `usuario.clinica_id`; `authorize()` com escopo em `buscar_paciente`/`buscar_atendimento`; testes E2E `TestPortalPacientes`, `TestPortalAtendimentos`, `TestPortalLaudos` em `test_portal_router.py` |
| 2 | Detalhe de paciente específico | Atendida | `GET /portal/pacientes/{id}` → `buscar_paciente`, testado em `test_portal_router.py:238-263` e `test_pacientes_service.py:378-413` |
| 3 | Detalhe de atendimento específico | Atendida | `GET /portal/atendimentos/{id}` → `buscar_atendimento`, testado em `test_portal_router.py:306-325` e `test_atendimentos_buscar.py` |
| 4 | Histórico completo (atendimentos+laudos) de um paciente | Atendida | `GET /portal/pacientes/{id}/historico` → `buscar_historico_paciente`, testado em `test_portal_router.py:266-293` e `test_pacientes_historico.py` |
| 5 | Acessar/baixar laudos via portal (JSON) | Atendida | `GET /portal/laudos` e `GET /portal/laudos/{id}` reaproveitam `listar_laudos`/`ver_laudo` (S7), testados em `TestPortalLaudos` |
| 6 | Outros papéis não veem `/portal/*` | Atendida | `exigir_papel_clinica` + `router = APIRouter(..., dependencies=[Depends(exigir_papel_clinica)])`; `TestGatePapelClinica` cobre admin/atendente/técnico → 403, sem auth → 401 |

Todas as 6 user stories atendidas com evidência direta de código e teste.

## Seam de teste

Segue exatamente o padrão descrito em Testing Decisions: funções de service puras
(`buscar_paciente`, `buscar_atendimento`, `buscar_historico_paciente`) testadas com repositórios
fake em memória, sem HTTP/DB (`test_pacientes_service.py`, `test_atendimentos_buscar.py`,
`test_pacientes_historico.py`). Os três cenários pedidos pela spec estão cobertos em cada seam:
clínica vendo recurso próprio (sucesso), clínica vendo recurso de outra clínica
(`PacienteNaoEncontrado`/`AtendimentoNaoEncontrado`, nunca 403 disfarçado de exceção diferente) e
admin vendo qualquer recurso (sem escopo). O gate de papel (`exigir_papel_clinica`) é testado só
via router (`TestGatePapelClinica`), como a própria task T10 já previa e o padrão de `exigir_admin`
no repo confirma — não é uma lacuna. Testes de router não são apenas "não quebrou": cobrem
autorização negativa (403/404) e positiva (200) para cada um dos 7 endpoints.

## Out of Scope

Nenhuma violação encontrada:
- Nenhuma geração de PDF/arquivo — `/portal/laudos/{id}` retorna o mesmo JSON estruturado de
  `ver_laudo`.
- Nenhum dado financeiro exposto — `router.py` não importa nada de `financeiro`/`fechamento`, e
  `_PERMISSOES[Papel.CLINICA]` não foi tocado nesta spec (não verificado dado financeiro
  aparecendo em nenhuma resposta do portal).
- Nenhum endpoint de escrita: os 7 endpoints de `portal/router.py` são todos `@router.get`.
- Nenhuma mudança em autenticação/onboarding além do gate de papel já previsto.
- Nenhum código de e-mail/notificação novo no portal.

## ADRs

Stack usada é a já estabelecida em ADR-0001/0002 (FastAPI, SQLAlchemy 2.x via `models.py`
existentes, Pydantic em `portal/schemas.py`, pytest). Nenhuma dependência nova introduzida. Sem
desvio de ADR.

`git diff --name-status main...HEAD` confirma que não há migration Alembic nova (`Further Notes`
da spec avisava que isso seria sinal de escopo vazando) — apenas arquivos Python de módulo/teste e
os dois arquivos de doc da spec.

## Funcional de ponta a ponta

Validado agora, não só por suíte: subi a API real (`uv run uvicorn vertere_api.main:app`) contra o
Postgres de desenvolvimento configurado em `settings.py`, e exercitei o fluxo HTTP completo com um
script contra o servidor rodando (não chamando funções isoladas):
- Criei via `/clinicas`, `/veterinarios`, `/pacientes`, `/exames`, `/atendimentos`,
  `/templates-laudo`, `/laudos` (endpoints internos) um cenário real de uma clínica com atendimento
  e laudo.
- Usuário `admin` batendo em `GET /portal/pacientes` → `403` (gate de papel funciona de ponta a
  ponta).
- Requisição sem token → `401`.
- Usuário `clinica` da clínica dona do cenário: `GET /portal/pacientes` → `200` (lista o paciente
  certo); `GET /portal/pacientes/{id}` → `200`; `GET /portal/pacientes/{id}/historico` → `200` com
  o atendimento e o laudo certos agregados; `GET /portal/atendimentos` e
  `GET /portal/atendimentos/{id}` → `200`; `GET /portal/laudos` e `GET /portal/laudos/{id}` → `200`.
- Usuário `clinica` de uma **segunda** clínica batendo nos recursos da primeira: `404` em
  paciente, atendimento e laudo — confirma o padrão "não revela existência" ponta a ponta, não só
  na seam pura.

Servidor de teste foi encerrado ao final da verificação.

**Limitação declarada**: os dados criados pelo script E2E (clínicas/pacientes/atendimentos/laudos/
usuários com prefixo/sufixo `e2e-*`/"E2E") ficaram no banco de desenvolvimento — a tentativa de
limpeza automática (`DELETE` via script) foi bloqueada pelo classificador de permissões do
ambiente de execução deste verificador ("Cloud Storage Mass Delete"). Recomendação: quem retomar a
branch deve rodar uma limpeza manual desses registros no Postgres de dev antes de considerar o
ambiente limpo para outro teste manual. Isso não é um problema de código da spec — é resíduo da
própria verificação.

## Pendências (se bloqueada)

Não aplicável — spec aprovada. Único ponto de atenção não bloqueante: dados de teste E2E residuais
no Postgres de desenvolvimento (ver "Funcional de ponta a ponta" acima), a serem limpos
manualmente.
