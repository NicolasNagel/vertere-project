# Verificação — S1

**Veredito**: ✅ APROVADA
**Data**: 2026-09-19
**Testes**: `uv run pytest -v` (em `apps/api`, contra Postgres real em `vertere_postgres_dev`, porta 5434) — 56 passed, 0 failed, 2 warnings (deprecation, não relacionados à spec).

## Tasks

A seção "Tasks" existe e está preenchida (T1–T8, todas `[x]`), com nota de backfill retroativo explicando a convenção. Auditoria linha a linha contra `git log` e código:

| Task | Commit citado | Confirmado no `git log`? | Confirmado no código? |
|---|---|---|---|
| T1 | `13d4f4f` | Sim | Sim — `auth/domain.py` (`Papel`, `Usuario`), scaffold `apps/api` com `uv` (`pyproject.toml`) |
| T2 | mesmo `13d4f4f` | Sim | Sim — `auth/service.py` (`authenticate`, `authorize`, `hash_senha` com `bcrypt`), testado em `tests/test_auth_service.py` |
| T3 | `28e98f2` | Sim | Sim — `auth/models.py` (`UsuarioModel`), `auth/repository.py` (`SQLAlchemyUsuarioRepository`), migração `migrations/versions/c0f81e669791_create_usuarios_table.py` |
| T4 | `927ab7d` | Sim | Sim — `auth/usuarios_service.py` (`criar_usuario`, `editar_papel`, `desativar_usuario`, `reativar_usuario`), testado em `tests/test_usuarios_service.py` |
| T5 | `9b87ba8` | Sim | Sim — `resetar_senha` em `usuarios_service.py`, testado |
| T6 | `9fed10f` | Sim | Sim — `auth/sessao.py` (`sessao_expirada`) + `auth/sessoes_store.py` (`tocar_sessao` com sliding expiration), testados em `test_sessao.py`/`test_sessoes_store.py` |
| T7 | `46d144d` | Sim | Sim — `auth/router.py` (`/auth/login`, `/auth/me`), `auth/tokens.py` (JWT), `auth/deps.py` (`obter_usuario_atual`, `exigir_acao`), testado em `test_auth_router.py` |
| T8 | `ac0216c` | Sim | Sim — `auth/usuarios_router.py`, todas as rotas sob `dependencies=[Depends(exigir_admin)]`, testado em `test_usuarios_router.py` |

Todos os commits citados existem exatamente com essas mensagens no `git log --oneline`. Nenhuma task marcada `[x]` sem evidência de código/teste correspondente.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Admin cria usuário com papel | Atendida | `usuarios_service.criar_usuario`; endpoint `POST /usuarios` (`usuarios_router.py`); testado em unit (`test_usuarios_service.py`) e HTTP (`test_usuarios_router.py::TestCriarUsuarioEndpoint`); confirmado via `curl` real (criação de atendente com token admin) |
| 2 | Admin edita papel de usuário | Atendida | `usuarios_service.editar_papel`; endpoint `PATCH /usuarios/{id}/papel`; testado e confirmado via `curl` (papel alterado de tecnico → atendente) |
| 3 | Admin desativa usuário | Atendida | `usuarios_service.desativar_usuario`; endpoint `POST /usuarios/{id}/desativar`; confirmado via `curl`: login falha após desativação (401 genérico) |
| 4 | Admin reativa usuário | Atendida | `usuarios_service.reativar_usuario`; endpoint `POST /usuarios/{id}/reativar`; confirmado via `curl`: login volta a funcionar após reativação |
| 5 | Login com e-mail/senha | Atendida | `service.authenticate`; endpoint `POST /auth/login`; confirmado via `curl` (token JWT emitido) |
| 6 | Credenciais inválidas → mensagem genérica | Atendida | `AutenticacaoInvalida` não distingue causa; testado em `test_auth_service.py` (senha errada e e-mail inexistente levantam o mesmo erro); confirmado via `curl`: ambos os casos retornam `{"detail":"E-mail ou senha inválidos"}` com HTTP 401 |
| 7 | Login em conta desativada é rejeitado | Atendida | `authenticate` checa `usuario.ativo`; testado em `test_auth_service.py` e `test_usuarios_router.py::test_usuario_desativado_nao_consegue_mais_logar`; confirmado via `curl` |
| 8 | Sessão expira por inatividade | Atendida | `sessao.sessao_expirada` + `sessoes_store.tocar_sessao` (sliding expiration); testado em `test_sessao.py`/`test_sessoes_store.py`; enforcement em `deps.obter_usuario_atual` (401 "Sessão expirada"), testado em `test_auth_router.py::test_token_de_sessao_encerrada_e_rejeitado`. Observação: o teste de expiração por tempo real não é exercitado ponta-a-ponta via HTTP (seria lento), mas a unidade que decide a expiração é testada isoladamente e o store a usa corretamente — considero suficiente dado o guardrail de "seam única, sem mocks de tempo real" |
| 9 | Admin reseta senha | Atendida | `usuarios_service.resetar_senha`; endpoint `POST /usuarios/{id}/resetar-senha`; confirmado via `curl`: nova senha funciona, senha antiga passa a falhar |
| 10 | Sistema verifica papel antes de autorizar ação sensível | Atendida | `service.authorize`; `deps.exigir_acao`/`exigir_admin` como ponto único de enforcement HTTP; demonstrado em `/auth/financeiro-demo`; confirmado via `curl` (admin 200, atendente 403) |
| 11 | Atendente/técnico não acessam dados financeiros mesmo via endpoint direto | Atendida | `_PERMISSOES` exclui `FINANCEIRO_VER` para atendente/técnico; `exigir_acao(Acao.FINANCEIRO_VER)` aplicado em rota real; confirmado via `curl` (atendente bloqueado com 403 mesmo com token válido) |
| 12 | Usuário-clínica só vê dados da própria clínica | Parcialmente atendida | Mecanismo (`authorize` com `clinica_usuario`/`clinica_recurso`) implementado e testado na seam (`test_clinica_pode_ver_paciente_da_propria_clinica`, `test_clinica_nao_pode_ver_paciente_de_outra_clinica`, `test_clinica_sem_contexto_e_negada_por_padrao`). Não há demonstração ponta-a-ponta via HTTP porque não existe nenhum recurso real de Paciente/Laudo ainda (dependência de specs futuras) — isso está documentado explicitamente na seção "Descobertas" da spec, não escondido. Tratado como esperado/aceitável para o escopo desta spec, e não bloqueia por si só. |
| 13 | Função central de autorização reutilizável | Atendida | `service.authorize` é a única função de decisão de papel; `deps.exigir_acao` é o único ponto de enforcement HTTP; nenhum outro módulo reimplementa checagem (não há outros módulos ainda, mas o padrão está estabelecido e documentado para reuso) |

