# Verificação — S2

**Veredito**: ✅ APROVADA
**Data**: 2026-09-19
**Testes**: `uv run pytest -q` (apps/api, contra Postgres real em `localhost:5434`) — 87 passed, 0 failed

## Contexto desta reverificação

Esta é uma auditoria independente e do zero, feita após o commit mais recente na branch
(`ce87cb7 fix(s2): corrige achados de julgamento do /code-review`), que é posterior à última
nota de "Reverificação ✅ APROVADA" registrada dentro do próprio arquivo da spec. As notas de
histórico dentro de `docs/specs/S2-clinicas.md` (bloqueio anterior, correções, `/code-review`)
foram tratadas apenas como ponteiros para o que checar — nenhuma conclusão anterior foi aceita
sem confirmação direta no código e em execução ao vivo.

## Tasks

Todas as 5 tasks do checklist estão marcadas `[x]`. Todas têm evidência real no código:

- **T1** — `Clinica` (dataclass, `apps/api/src/vertere_api/clinicas/domain.py`) e
  `ClinicaRepository` (Protocol, `clinicas/repository.py`) com implementação fake em
  `apps/api/tests/test_clinicas_service.py::RepositorioFake`. Confirmado.
- **T2** — `apps/api/tests/test_clinicas_service.py`: cobre criação válida, CNPJ inválido
  (parametrizado em 3 formatos), CNPJ duplicado, edição existente/inexistente,
  inativação/reativação (incl. inexistente), busca por substring case-insensitive (com e sem
  `apenas_ativas`), listagem (com e sem `apenas_ativas`). Confirmado, 16 testes na seam.
- **T3** — `criar_clinica`, `editar_clinica`, `inativar_clinica`, `reativar_clinica`,
  `buscar_por_nome`, `listar_clinicas` implementadas em `clinicas/service.py`, todos os testes
  de T2 passam. Confirmado.
- **T4** — `apps/api/src/vertere_api/clinicas/models.py` (`ClinicaModel`) +
  `SQLAlchemyClinicaRepository` (`clinicas/repository.py`) + migração Alembic
  `apps/api/migrations/versions/aeccdc2ed04c_create_clinicas_table.py` (tabela `clinicas`,
  índice único em `cnpj`). Rodei `alembic upgrade head` contra o Postgres de dev: já aplicada,
  sem erro. Confirmado.
