# Verificação — S2

**Veredito**: ✅ APROVADA
**Data**: 2026-09-19
**Testes**: `uv run pytest -q` (em `apps/api`) — 85 passed, 0 failed

## Tasks

Todas as 5 tasks do checklist estão marcadas `[x]` e todas têm evidência real:

- **T1** (domínio + `ClinicaRepository`): `clinicas/domain.py` (`Clinica`, dataclass frozen)
  e `clinicas/repository.py` (`ClinicaRepository` Protocol); fake em memória em
  `tests/test_clinicas_service.py::RepositorioFake`. Commit `c0c7264`.
- **T2** (testes da seam): `tests/test_clinicas_service.py` cobre criação válida, CNPJ inválido
  (3 formatos parametrizados), CNPJ duplicado, edição (existente/inexistente),
  inativação/reativação (incl. inexistente), busca por substring case-insensitive, listagem
  com/sem filtro de ativas. Commit `22ad343`.
- **T3** (`clinicas/service.py`): `criar_clinica`, `editar_clinica`, `inativar_clinica`,
  `reativar_clinica`, `buscar_por_nome`, `listar_clinicas` implementados e testados.
  Commit `c2bee5f`.
- **T4** (persistência real): `clinicas/models.py` (`ClinicaModel`, SQLAlchemy) +
  `clinicas/repository.py::SQLAlchemyClinicaRepository` + migração Alembic
  `migrations/versions/aeccdc2ed04c_create_clinicas_table.py` (tabela `clinicas`, índice único
  em `cnpj`). Testado em `tests/test_clinica_repository.py`. Commit `00c8a96`.
- **T5** (endpoints HTTP): `clinicas/router.py` + `clinicas/schemas.py`, com
  `Depends(exigir_acao(Acao.CLINICA_GERENCIAR))` nas 4 rotas de escrita e leitura livre para
  qualquer usuário autenticado. Testado em `tests/test_clinicas_router.py` (13 casos, incluindo
  papel/403, 404, 409, 422, 401). Commit `3bd57e1`; correção do mecanismo de autorização e da
  validação de CNPJ em `4b70431`.

Nenhuma task marcada sem evidência confirmável no código.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Admin cadastra clínica (nome, CNPJ, endereço, telefone, e-mail, status) | Atendida | `criar_clinica` (`clinicas/service.py:29`), `POST /clinicas` (`router.py:41`); testado na seam e via HTTP (`test_admin_cria_clinica`) |
| 2 | Admin edita clínica existente | Atendida | `editar_clinica` (`service.py:63`), `PATCH /clinicas/{id}` (`router.py:65`); `test_admin_edita_clinica` |
| 3 | Admin inativa clínica sem apagar histórico | Atendida | `inativar_clinica`/`_definir_estado_ativo` (`service.py:86,96`) — apenas seta `ativo=False`, nunca deleta; `POST /clinicas/{id}/inativar` |
| 4 | Admin reativa clínica | Atendida | `reativar_clinica` (`service.py:91`), `POST /clinicas/{id}/reativar`; `test_admin_inativa_e_reativa_clinica` |
| 5 | Atendente busca clínica por nome | Atendida | `buscar_por_nome` (`service.py:111`, substring case-insensitive via `casefold`), `GET /clinicas/busca` sem restrição de papel; `test_atendente_pode_buscar_clinica_por_nome` |
| 6 | Admin lista todas as clínicas | Atendida | `listar_clinicas` (`service.py:117`), `GET /clinicas`; `test_atendente_pode_listar_clinicas` (qualquer papel autenticado, story 6 não restringe a admin e a spec confirma leitura liberada a outros papéis) |
| 7 | Só admin cria/edita/inativa/reativa; atendente/técnico só leitura, via `authorize()` único | Atendida | `Acao.CLINICA_GERENCIAR` adicionado em `_PERMISSOES` (`auth/service.py:24-35`, só `Papel.ADMIN`); rotas de escrita usam `Depends(exigir_acao(Acao.CLINICA_GERENCIAR))` (`auth/deps.py:52`, que chama `authorize()`), não uma checagem de papel reimplementada; confirmado ao vivo (403 para atendente) |

