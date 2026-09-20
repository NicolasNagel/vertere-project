# Verificação — S3

**Veredito**: ✅ APROVADA
**Data**: 2026-09-20
**Testes**: `uv run pytest -q` (em `apps/api`) — 118 passed, 0 failed, 2 warnings (deprecation não relacionadas a S3)

## Tasks

Todas as 6 tasks do checklist estão marcadas `[x]` e todas têm evidência real, correspondência 1:1 com um commit e código no repositório:

| Task | Commit | Evidência |
|---|---|---|
| T1 — domínio + `VeterinarioRepository` | `ee966b6` | `veterinarios/domain.py` (`Veterinario`), `veterinarios/service.py` define o Protocol `VeterinarioRepository` |
| T2 — testes da seam | `5c447a8` | `apps/api/tests/test_veterinarios_service.py` (327 linhas, fake em memória) |
| T3 — implementação da seam | `76a31e7` | `veterinarios/service.py`: `cadastrar_veterinario`, `editar_veterinario`, `inativar_veterinario`, `reativar_veterinario`, `buscar_veterinarios`, `listar_veterinarios` |
| T4 — persistência real | `308cc8e` | `veterinarios/models.py` (SQLAlchemy), `migrations/versions/3cb02521b980_create_veterinarios_table.py` (FK para `clinicas`, índice único em `crmv`), `veterinarios/repository.py` (`SQLAlchemyVeterinarioRepository`), `test_veterinario_repository.py` |
| T5 — `Acao.VETERINARIO_GERENCIAR`/`VETERINARIO_VER` | `f1fa2a5` | `auth/service.py` linhas 20-21 (enum) e 35-45 (`_PERMISSOES`: `GERENCIAR` só em `Papel.ADMIN`; `VER` em todos os 4 papéis) |
| T6 — endpoints HTTP | `01307fa` | `veterinarios/router.py`, `veterinarios/schemas.py`, `test_veterinarios_router.py`, `main.py` inclui o router |

Nenhuma task marcada sem evidência. Checklist confiável.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Admin cadastra veterinário vinculado a clínica | Atendida | `service.py::cadastrar_veterinario` valida `clinica_id` via `ClinicaRepository.buscar_por_id` e CRMV único; `router.py::criar` (POST `/veterinarios`, `VETERINARIO_GERENCIAR`); testado em `test_veterinarios_service.py::TestCadastrarVeterinario` e `test_veterinarios_router.py::TestCriarVeterinarioEndpoint`; confirmado end-to-end (ver seção Funcional) |
| 2 | Admin edita veterinário existente | Atendida | `service.py::editar_veterinario` (não altera `crmv`/`clinica_id`); `router.py::editar` (PATCH); testado e confirmado end-to-end |
| 3 | Admin inativa veterinário sem apagar histórico | Atendida | `service.py::inativar_veterinario` só seta `ativo=False`, não deleta nem toca em outra entidade; `router.py::inativar`; testado e confirmado end-to-end |
| 4 | Admin reativa veterinário | Atendida | `service.py::reativar_veterinario`; `router.py::reativar`; testado e confirmado end-to-end |
| 5 | Atendente busca veterinário filtrando por clínica | Atendida | `service.py::buscar_veterinarios` (substring case-insensitive + filtro `clinica_id`); `router.py::buscar` (GET `/veterinarios/busca`, `VETERINARIO_VER` — todos os papéis); `test_veterinarios_router.py::test_atendente_pode_buscar_veterinario_por_nome` e confirmado end-to-end com token de atendente |
| 6 | Admin lista veterinários com filtro opcional de clínica | Atendida | `service.py::listar_veterinarios`; `router.py::listar` (GET `/veterinarios`); `test_veterinarios_router.py::test_listar_filtra_por_clinica`; confirmado end-to-end |
| 7 | Apenas admin gerencia; demais papéis só leitura, via `authorize()` | Atendida | `Acao.VETERINARIO_GERENCIAR` restrita a `Papel.ADMIN` em `_PERMISSOES`; todos os endpoints de escrita usam `Depends(exigir_acao(Acao.VETERINARIO_GERENCIAR))`, leitura usa `Depends(exigir_acao(Acao.VETERINARIO_VER))` — nenhuma checagem de papel reimplementada fora de `authorize()`; testado em `test_atendente_nao_pode_criar_veterinario` (403) e `test_atendente_nao_pode_inativar_veterinario` (403); confirmado end-to-end (atendente recebeu 403 ao criar, 200 ao buscar) |

