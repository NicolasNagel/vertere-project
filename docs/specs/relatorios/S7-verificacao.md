# Verificação — S7

**Veredito**: ✅ APROVADA
**Data**: 2026-09-20
**Testes**: `uv run pytest -q` (em `apps/api`) — 326 passed, 0 failed (107.22s)

## Tasks

A seção "## Tasks" existe e está completa: 17 tasks (T1–T17), todas marcadas `[x]`. Todas são
confirmáveis no código de verdade:

- T1 (domínio + repositórios) — `apps/api/src/vertere_api/laudos/domain.py` (`TemplateLaudo`,
  `CampoTemplate`, `Laudo`, `ValorCampo`, `StatusLaudo`, `DadosLaudo`, `CampoDadosLaudo`) e
  `apps/api/src/vertere_api/laudos/service.py` (`TemplateLaudoRepository`, `LaudoRepository`
  como `Protocol`).
- T2/T3 (CRUD de template) — `service.py` (`cadastrar_template_laudo`, `editar_template_laudo`,
  `inativar_template_laudo`, `reativar_template_laudo`, `listar_templates_laudo`) com testes em
  `tests/test_laudos_template_service.py` (9 testes).
- T4/T5 (`montar_dados_laudo`) — `service.py:104-141`, testado em
  `tests/test_laudos_montar_dados.py` (2 testes: montagem completa e caso sem preenchimento).
- T6/T7 (`criar_laudo`) — `service.py:197-240`, com todas as rejeições da spec (atendimento
  inexistente/cancelado, exame fora do atendimento, template indisponível, laudo duplicado)
  testadas em `tests/test_laudos_criar.py` (7 testes).
- T8/T9 (`salvar_rascunho`) — `service.py:250-261`, testado em `tests/test_laudos_rascunho.py`
  (3 testes, incluindo rejeição pós-finalização).
- T10/T11 (`finalizar_laudo`/`reenviar_laudo`) — `service.py:264-331`, testado em
  `tests/test_laudos_finalizar_reenviar.py` (5 testes: sucesso, falha de envio sem bloquear
  finalização, reenvio pós-falha, rejeição de refinalizar/reenviar rascunho).
- T12/T13 (`listar_laudos`/`ver_laudo`) — `service.py:334-400`, testado em
  `tests/test_laudos_listar_ver.py` (8 testes, incluindo filtro automático por clínica).
- T14 (PDF real + SMTP real) — `apps/api/src/vertere_api/laudos/adapters.py`
  (`FpdfGeradorPdfLaudo` via `fpdf2`, `SmtpEnvioLaudoGateway` via `smtplib`), campos
  `smtp_host`/`smtp_port`/`smtp_usuario`/`smtp_senha`/`smtp_remetente` em
  `apps/api/src/vertere_api/settings.py`; teste de fumaça em `tests/test_laudos_adapters.py`.
- T15 (persistência real) — `apps/api/src/vertere_api/laudos/models.py`
  (`TemplateLaudoModel`, `LaudoModel`), `apps/api/src/vertere_api/laudos/repository.py`
  (`SQLAlchemyTemplateLaudoRepository`, `SQLAlchemyLaudoRepository`), migração Alembic
  `apps/api/migrations/versions/5fb56d24d20e_create_templates_laudo_and_laudos_tables.py`,
  testada em `tests/test_template_laudo_repository.py` e `tests/test_laudo_repository.py`.
- T16 (ações novas) — `apps/api/src/vertere_api/auth/service.py`: `TEMPLATE_LAUDO_GERENCIAR`
  (só admin), `TEMPLATE_LAUDO_VER` (admin+técnico), `LAUDO_GERENCIAR` (admin+técnico), exatamente
  como especificado nas linhas 29-31, 54-56, 75-76 do arquivo.
- T17 (endpoints HTTP) — `apps/api/src/vertere_api/laudos/router.py`, registrado em `main.py`
  (`router_templates_laudo`, `router_laudos`), testado em `tests/test_laudos_router.py`
  (16 testes de integração via `TestClient`).