## Seam de teste

`clinicas/service.py` segue o padrão de S1: funções puras recebendo `ClinicaRepository` como
parâmetro, testadas com `RepositorioFake` em memória, sem HTTP/DB (`test_clinicas_service.py`).
Cobre exatamente os cenários que a spec lista em "Testing Decisions": criação válida, CNPJ
duplicado, edição de clínica existente/inexistente, inativação/reativação, busca por substring
case-insensitive, listagem com/sem filtro de ativas — mais o CNPJ inválido (parametrizado em 3
formatos), que foi adicionado na correção. Um teste de integração (router) confirma que
`authorize()`/`exigir_acao` é chamado antes de qualquer escrita (`test_atendente_nao_pode_criar_clinica`,
`test_atendente_nao_pode_inativar_clinica`), como a spec pede — sem reimplementar teste de papel.
`test_clinica_repository.py` cobre a seam do repositório real contra Postgres.

## Out of Scope

Nenhuma violação encontrada: não há código de vínculo com Veterinários/Pacientes/Atendimentos,
não há validação de dígito verificador de CNPJ (só formato de 14 dígitos, como a spec pede), não
há Portal da Clínica nem upload de documentos em `clinicas/`. Busca por termos relacionados no
diretório do módulo não retornou nada.

## ADRs

Stack usada é consistente com ADR-0001/0002: FastAPI, SQLAlchemy 2.x (`Mapped`/`mapped_column`)
+ Alembic, PostgreSQL, `pytest`, `uv`. Domínio, identificadores e comentários em português. Nenhum
desvio de stack encontrado; nenhuma justificativa de desvio necessária.

## Funcional de ponta a ponta

Validado agora, ao vivo, contra uma instância `uvicorn` nova (processo próprio, não o `TestClient`
das specs) e o Postgres de dev (`vertere_postgres_dev`, porta 5434):

- Login como admin e como atendente reais (usuários inseridos via SQL/bcrypt para o teste,
  removidos ao final).
- `POST /clinicas` com CNPJ `"123"` (inválido) → **422**, corpo `CNPJ inválido: '123' — esperado
  14 dígitos`.
- `POST /clinicas` com CNPJ válido de 14 dígitos → **201**, `ativo: true`.
- Repetir o mesmo CNPJ → **409**.
- Atendente tentando criar → **403**; atendente listando (`GET /clinicas`) → **200**; atendente
  buscando por nome (`GET /clinicas/busca?nome=...`) → **200** com resultado filtrado.
- Atendente tentando inativar → **403**; admin inativando → **200** `ativo: false`; admin
  reativando → **200** `ativo: true`.
- `PATCH /clinicas/{id inexistente}` → **404**.
- `GET /clinicas` sem token → **401**.

Nota de processo: a primeira rodada de checagem ao vivo bateu por engano num processo `uvicorn`
remanescente de uma sessão anterior, ainda com o código *antes* da correção de CNPJ (retornou
201 para CNPJ inválido) — o novo processo não conseguiu nem fazer bind da porta (log confirmou
`address already in use`). Depois de encerrar esse processo órfão e subir um `uvicorn` limpo a
partir do working tree atual, todos os casos acima passaram como esperado. Isso não é uma falha
da spec — é um artefato do ambiente de verificação — mas registra por que a v1 desta checagem
teria produzido um falso bloqueio se eu não tivesse notado o "address already in use" no log.

Dados de teste (usuários `verif-*@vertere.com` e as clínicas criadas) foram removidos do Postgres
de dev ao final; o processo `uvicorn` da verificação foi encerrado.

## Pendências

Nenhuma. As duas divergências apontadas na verificação anterior (autorização via `exigir_admin`
em vez de `authorize()`, e ausência de validação de formato de CNPJ) foram corrigidas nesta
branch e confirmadas agora, tanto pela suíte de testes (85 passed) quanto por exercício HTTP
real de ponta a ponta.
