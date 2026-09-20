# Verificação — S2

**Veredito**: ❌ BLOQUEADA
**Data**: 2026-09-19
**Testes**: `uv run pytest -q` (apps/api) — 81 passed, 0 failed

## Tasks

Todas as 5 tasks (T1–T5) estão marcadas `[x]`. Confirmação contra o código:

- T1 (domínio + repository interface + fake) — confirmado: `clinicas/domain.py` (dataclass `Clinica`), `clinicas/service.py` define `ClinicaRepository` (Protocol), fake em memória (`RepositorioFake`) em `tests/test_clinicas_service.py`.
- T2 (testes da seam) — confirmado: `tests/test_clinicas_service.py` cobre criação, CNPJ duplicado, edição (existente/inexistente), inativação/reativação, busca por substring case-insensitive, listagem com/sem filtro.
- T3 (implementação do service) — confirmado: `clinicas/service.py` implementa as 6 funções, testes de T2 passam.
- T4 (persistência real) — confirmado: `clinicas/models.py` (`ClinicaModel`), `clinicas/repository.py` (`SQLAlchemyClinicaRepository`), migração `migrations/versions/aeccdc2ed04c_create_clinicas_table.py`, testes em `tests/test_clinica_repository.py`.
- T5 (endpoints HTTP) — confirmado: `clinicas/router.py` com POST/PATCH/inativar/reativar (admin-only) e GET listar/busca (autenticado), testes em `tests/test_clinicas_router.py`.

Todas as tasks marcadas têm evidência real de implementação. Nenhuma task mentirosa encontrada. **Porém**, a auditoria linha-a-linha contra a seção "Implementation Decisions" (não apenas contra as tasks) revelou duas decisões explícitas da própria spec que **não foram seguidas pelo código**, apesar das tasks correspondentes estarem marcadas `[x]` — ver Pendências.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Admin cadastra clínica (nome, CNPJ, endereço, telefone, e-mail, status) | Parcialmente atendida | `criar_clinica` em `service.py:24`, endpoint `POST /clinicas` em `router.py:45`, teste `test_admin_cria_clinica`. Falta a validação de formato de CNPJ decidida na spec (ver Pendências) — hoje aceita qualquer string, inclusive `"123"`. |
| 2 | Admin edita clínica existente | Atendida | `editar_clinica` (`service.py:56`), `PATCH /clinicas/{id}` (`router.py:66`), testes `test_edita_dados_de_clinica_existente` e `test_admin_edita_clinica`. |
| 3 | Admin inativa clínica sem apagar histórico | Atendida | `inativar_clinica` (`service.py:79`) só altera `ativo`, não deleta; `POST /clinicas/{id}/inativar` (`router.py:89`); teste `test_inativa_clinica_ativa`/`test_admin_inativa_e_reativa_clinica`. |
| 4 | Admin reativa clínica | Atendida | `reativar_clinica` (`service.py:84`); `POST /clinicas/{id}/reativar` (`router.py:103`); teste `test_reativa_clinica_inativa`. |
| 5 | Atendente busca clínica por nome | Atendida | `buscar_por_nome` (`service.py:104`, substring case-insensitive via `casefold`); `GET /clinicas/busca` (`router.py:123`) sem restrição de papel além de autenticado; teste `test_atendente_pode_buscar_clinica_por_nome`. |
| 6 | Admin lista todas as clínicas | Atendida | `listar_clinicas` (`service.py:110`); `GET /clinicas` (`router.py:112`); teste `test_atendente_pode_listar_clinicas` (lista também acessível a atendente, conforme decidido). |
| 7 | Só admin cria/edita/inativa/reativa; leitura para qualquer papel autenticado, sem checagem de papel reimplementada fora de `authorize()` | Não atendida como especificado | Ver Pendências: as rotas de escrita usam `exigir_admin` (checagem direta de `papel is Papel.ADMIN` em `auth/deps.py:69`), **não** `authorize(papel, "gerenciar_clinica")` como a própria spec decidiu em "Implementation Decisions". A ação `Acao.GERENCIAR_CLINICA` nem existe em `auth/service.py` (`Acao` só tem `FINANCEIRO_VER`, `ATENDIMENTO_CRIAR`, `PACIENTE_VER`, `LAUDO_VER`). O comportamento observável (403 para atendente, 201 para admin) está correto, mas o mecanismo contradiz a decisão explícita da spec e o guardrail do projeto ("authorize() é o único ponto de decisão de permissão por papel"). |

## Seam de teste

`clinicas/service.py` segue o padrão de S1: funções puras recebendo `ClinicaRepository` (Protocol), testadas com `RepositorioFake` em memória, sem HTTP/DB (`tests/test_clinicas_service.py`). Cobre exatamente os cenários listados em "Testing Decisions": criação válida, CNPJ duplicado, edição (existente/inexistente), inativação/reativação, busca por substring case-insensitive, listagem com/sem filtro de ativas. Boa cobertura na seam correta.