- **T5** — `clinicas/router.py` com 6 endpoints (`POST /clinicas`, `PATCH /clinicas/{id}`,
  `POST /clinicas/{id}/inativar`, `POST /clinicas/{id}/reativar`, `GET /clinicas`,
  `GET /clinicas/busca`), todos usando `Depends(exigir_acao(Acao.CLINICA_GERENCIAR))` (escrita)
  ou `Depends(exigir_acao(Acao.CLINICA_VER))` (leitura) — nenhum usa `exigir_admin` ou checagem
  de papel direta. `Acao.CLINICA_GERENCIAR`/`Acao.CLINICA_VER` existem em `_PERMISSOES`
  (`auth/service.py`), `CLINICA_GERENCIAR` só para `Papel.ADMIN`, `CLINICA_VER` para os 4 papéis.
  Confirmado via leitura de código e exercício HTTP ao vivo (ver seção "Funcional de ponta a
  ponta").

Nenhuma task marcada sem evidência.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Admin cadastra clínica (nome, CNPJ, endereço, telefone, e-mail, status) | Atendida | `criar_clinica` (`clinicas/service.py:30`), `POST /clinicas` (`router.py:41`); teste seam `TestCriarClinica`, teste HTTP `TestCriarClinicaEndpoint::test_admin_cria_clinica`; confirmado ao vivo (201, `ativo: true`) |
| 2 | Admin edita clínica existente | Atendida | `editar_clinica` (`service.py:64`), `PATCH /clinicas/{id}` (`router.py:65`); `TestEditarClinica`/`TestEditarClinicaEndpoint`; confirmado ao vivo (200, campos atualizados) |
| 3 | Admin inativa clínica preservando histórico | Atendida | `inativar_clinica`/`_definir_estado_ativo` (`service.py:79,89`) apenas altera `ativo`, não deleta nem toca em outras entidades (que ainda não existem); `POST /clinicas/{id}/inativar`; confirmado ao vivo |
| 4 | Admin reativa clínica | Atendida | `reativar_clinica` (`service.py:84`); `POST /clinicas/{id}/reativar`; confirmado ao vivo |
| 5 | Atendente busca clínica por nome | Atendida | `buscar_por_nome` (`service.py:96`) exige apenas `Acao.CLINICA_VER` (todos os papéis); `GET /clinicas/busca`; confirmado ao vivo com token de atendente |
| 6 | Admin lista todas as clínicas | Atendida | `listar_clinicas` (`service.py:107`); `GET /clinicas`; confirmado ao vivo |
| 7 | Só admin cria/edita/inativa/reativa; atendente/técnico só leitura, via `authorize()` único ponto de decisão | Atendida | Rotas de escrita usam `Depends(exigir_acao(Acao.CLINICA_GERENCIAR))`, rotas de leitura usam `Depends(exigir_acao(Acao.CLINICA_VER))` — ambas via `auth/deps.py::exigir_acao`, que chama `authorize()` (`auth/service.py:73`). Nenhuma checagem de papel reimplementada em `clinicas/`. Confirmado por leitura de código e teste ao vivo: atendente recebe 403 em `POST /clinicas` e em `POST /clinicas/{id}/inativar`, 200 em `GET /clinicas` e `GET /clinicas/busca` |

Todas as 7 user stories atendidas.

## Seam de teste

Segue exatamente o padrão descrito em "Testing Decisions": `clinicas/service.py` são funções
puras recebendo `ClinicaRepository` como parâmetro; `apps/api/tests/test_clinicas_service.py`
usa `RepositorioFake` em memória, sem HTTP/DB. Os cenários listados na spec estão todos
cobertos: criação válida, CNPJ duplicado, edição (existente/inexistente), inativação/reativação,
busca por substring case-insensitive, listagem com/sem filtro de ativas — mais o CNPJ inválido
(adicionado na correção pós-bloqueio, 3 casos parametrizados).

A autorização é testada na camada de router/integração, não reimplementando teste de papel:
`test_clinicas_router.py` confirma 403 para atendente em rotas de escrita e 200 em rotas de
leitura, sem duplicar a lógica de `authorize()`. Consistente com "Testing Decisions".

## Out of Scope

Nenhum item da lista foi implementado:
- Vínculo com Veterinários/Pacientes/Atendimentos: não existe nenhuma referência a essas
  entidades em `clinicas/` (grep confirmou).
- Validação de dígito verificador de CNPJ: `criar_clinica` só valida `len == 14 and isdigit()`,
  nenhuma lógica de dígito verificador.
- Portal da Clínica (papel `clinica` restrito ao próprio registro): não implementado; `Acao.
  CLINICA_VER` é concedida a todos os 4 papéis sem escopo por clínica (`_ACOES_COM_ESCOPO_DE_
  CLINICA` não inclui `CLINICA_VER`/`CLINICA_GERENCIAR`), consistente com "fica para quando o
  Portal da Clínica for especificado".
- Upload de documentos/contrato: nenhum campo ou endpoint relacionado.

Sem scope creep.

## ADRs

`docs/adr/0001-stack-tecnica.md` e `0002-frameworks-e-ferramentas.md`: implementação usa
FastAPI, SQLAlchemy 2.x + Alembic, PostgreSQL, pytest — igual ao restante do backend (S1),
sem desvio. Contrato Pydantic na fronteira HTTP (`clinicas/schemas.py`, incl. `EmailStr`).
Nenhum desvio de ADR encontrado ou necessário de documentar.

## Descobertas

Seção "## Descobertas" do arquivo da spec está vazia — nenhuma necessidade fora de escopo foi
implementada sem decisão do PO.

## Funcional de ponta a ponta

Validado agora, ao vivo, contra o Postgres de dev real (`localhost:5434`, container
`vertere_postgres_dev`), subindo a API real (`uvicorn vertere_api.main:app`) e usando dois
usuários reais criados diretamente no banco (admin e atendente), autenticados via
`POST /auth/login` (tokens JWT reais, não mocks):

- `POST /clinicas` como atendente → 403
- `POST /clinicas` como admin, dados completos → 201, `ativo: true`
- `POST /clinicas` com `cnpj: "123"` como admin → 422
- `POST /clinicas` com CNPJ já cadastrado → 409
- `PATCH /clinicas/{id}` como admin → 200, campos atualizados
- `POST /clinicas/{id}/inativar` como atendente → 403
- `POST /clinicas/{id}/inativar` como admin → 200, `ativo: false`
- `POST /clinicas/{id}/reativar` como admin → 200, `ativo: true`
- `GET /clinicas` como atendente → 200, lista a clínica criada
- `GET /clinicas/busca?nome=e2e` como atendente → 200, encontra por substring
- `GET /clinicas` sem token → 401

Todos os resultados batem com o comportamento esperado pela spec. Dados de teste (usuários e
clínica criados durante esta verificação) foram removidos do banco de dev ao final.

## Pendências

Nenhuma. Spec aprovada sem ressalvas.
