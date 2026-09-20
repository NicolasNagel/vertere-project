# Verificação — S5

**Veredito**: ✅ APROVADA
**Data**: 2026-09-20
**Testes**: `uv run pytest -q` (apps/api) — 211 passed, 0 failed

## Tasks

Checklist da spec (`docs/specs/S5-exames-precificacao.md`, seção "## Tasks") tem 10 itens, todos
marcados `[x]`. Todos têm evidência real em código e em commit dedicado:

| Task | Evidência |
|---|---|
| T1 — Domínio + repositórios (Protocol) | `exames/domain.py` (`Exame`, `RegraPlantao`), `exames/repository.py` (`ExameRepository`, `RegraPlantaoRepository` como `Protocol`); fakes em `tests/test_exames_exame_service.py` e `tests/test_exames_regra_plantao_service.py`. Commit `24c6660`. |
| T2/T3 — `calcular_adicional_plantao` (testes + implementação) | `tests/test_exames_service.py` (9 testes: janela simples, fora da janela, cruzando meia-noite antes/depois, dia totalmente diferente, regra inativa, nenhuma regra, sobreposição); implementação em `exames/service.py:37-53` + `_regra_cobre_instante`. Commits `bd7b1bc`/`2e0431f`. |
| T4/T5 — CRUD de Exame (testes + implementação) | `tests/test_exames_exame_service.py`; `exames/service.py` (`cadastrar_exame`, `editar_exame`, `inativar_exame`, `reativar_exame`, `listar_exames`). Commits `8b3679f`/`2fad518`. |
| T6/T7 — CRUD de RegraPlantao (testes + implementação) | `tests/test_exames_regra_plantao_service.py`; funções equivalentes em `exames/service.py`. Commits `e5d7d4e`/`0cd789a`. |
| T8 — Persistência real (SQLAlchemy + Alembic) | `exames/models.py` (`ExameModel`, `RegraPlantaoModel`, `Numeric(10,2)` para valores monetários), `exames/repository.py` (`SQLAlchemyExameRepository`, `SQLAlchemyRegraPlantaoRepository`), migração `migrations/versions/ae5622eb5b86_...py`. Commit `b67cb0a`. Migração aplicada e confirmada (`alembic current` → head). |
| T9 — Novas ações de autorização | `auth/service.py:24-27` (`EXAME_GERENCIAR`, `EXAME_VER`, `REGRA_PLANTAO_GERENCIAR`, `REGRA_PLANTAO_VER`) e `_PERMISSOES` (linhas 33-73) com a matriz exata descrita na spec (admin: tudo; atendente: `EXAME_VER`+`REGRA_PLANTAO_VER`; tecnico/clinica: só `EXAME_VER`). Commit `2aafcac`. |
| T10 — Endpoints HTTP | `exames/router.py` (CRUD completo de Exame e RegraPlantao + `GET /regras-plantao/sugestao-adicional`), `exames/schemas.py`, registrados em `main.py`. 404 mapeado para `ExameNaoEncontrado`/`RegraPlantaoNaoEncontrada`. Commit `33acf28`. |

Nenhuma task marcada sem evidência.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Cadastrar exame (categoria/nome/preço-base) | Atendida | `cadastrar_exame` (`exames/service.py:61-69`), `POST /exames` (`router.py:63-74`), teste `TestCadastrarExame` e `TestCriarExameEndpoint` |
| 2 | Editar exame sem afetar atendimentos passados | Atendida (escopo desta spec) | `editar_exame` (`service.py:79-86`), `PATCH /exames/{id}`; snapshot em si é explicitamente Out of Scope, delegado à spec de Atendimentos |
| 3 | Inativar exame preservando histórico | Atendida | `inativar_exame`/`_definir_exame_ativo`, `POST /exames/{id}/inativar`, teste `TestInativarReativarExameEndpoint` |
| 4 | Reativar exame | Atendida | `reativar_exame`, `POST /exames/{id}/reativar`, mesmo teste acima |
| 5 | Listar exames com filtro categoria/ativos | Atendida | `listar_exames` (`service.py:106-115`), `GET /exames` com `Query(categoria, apenas_ativos)`, testes `TestListarExames`/`TestListarExamesEndpoint` (inclui filtro combinado) |
| 6 | Cadastrar regra de plantão | Atendida | `cadastrar_regra_plantao`, `POST /regras-plantao`, `TestCadastrarRegraPlantao`/`TestCriarRegraPlantaoEndpoint` |
| 7 | Editar/inativar regra de plantão | Atendida | `editar_regra_plantao`, `inativar_regra_plantao`, `reativar_regra_plantao`, endpoints correspondentes |
| 8 | Calcular adicional de plantão a partir de data/hora | Atendida | `calcular_adicional_plantao` (função pura, sem repo), `GET /regras-plantao/sugestao-adicional`; 9 testes cobrindo todos os cenários listados na spec, incluindo sobreposição |
| 9 | Só admin gerencia; leitura por papel conforme matriz | Atendida | `auth/service.py` `_PERMISSOES`; testes de router confirmam 403 para `atendente` em `EXAME_GERENCIAR`/`REGRA_PLANTAO_GERENCIAR`, 200 para `atendente` em `REGRA_PLANTAO_VER`, 403 para `tecnico` em `REGRA_PLANTAO_VER` (`test_exames_router.py::TestListarRegrasPlantaoEndpoint::test_tecnico_nao_pode_listar_regras`) |

