# Verificação — S4

**Veredito**: ✅ APROVADA
**Data**: 2026-09-20
**Testes**: `uv run pytest -q` (apps/api) — 154 passed, 0 failed

## Tasks

Todas as 6 tasks do checklist (`docs/specs/S4-pacientes.md`) estão marcadas `[x]` e todas têm
evidência real de código e commit correspondente:

| Task | Commit | Evidência |
|---|---|---|
| T1 — Domínio `Paciente` + `PacienteRepository` | `00096d9` | `pacientes/domain.py` (dataclass frozen com os 9 campos exatos de US12), `pacientes/service.py::PacienteRepository` (Protocol) |
| T2 — Testes da seam | `67e16b4` | `tests/test_pacientes_service.py` (24 casos: criação, clínica inexistente, edição, inativação/reativação, busca, listagem) |
| T3 — `pacientes/service.py` | `4720a26` | `cadastrar_paciente`, `editar_paciente`, `inativar_paciente`, `reativar_paciente`, `buscar_pacientes`, `listar_pacientes` implementados e testes de T2 passando |
| T4 — Persistência real | `88fedb5` | `pacientes/models.py` (`PacienteModel`, FK `clinica_id → clinicas.id`), `pacientes/repository.py::SQLAlchemyPacienteRepository`, migração `683ad9092cc2_create_pacientes_table.py` |
| T5 — Novas ações em `auth/service.py` | `eb75e86` | `Acao.PACIENTE_GERENCIAR` (admin+atendente), `Acao.PACIENTE_INATIVAR` (só admin) em `_PERMISSOES`; `PACIENTE_VER` preexistente, não alterada |
| T6 — Endpoints HTTP | `8a59022` | `pacientes/router.py` (POST/PATCH/inativar/reativar/GET/GET busca) com `exigir_acao` correto por ação, mapeamento `ClinicaInexistente→422`, `PacienteNaoEncontrado→404` |

Nenhuma task foi marcada sem evidência. Checklist confiável.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Atendente cadastra paciente vinculado a clínica | Atendida | `service.py::cadastrar_paciente`; endpoint `POST /pacientes` (T6); teste `test_atendente_cria_paciente` (router) |
| 2 | Atendente edita paciente existente | Atendida | `service.py::editar_paciente`; `PATCH /pacientes/{id}`; teste `test_atendente_edita_paciente` |
| 3 | Admin inativa paciente preservando histórico | Atendida | `service.py::inativar_paciente`; `POST /pacientes/{id}/inativar` só via `PACIENTE_INATIVAR`; teste `test_atendente_nao_pode_inativar_paciente` confirma que atendente é bloqueado |
| 4 | Admin reativa paciente | Atendida | `service.py::reativar_paciente`; `POST /pacientes/{id}/reativar`; teste `test_admin_inativa_e_reativa_paciente` |
| 5 | Atendente busca paciente por nome/clínica/proprietário | Atendida | `service.py::buscar_pacientes` (substring case-insensitive, filtros combináveis); testes `test_busca_filtra_por_proprietario`, `test_busca_combina_clinica_e_proprietario` (service) e equivalentes no router |
| 6 | Admin lista pacientes com filtro por clínica | Atendida | `service.py::listar_pacientes`; `GET /pacientes?clinica_id=`; teste `test_listar_filtra_por_clinica` |
| 7 | Autorização via `authorize()`, sem checagem própria | Atendida | `auth/service.py` define `PACIENTE_GERENCIAR`/`PACIENTE_INATIVAR`; router usa apenas `Depends(exigir_acao(...))`, nenhuma checagem de papel reimplementada em `pacientes/`; teste `test_tecnico_nao_pode_criar_paciente` (403) e `test_atendente_nao_pode_inativar_paciente` (403) confirmam a distinção de permissão do atendente |

## Seam de teste

Segue exatamente a decisão da spec: `pacientes/service.py` são funções puras recebendo
`PacienteRepository` (Protocol) e `ClinicaRepository` (Protocol de S2) como parâmetros, testadas
com fakes em memória (`PacienteRepositorioFake`, `ClinicaRepositorioFake`) em
`test_pacientes_service.py`, sem HTTP/DB. Cobre todos os cenários listados em "Testing Decisions":
criação válida, clínica inexistente, edição de paciente existente/inexistente,
inativação/reativação (incluindo inexistente), busca por substring case-insensitive isolada e
combinada (nome, clínica, proprietário, ativos), listagem com/sem filtro. Não é teste raso de "não
quebrou" — cada cenário do prior art da spec tem um caso dedicado.

Adicionalmente, `test_pacientes_router.py` cobre a integração leve de autorização prevista em
"Testing Decisions": `admin`/`atendente` autorizados em `PACIENTE_GERENCIAR`, `técnico` bloqueado
(403), `atendente` bloqueado em `PACIENTE_INATIVAR` (403) — exatamente o caso novo desta spec
mencionado no texto.

## Out of Scope

Nenhum item da lista de "Out of Scope" foi implementado:
- Sem vínculo a Atendimentos/Laudos (entidades não existem no código).
- `EditarPacienteRequest` não expõe `clinica_id` — clínica não é editável após criação, confirmado
  em `schemas.py` e `service.py::editar_paciente` (não recebe `clinica_id`).
- Sem campo de identificador único (microchip/RGA) — confirmado no `Paciente` dataclass e no
  modelo SQLAlchemy, apenas os 9 campos da spec.
- Sem vínculo paciente↔veterinário — `Paciente` não referencia `veterinario_id`.
- Sem demonstração de escopo por clínica do papel `CLINICA` — endpoints usam `exigir_acao` no
  padrão simples de S3, sem `clinica_usuario`/`clinica_recurso`, como decidido.

## ADRs

Aderente a ADR-0001 (stack: Python 3.13, FastAPI, SQLAlchemy 2.x/Alembic, PostgreSQL) e ADR-0002
(pytest, uv). Nenhum desvio de ferramenta detectado; nenhuma justificativa de desvio seria
necessária.

## Funcional de ponta a ponta

Validado agora, não apenas inferido dos testes automatizados. Subi a API real
(`uv run uvicorn vertere_api.main:app`) contra o Postgres de desenvolvimento
(`vertere_postgres_dev`, já rodando via Docker), apliquei a migração (`alembic upgrade head`,
idempotente — já estava aplicada) e exerci o fluxo principal via HTTP puro (`curl`):
1. Login real (`POST /auth/login`) obtendo token JWT de um admin criado direto no banco.
2. `POST /clinicas` para ter uma clínica válida.
3. `POST /pacientes` — criação bem-sucedida (201, `ativo: true`).
4. `GET /pacientes` — lista o paciente criado.
5. `GET /pacientes/busca?nome=rex` — busca por substring funciona.
6. `POST /pacientes/{id}/inativar` — inativa (`ativo: false`).
7. `GET /pacientes` sem token — 401.

Todos os passos retornaram o resultado esperado. Dados de teste foram limpos do banco de
desenvolvimento após a verificação.

## Pendências

Nenhuma. Spec aprovada sem ressalvas.