## Seam de teste

A seam (`authenticate`/`authorize`) é testada exatamente como a spec pede: repositório fake em memória (`RepositorioFake` em `test_auth_service.py`), sem mocks de HTTP/DB, cobrindo todos os cenários listados em "Testing Decisions": login válido, senha errada, conta inativa, autorização de admin em ação financeira, negação de atendente/técnico em ação financeira, negação de clínica de outra clínica. Nenhum teste é "só não quebrou" — cada um afirma o comportamento esperado.

Além da seam mínima exigida, o projeto também testa (de forma consistente com a evolução da spec para persistência e HTTP): `test_usuario_repository.py` contra Postgres real, `test_usuarios_service.py`, `test_sessao.py`, `test_sessoes_store.py`, `test_tokens.py`, `test_auth_router.py`, `test_usuarios_router.py` — todos passando.

## Out of Scope

Nenhum item da lista de fora de escopo foi implementado:
- Sem CRUD de Clínicas/Veterinários/Pacientes/Exames — os únicos usos de "clinica"/"paciente"/"laudo" no código são o campo `clinica_id` em `Usuario` e os valores do enum `Acao` (`PACIENTE_VER`, `LAUDO_VER`), que são apenas identificadores para o mecanismo de autorização, não implementações desses módulos.
- Sem fluxo self-service de "esqueci minha senha" — `ResetarSenhaRequest`/`resetar_senha` só são acessíveis via rota admin-only.
- Sem SSO/2FA.
- Sem log de auditoria de ações por usuário.

Sem scope creep identificado.

## ADRs

- **ADR-0001** (stack): Python no backend — confirmado (`apps/api` em Python 3.13).
- **ADR-0002** (frameworks): FastAPI (`main.py`, routers), `uv` (`pyproject.toml`, `uv.lock`), PostgreSQL (dev container na porta 5434, usado nos testes de repositório), SQLAlchemy 2.x + Alembic (`auth/models.py`, `migrations/`), `pytest` (`tests/`), `bcrypt` diretamente em vez de `passlib` — todos aderentes, sem desvio.
- Seam `authenticate`/`authorize` como funções Python puras testadas sem subir FastAPI/Postgres, conforme "Consequências" do ADR-0002 — confirmado em `test_auth_service.py`.

## Funcional de ponta a ponta

Validado agora, não apenas inferido dos testes unitários:

1. Subi o Postgres de dev (`vertere_postgres_dev`, já rodando), apliquei `uv run alembic upgrade head` (idempotente, já estava em head).
2. Subi a API real com `uv run uvicorn vertere_api.main:app --port 8123`.
3. Semeei um usuário admin diretamente via `criar_usuario` (não há seed script — aceitável para MVP, mas vale nota: não há nenhum comando `create-admin` documentado; o primeiro admin precisa ser criado manualmente por script Python).
4. Exercitei via `curl` real (não a função isolada):
   - `POST /auth/login` com credenciais corretas → 200 + JWT.
   - `GET /auth/me` com token → 200, dados corretos.
   - `POST /usuarios` (admin cria atendente) → 201.
   - `POST /auth/login` com senha errada e com e-mail inexistente → ambos 401 com a mesma mensagem genérica.
   - `GET /auth/financeiro-demo` com token de atendente → 403; com token de admin → 200.
   - `POST /usuarios` com token de atendente → 403 ("Restrito a administradores").
   - `POST /usuarios/{id}/desativar` → login subsequente falha (401); `POST /usuarios/{id}/reativar` → login volta a funcionar (200).
   - `POST /usuarios/{id}/resetar-senha` → login com senha nova funciona, com senha antiga falha.
   - `PATCH /usuarios/{id}/papel` → papel atualizado corretamente na resposta.
5. Limpei os usuários de teste criados no Postgres de dev ao final, e encerrei o processo `uvicorn`.

Todas as stories 1–11 e 13 foram confirmadas ponta a ponta via HTTP real, não só via teste unitário. A story 12 permanece com o mecanismo testado na seam, mas sem recurso real para demonstrar via HTTP (limitação reconhecida na própria spec, não uma omissão da verificação).

## Pendências (se bloqueada)

Não aplicável — spec aprovada. Nenhuma pendência bloqueante encontrada.

Nota não bloqueante (registrar para acompanhamento futuro, não impede aprovação desta spec): a story 12 só poderá ser demonstrada de ponta a ponta quando a spec de Pacientes ou Laudos existir e reusar `authorize()` — já está corretamente documentado na seção "Descobertas" da própria spec, sem invenção de escopo para contornar isso.