Todas as 9 user stories atendidas, com código e teste correspondentes.

## Seam de teste

Conforme "Testing Decisions": `exames/service.py` são funções puras recebendo
`ExameRepository`/`RegraPlantaoRepository` (Protocol) como parâmetro, testadas com fakes em
memória (`ExameRepositorioFake`, `RegraPlantaoRepositorioFake`) — sem HTTP/DB, mesmo padrão de
S3/S4. `calcular_adicional_plantao` testada isoladamente sem repositório, cobrindo exatamente os
cenários listados na spec: janela simples dentro do dia, fora da janela, janela cruzando meia-noite
(antes e depois da meia-noite, e dia totalmente diferente), regra inativa ignorada, nenhuma regra
cadastrada, duas regras sobrepostas (desempate por maior valor). Teste de integração leve na camada
de router (`test_exames_router.py`) confirma os pontos de decisão de `authorize()` via `Acao.
EXAME_GERENCIAR/EXAME_VER/REGRA_PLANTAO_GERENCIAR/REGRA_PLANTAO_VER`, incluindo o caso citado na
spec (atendente autorizado em `REGRA_PLANTAO_VER`, bloqueado em `REGRA_PLANTAO_GERENCIAR`) e o
caso simétrico de `tecnico` bloqueado em `REGRA_PLANTAO_VER`. Cobertura fiel ao que a spec pediu.

## Out of Scope

Nenhum item da lista de Out of Scope foi implementado: não há aplicação de adicional/preço a um
atendimento real, não há entidade `Atendimento`, não há snapshot de preço, não há desconto manual,
não há busca textual (só filtro por `categoria`/`ativo`), não há constraint de banco contra
sobreposição de `RegraPlantao` (a migração não cria nenhuma constraint de unicidade/exclusão sobre
`dia_semana`/horário), e `REGRA_PLANTAO_VER` não foi concedida a `tecnico`/`clinica` (confirmado em
`_PERMISSOES`). Sem scope creep.

## ADRs

Stack aderente aos ADRs e ao CLAUDE.md: Python 3.13/`uv`, FastAPI, SQLAlchemy 2.x (`Mapped`/
`mapped_column`) + Alembic, PostgreSQL (`postgresql+psycopg`), `pytest`. Valores monetários em
`Decimal`/`Numeric(10,2)` conforme decisão explícita da própria spec (primeira a lidar com dinheiro
no projeto) — sem `float`. Nomenclatura em português em todo o módulo (domínio, service, router).
Nenhum desvio de stack encontrado; nada a documentar em ADR adicional.

## Funcional de ponta a ponta

Validado agora, não só por teste unitário: subi a API real (`uvicorn`) contra o PostgreSQL local
configurado em `.env` (banco com a migração `ae5622eb5b86` aplicada), criei um usuário admin
diretamente no banco, autentiquei via `POST /auth/login`, e exercitei via HTTP real:
- `POST /exames` → 201, exame criado com `preco_base` correto e `ativo=true`.
- `GET /exames` → 200, retorna o exame criado.
- `POST /regras-plantao` → 201, regra criada corretamente.
- `GET /regras-plantao/sugestao-adicional?data_hora=2026-09-25T22:00:00` → retorna a regra de
  plantão correta (janela cruzando meia-noite, sexta 18:00–sábado 06:00), confirmando
  `calcular_adicional_plantao` ponta a ponta via HTTP, não só a função isolada.
Dados de teste (usuário, exame, regra) removidos do banco após a verificação.

## Pendências

Nenhuma. Spec aprovada sem ressalvas.