Falha específica de "Testing Decisions": a spec pede "um teste de integração leve na camada de serviço ou router confirma que `authorize(papel, "gerenciar_clinica")` é chamado antes de qualquer escrita". Esse teste não existe e **não pode** existir como especificado, porque a ação `"gerenciar_clinica"` não foi criada em `Acao`. Os testes de router (`test_atendente_nao_pode_criar_clinica`, `test_atendente_nao_pode_inativar_clinica`) verificam o efeito observável (403) mas não a seam de autorização pedida pela spec.

## Out of Scope

Sem scope creep detectado: nenhuma vinculação a Veterinários/Pacientes/Atendimentos, nenhuma validação de dígito verificador de CNPJ (aliás falta até a validação de formato, que estava dentro do escopo — ver Pendências), sem Portal da Clínica, sem upload de documentos.

## ADRs

Stack usada é consistente com ADR-0001/0002: FastAPI, SQLAlchemy 2.x (`Mapped`/`mapped_column`), Alembic (migração dedicada), PostgreSQL, `pytest`, `uv`. Sem desvios.

## Descobertas

Seção vazia no arquivo da spec — nada a verificar.

## Funcional de ponta a ponta

Validado agora, não apenas por inferência dos testes:
- Subi a API (`uv run uvicorn vertere_api.main:app`) contra o Postgres de dev (`vertere_postgres_dev`, porta 5434), semeei um usuário `admin` e um `atendente` reais via `UsuarioModel`.
- `POST /clinicas` como admin → 201, clínica persistida.
- `POST /clinicas` como atendente → 403 (autorização de escrita restrita a admin, comportamento correto observável).
- `PATCH /clinicas/{id}`, `POST /clinicas/{id}/inativar`, `POST /clinicas/{id}/reativar` como admin → 200, estado refletido corretamente a cada chamada.
- `GET /clinicas` e `GET /clinicas/busca?nome=...` como atendente → 200, retornam os dados esperados.
- **Confirmei a falha de validação de CNPJ ao vivo**: `POST /clinicas` com `"cnpj": "123"` (3 dígitos, não 14) retornou **201 Created** e a clínica malformada apareceu na listagem seguinte — reproduz exatamente o gap encontrado por leitura de código.
- Limpei os dados de teste (usuários e clínicas) do Postgres de dev ao final.

O fluxo principal (criar → editar → inativar → reativar → listar/buscar, com enforcement de papel no nível HTTP) funciona de ponta a ponta. O gap de validação de CNPJ é real e reproduzido, não hipotético.

## Pendências (se bloqueada)

1. **Autorização não usa `authorize()` com a ação decidida pela spec.** A spec (Implementation Decisions) decide explicitamente: `criar_clinica`, `editar_clinica`, `inativar_clinica`, `reativar_clinica` exigem `authorize(papel, "gerenciar_clinica")`. O código usa `exigir_admin` (checagem direta `papel is not Papel.ADMIN` em `apps/api/src/vertere_api/auth/deps.py:67-71`), que não passa por `authorize()` e não referencia nenhuma ação `"gerenciar_clinica"` — essa ação nem existe em `Acao` (`apps/api/src/vertere_api/auth/service.py:9-17`). Isso é uma divergência explícita entre a spec e o código, além de tensionar o guardrail do projeto de que `authorize()` é o único ponto de decisão de permissão. **O que fazer**: ou (a) adicionar `Acao.GERENCIAR_CLINICA` a `auth/service.py`, incluir em `_PERMISSOES[Papel.ADMIN]`, e trocar `exigir_admin` por `exigir_acao(Acao.GERENCIAR_CLINICA)` nas rotas de escrita de `clinicas/router.py`, adicionando o teste de integração pedido em "Testing Decisions"; ou (b) se a decisão for de fato reutilizar `exigir_admin` (como o comentário da task T3 sugere), atualizar a spec (Implementation Decisions e Testing Decisions) para refletir essa escolha antes de fechar — não deixar o arquivo dizendo uma coisa e o código fazendo outra.

2. **Falta a validação de formato de CNPJ decidida na spec.** "Implementation Decisions" diz: CNPJ "validado apenas quanto a formato (14 dígitos) — validação de dígito verificador fica fora do MVP." Isso implica que a validação de formato (14 dígitos numéricos) está dentro do escopo do MVP; hoje não existe validação alguma — nem em `schemas.py` (Pydantic), nem em `service.py`, nem em `models.py` (a coluna é só `String(14)`, que trunca mas não rejeita). Confirmado ao vivo: `POST /clinicas` com `cnpj: "123"` retorna 201. **O que fazer**: adicionar validação (ex: `field_validator` em `CriarClinicaRequest`/`schemas.py`, ou checagem em `criar_clinica`) que rejeite CNPJ que não seja exatamente 14 dígitos numéricos, com teste cobrindo o caso de rejeição na seam de serviço (não coberto em `tests/test_clinicas_service.py` hoje) e no router.

Ambos os itens são decisões explícitas e verificáveis do próprio arquivo da spec, não interpretação extensiva do verificador — a spec já diz o que deveria acontecer e o código faz outra coisa (ou nada). Corrigir os dois (ou, no caso do item 1, atualizar a spec com a decisão real antes de fechar) antes de reabrir para nova verificação.