Todas as 7 user stories atendidas, com evidência de código, teste automatizado e verificação end-to-end real.

## Seam de teste

Segue exatamente o padrão descrito em "Testing Decisions": `veterinarios/service.py` são funções puras recebendo `VeterinarioRepository` (Protocol) e, para validação de clínica, `ClinicaRepository` (mesma interface de S2) — ambos testados com fakes em memória, sem HTTP/DB (`test_veterinarios_service.py`). Cobertura confirmada linha a linha contra os cenários listados na spec: criação válida, CRMV duplicado (inclusive entre clínicas diferentes, conforme decisão explícita), `clinica_id` inexistente, edição existente/inexistente, inativação/reativação, busca por substring case-insensitive com e sem filtro de clínica, busca com `apenas_ativos`, listagem com e sem filtros. Nenhum teste é apenas "não quebrou" — cada um assevera o comportamento específico do cenário.

A verificação de autorização segue o padrão de S2: um teste de integração leve na camada de router (`test_veterinarios_router.py`) confirma que `exigir_acao(Acao.VETERINARIO_GERENCIAR)` bloqueia atendente (403) e `exigir_acao(Acao.VETERINARIO_VER)` permite leitura a todos os papéis testados, sem reimplementar lógica de papel no teste. Persistência real também tem seam própria (`test_veterinario_repository.py`), incluindo teste de que `salvar` faz upsert (não duplica).

## Out of Scope

Nenhum item da lista de "Out of Scope" foi implementado:
- Vínculo com Pacientes/Atendimentos: não existe nenhuma referência a essas entidades no código.
- Troca de clínica de veterinário já cadastrado: `EditarVeterinarioRequest` (schemas.py) não inclui `clinica_id`; `editar_veterinario` (service.py) não aceita nem altera `clinica_id`. Confirmado sem scope creep.
- Validação de formato de CRMV (dígitos+UF): não há regex/validação de formato, só unicidade e presença.
- Portal da Clínica com escopo por clínica: não implementado nesta spec, corretamente deixado fora.

Sem scope creep identificado.

## ADRs

Aderente ao ADR-0002: FastAPI, SQLAlchemy 2.x + Alembic, `pytest`, `uv` — usados exatamente como especificado. Seam de serviço puro testável sem HTTP/DB, replicando o padrão de S1/S2, conforme convenção do projeto. Nenhum desvio de stack detectado, nenhuma justificativa de troca necessária.

## Funcional de ponta a ponta

Validado agora, não apenas por inferência dos testes automatizados. Subi a API real (`uv run uvicorn vertere_api.main:app`) contra o Postgres de desenvolvimento já em execução (`vertere_postgres_dev`, porta 5434), apliquei as migrations (`alembic upgrade head`, já estava em head) e exercitei via `curl` com usuários reais persistidos no banco:

- Login admin → criação de clínica → criação de veterinário: **201**, payload correto.
- CRMV duplicado: **409** com mensagem correta.
- `clinica_id` inexistente: **422** com mensagem correta.
- Edição de veterinário: **200**, dados atualizados refletidos, CRMV/clínica preservados.
- Inativação: **200**, `ativo:false`. Reativação: **200**, `ativo:true`.
- Listagem (admin): **200**, retorna o veterinário criado.
- Busca por nome (admin): **200**, filtra corretamente.
- Atendente tentando criar veterinário: **403** ("Não autorizado").
- Atendente buscando veterinário: **200**, mesma lista visível ao admin.
- Requisição sem token: **401** ("Não autenticado").

Todos os resultados batem com o que a spec e os testes automatizados esperam. Dados de teste (usuários, clínica, veterinário) foram removidos do banco de desenvolvimento ao final e o processo do servidor foi encerrado.

Limitação da verificação: não há frontend nesta spec (módulo é só backend), então a validação de ponta a ponta cobriu API HTTP real, não uma tela. Não foi verificado comportamento sob concorrência (duas criações simultâneas com mesmo CRMV) nem volume — fora do escopo desta verificação funcional de caminho principal.

## Pendências

Nenhuma. Spec aprovada sem ressalvas.