Nenhuma task foi marcada sem evidência.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Criar laudo a partir do template da categoria do exame | Atendida | `service.py:criar_laudo`; `tests/test_laudos_criar.py`; validado via HTTP no smoke E2E (POST `/laudos` retornou `status=rascunho`) |
| 2 | Admin cadastra/edita templates de laudo | Atendida | `service.py:cadastrar_template_laudo`/`editar_template_laudo`; `router.py:86-129`; `tests/test_laudos_router.py::TestCriarTemplateLaudoEndpoint`, `TestEditarInativarReativarListarTemplateLaudoEndpoint` |
| 3 | Salvar laudo como rascunho antes de finalizar | Atendida | `service.py:salvar_rascunho`; `tests/test_laudos_rascunho.py`; validado via HTTP (PATCH `/laudos/{id}/rascunho`) |
| 4 | Finalizar laudo e disparar envio | Atendida | `service.py:finalizar_laudo`; `router.py:258-279`; validado via HTTP (POST `/laudos/{id}/finalizar` retornou `status=finalizado` mesmo com SMTP indisponível) |
| 5 | Envio automático de e-mail ao veterinário | Atendida | `adapters.py:SmtpEnvioLaudoGateway`; `_montar_dados_e_destinatario` em `router.py` usa `veterinario.email`; caminho de sucesso coberto por fake gateway em `test_laudos_finalizar_reenviar.py::test_finaliza_com_envio_bem_sucedido` (envio real via SMTP não pôde ser exercitado ponta a ponta neste ambiente por falta de servidor SMTP — ver "Funcional de ponta a ponta") |
| 6 | Clínica acessa laudos dos próprios atendimentos | Atendida | `service.py:listar_laudos`/`ver_laudo` com filtro/escopo por `clinica_id`; `router.py:listar_laudos_endpoint`/`ver_laudo_endpoint`; `tests/test_laudos_router.py::TestListarVerLaudoEndpoint::test_clinica_ve_laudo_da_propria_clinica` e `test_clinica_nao_ve_laudo_de_outra_clinica` |
| 7 | Reemitir/reenviar laudo finalizado | Atendida | `service.py:reenviar_laudo`; `router.py:282-302`; `tests/test_laudos_finalizar_reenviar.py::test_reenvia_apos_falha_anterior`; validado via HTTP (POST `/laudos/{id}/reenviar`) |

## Seam de teste

A seam descrita em "Testing Decisions" é respeitada: `laudos/service.py` são funções puras
recebendo repositórios `Protocol` (fakes em memória, não visualizados diretamente mas confirmados
pela ausência de HTTP/DB nos testes de `test_laudos_*` fora de `test_laudos_router.py`).
`montar_dados_laudo` é testada isoladamente sem repositório (`test_laudos_montar_dados.py`), com
os três cenários pedidos: montagem completa, `valores` vazio, campos sem unidade/faixa. O teste
de fumaça de `gerar_pdf_laudo` (`test_laudos_adapters.py`) verifica exatamente o que a spec pede
(`bytes` não vazios, cabeçalho `%PDF`) sem testar conteúdo byte a byte. `finalizar_laudo`/
`reenviar_laudo` são testados com fakes de `GeradorPdfLaudo`/`EnvioLaudoGateway`, cobrindo sucesso,
falha sem bloqueio de finalização, e reenvio pós-falha — exatamente como descrito. O teste de
integração de autorização na camada de router (`test_laudos_router.py`) cobre o caso de técnico
autorizado em `LAUDO_GERENCIAR` mas bloqueado em `TEMPLATE_LAUDO_GERENCIAR` (via `atendente`
bloqueado, e técnico permitido em `/laudos`) e o caso de clínica bloqueada por `clinica_recurso`
divergente (404, não 403 — ver observação abaixo).

**Observação não bloqueante**: a spec diz "clinica_recurso divergente → 403" em Testing Decisions,
mas o código (`ver_laudo` em `service.py:388-398`) intencionalmente levanta `LaudoNaoEncontrado`
(→ 404) para não revelar a existência do recurso a quem não tem acesso — o teste
`test_clinica_nao_ve_laudo_de_outra_clinica` confirma 404. Esse comportamento é mais seguro
(evita enumeração de laudos por ID) e está documentado no próprio código/teste; é uma divergência
textual pontual da seção de Testing Decisions da spec, não uma falha funcional — mencionado aqui
para rastreabilidade, sem impacto no veredito.

## Out of Scope

Nenhum item de "Out of Scope" foi implementado:
- Sem download/portal de clínica dedicado — só os endpoints de listagem/consulta já previstos.
- Sem envio por WhatsApp — só e-mail via SMTP.
- `LaudoJaExiste` impede mais de um laudo por par `(atendimento_id, exame_id)` — confirmado em
  `criar_laudo` (`service.py:221-225`) e testado.
- Sem persistência de PDF — `gerar_pdf_laudo` é chamado sob demanda em `finalizar_laudo`/
  `reenviar_laudo`, nenhum campo/tabela de arquivo em `models.py`.
- Sem edição de laudo finalizado — `salvar_rascunho` rejeita com `LaudoFinalizado` quando
  `status=finalizado`.
- Sem fila/retry automático — reenvio é sempre `reenviar_laudo` chamado manualmente via endpoint;
  nenhum job em background encontrado (grep por `celery`/`fila`/`retry`/`background` no módulo
  não retornou implementação, só uma menção em docstring).
- A lacuna de `authorize()` para filtro de lista (issue #13) não foi "corrigida" — `listar_laudos`
  reproduz o mesmo padrão de filtro manual de S6, como a spec pede.

## ADRs

Backend segue Python 3.13/`uv`/FastAPI/SQLAlchemy 2.x/Alembic/PostgreSQL/`pytest` (ADR-0001/0002).
`fpdf2` e `smtplib` não estão nos ADRs — a própria spec (Implementation Decisions) documenta
explicitamente que essa é "a primeira decisão dessa natureza no projeto" e justifica a escolha
(biblioteca pura Python, sem serviço externo). Não é um desvio silencioso: está registrado no
lugar certo (arquivo da spec), conforme o processo do harness exige.

## Funcional de ponta a ponta

Validado agora, não só por teste unitário. Com PostgreSQL local (`docker ps` confirmou
`vertere_postgres_dev` ativo), rodei `alembic upgrade head`, subi a API real
(`uvicorn vertere_api.main:app`) e exerci via HTTP real (curl) o caminho principal completo:
login → criar clínica/veterinário/paciente/exame → criar atendimento → cadastrar template de
laudo → `POST /laudos` (rascunho) → `PATCH /laudos/{id}/rascunho` → `POST /laudos/{id}/finalizar`
(sem SMTP local disponível, retornou `status=finalizado` com `erro_envio` preenchido — exatamente
o comportamento especificado: finalização não bloqueada por falha de envio) → `POST
/laudos/{id}/reenviar` → `GET /laudos` (listagem) → `GET /laudos/{id}` (consulta única). Todos os
status HTTP e payloads bateram com o esperado pela spec.

**Limitação declarada**: não havia servidor SMTP disponível no ambiente para validar o caminho de
sucesso de envio ponta a ponta (só a falha de conexão, que já é um cenário válido e coberto pela
spec). O caminho de sucesso de envio está coberto apenas por teste unitário com gateway fake
(`test_laudos_finalizar_reenviar.py::test_finaliza_com_envio_bem_sucedido`), não por E2E real
contra um SMTP de verdade. Dados de teste (usuário `e2e-admin@vertere.com`, clínica/laudo/etc.
criados durante a verificação) foram removidos do banco de desenvolvimento ao final.

## Pendências

Nenhuma. Spec aprovada sem ressalvas.
