# Verificação — S3

**Veredito**: ✅ APROVADA
**Data**: 2026-09-20
**Testes**: `uv run pytest -q` (em `apps/api`) — 121 passed, 0 failed, 2 warnings (deprecation de `httpx`/`anyio`, não relacionadas a S3)

Nota de independência: recebi apenas o código da spec S3, sem instrução adicional do autor. A
seção "Verificação" já presente no arquivo `docs/specs/S3-veterinarios.md` (resultado de uma
execução anterior de `/fechar-spec` e de `/code-review`) foi ignorada como fonte de verdade para
efeito de julgamento — tudo abaixo foi conferido agora, de novo, contra o código de verdade e a
suíte rodada nesta sessão. O conteúdo dessa seção coincide com o que apurei de forma
independente, mas essa coincidência não substituiu a checagem.

## Tasks

Todas as 6 tasks do checklist estão marcadas `[x]`. Todas têm evidência real, com correspondência
1:1 a um commit e a código existente no repositório:

| Task | Commit | Evidência |
|---|---|---|
| T1 — domínio + `VeterinarioRepository` | `ee966b6` | `veterinarios/domain.py` (`Veterinario`, dataclass frozen); `veterinarios/service.py` define o `Protocol VeterinarioRepository` (`buscar_por_crmv`, `buscar_por_id`, `listar_todas`, `salvar`) |
| T2 — testes da seam | `5c447a8` | `apps/api/tests/test_veterinarios_service.py` — fakes em memória (`ClinicaRepositorioFake`, `VeterinarioRepositorioFake`), sem HTTP/DB |
| T3 — implementação da seam | `76a31e7` | `veterinarios/service.py`: `cadastrar_veterinario`, `editar_veterinario`, `inativar_veterinario`, `reativar_veterinario`, `buscar_veterinarios`, `listar_veterinarios` |
| T4 — persistência real | `308cc8e` | `veterinarios/models.py` (`VeterinarioModel`, FK `clinica_id → clinicas.id`, índice único em `crmv`); `migrations/versions/3cb02521b980_create_veterinarios_table.py` (cria a tabela e o índice único); `veterinarios/repository.py` (`SQLAlchemyVeterinarioRepository`); `apps/api/tests/test_veterinario_repository.py` |
| T5 — `Acao.VETERINARIO_GERENCIAR`/`VETERINARIO_VER` | `f1fa2a5` | `auth/service.py` linhas 20-21 (enum) e 27-46 (`_PERMISSOES`: `VETERINARIO_GERENCIAR` só em `Papel.ADMIN`; `VETERINARIO_VER` nos 4 papéis) |
| T6 — endpoints HTTP | `01307fa` (+ `99340f3` para o ajuste de `/code-review`) | `veterinarios/router.py` (criar/editar/inativar/reativar via `exigir_acao(VETERINARIO_GERENCIAR)`; listar/buscar via `exigir_acao(VETERINARIO_VER)`; mapeamento `CrmvVazio`/`ClinicaInexistente`→422, `CrmvJaCadastrado`→409, `VeterinarioNaoEncontrado`→404); `veterinarios/schemas.py`; `main.py` inclui o router; `apps/api/tests/test_veterinarios_router.py` |

Nenhuma task marcada sem evidência real. Checklist confiável — reflete o código de fato.

Um ponto a registrar (não é falha do checklist, é um achado tardio já corrigido): a exceção
`CrmvVazio` e o mapeamento para 422 não estavam presentes na primeira leitura de T3/T6 — foram
adicionados depois, no commit `99340f3`, motivado por um achado do `/code-review` contra a linha
54 da spec ("Formato validado apenas quanto a não ser vazio [...]"). O código atual (`service.py`
linhas 21-23, 51-52; `router.py` linhas 18, 62-63) já cobre isso corretamente, e o checklist
(`T3`, `T6`) permanece verdadeiro para o estado final do código, que é o que importa nesta
verificação.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Admin cadastra veterinário vinculado a uma clínica (nome, CRMV, telefone, e-mail, status) | Atendida | `service.py::cadastrar_veterinario` valida `clinica_id` via `ClinicaRepository.buscar_por_id`, rejeita CRMV vazio (`CrmvVazio`) e duplicado (`CrmvJaCadastrado`); `router.py::criar` (`POST /veterinarios`, `VETERINARIO_GERENCIAR`); testes: `test_veterinarios_service.py::TestCadastrarVeterinario`, `test_veterinarios_router.py::TestCriarVeterinarioEndpoint`; confirmado end-to-end (ver seção Funcional) |
| 2 | Admin edita dados de veterinário existente sem perder histórico | Atendida | `service.py::editar_veterinario` (não altera `crmv` nem `clinica_id`, preservando o vínculo); `router.py::editar` (`PATCH /veterinarios/{id}`); testes: `TestEditarVeterinario`, `TestEditarVeterinarioEndpoint`; confirmado end-to-end |
| 3 | Admin inativa veterinário sem apagar histórico | Atendida | `service.py::inativar_veterinario` apenas seta `ativo=False` via `_definir_estado_ativo`, sem deletar registro nem tocar em outra entidade; `router.py::inativar`; testes e confirmação end-to-end (`ativo:false` no retorno) |
| 4 | Admin reativa veterinário previamente inativado | Atendida | `service.py::reativar_veterinario`; `router.py::reativar`; testes e confirmação end-to-end (`ativo:true`) |
| 5 | Atendente busca veterinário filtrando por clínica ao registrar atendimento | Atendida | `service.py::buscar_veterinarios` (substring case-insensitive + filtro opcional `clinica_id`/`apenas_ativos` via `_filtrar`); `router.py::buscar` (`GET /veterinarios/busca`, `VETERINARIO_VER` — todos os 4 papéis); teste `test_atendente_pode_buscar_veterinario_por_nome`; confirmado end-to-end com token de atendente |
| 6 | Admin lista veterinários com filtro opcional por clínica | Atendida | `service.py::listar_veterinarios`; `router.py::listar` (`GET /veterinarios`); teste `test_listar_filtra_por_clinica`; confirmado end-to-end |
| 7 | Apenas admin gerencia; demais papéis só leitura, tudo via `authorize()` | Atendida | `Acao.VETERINARIO_GERENCIAR` restrita a `Papel.ADMIN` em `_PERMISSOES` (`auth/service.py`); todos os 4 endpoints de escrita usam `Depends(exigir_acao(Acao.VETERINARIO_GERENCIAR))`; leitura usa `Depends(exigir_acao(Acao.VETERINARIO_VER))`; nenhuma checagem de papel reimplementada fora de `authorize()`/`exigir_acao`; testes `test_atendente_nao_pode_criar_veterinario` (403), `test_atendente_nao_pode_inativar_veterinario` (403), `test_atendente_pode_listar_veterinarios` (200); confirmado end-to-end (atendente: 403 ao criar/inativar, 200 ao listar/buscar; sem token: 401) |

Todas as 7 user stories atendidas, com evidência de código, teste automatizado e verificação
funcional de ponta a ponta, checada agora.

## Seam de teste

Segue exatamente o padrão descrito em "Testing Decisions": `veterinarios/service.py` expõe
funções puras que recebem `VeterinarioRepository` (Protocol) e, para validar a clínica,
`ClinicaRepository` (mesma interface de S2) — testadas com fakes em memória
(`test_veterinarios_service.py`), sem HTTP/DB. Cobertura conferida cenário a cenário contra o que
a spec pede: criação válida; CRMV vazio (incl. whitespace, parametrizado); CRMV duplicado, inclusive
entre clínicas diferentes (`test_rejeita_crmv_duplicado_mesmo_em_clinica_diferente`, confirmando a
decisão explícita de unicidade global do CRMV); `clinica_id` inexistente; edição de veterinário
existente e inexistente; inativação/reativação (incl. inexistente); busca por substring
case-insensitive com e sem filtro de clínica e com `apenas_ativos`; listagem com e sem filtros
combinados. Nenhum teste é apenas "não quebrou" — cada um assevera o comportamento específico do
cenário da spec.

A autorização é verificada com um teste de integração leve na camada de router
(`test_veterinarios_router.py`), reaproveitando `authorize()`/`exigir_acao()` de S1 diretamente,
sem reimplementar lógica de papel no teste: confirma 403 para `ATENDENTE` em rotas de
gerenciamento e 200 para leitura nos papéis testados, além de 401 sem token. Persistência real tem
seam própria (`test_veterinario_repository.py`, não lido linha a linha nesta rodada mas presente e
passando na suíte).

## Out of Scope

Nenhum item listado como fora de escopo foi implementado:
- Vínculo com Pacientes/Atendimentos: nenhuma referência a essas entidades no código de S3.
- Troca de clínica de veterinário já cadastrado: `EditarVeterinarioRequest` (`schemas.py`) não
  inclui `clinica_id`; `editar_veterinario` (`service.py`) não recebe nem altera `clinica_id`.
  Confirmado sem scope creep.
- Validação de formato de CRMV por conselho regional (dígitos+UF): não há regex/validação de
  formato, apenas presença (não-vazio) e unicidade.
- Portal da Clínica com escopo por clínica: não implementado nesta spec — corretamente deixado de
  fora, mecanismo de escopo por clínica em `authorize()` não estendido a Veterinários aqui.

Sem scope creep identificado.

## ADRs

Aderente ao ADR-0002: FastAPI, SQLAlchemy 2.x + Alembic, Pydantic nos contratos de rota, `pytest`,
`uv` — usados exatamente como especificado, sem desvio de stack. Seam de serviço puro testável sem
HTTP/DB replica o padrão de S1/S2 (convenção do projeto documentada em `CLAUDE.md`). Português em
identificadores, mensagens de erro e comentários, conforme convenção. Nenhum desvio detectado que
exigisse justificativa em ADR.

## Descobertas

Seção "Descobertas" do arquivo da spec está vazia. Nada a checar quanto a implementação sem
decisão do PO.

## Funcional de ponta a ponta

Validado agora nesta sessão, contra a API real, não apenas por inferência dos testes automatizados:

- Migrations aplicadas (`uv run alembic upgrade head`, já em head).
- API real (`uv run uvicorn vertere_api.main:app`) subida contra o Postgres de desenvolvimento já
  em execução (`vertere_postgres_dev`, porta 5434 via `DATABASE_URL` do `.env`).
- Usuários `admin` e `atendente` reais persistidos no banco (via `hash_senha` do próprio módulo
  `auth`), autenticados via `POST /auth/login` (tokens reais, não mockados).
- Login admin → criação de clínica (`POST /clinicas`) → criação de veterinário
  (`POST /veterinarios`): **201**, payload correto (`ativo: true`).
- CRMV duplicado: **409**.
- `clinica_id` inexistente: **422**.
- CRMV vazio (`"   "`): **422**.
- Edição de veterinário (`PATCH /veterinarios/{id}`): **200**, dados atualizados refletidos,
  CRMV e `clinica_id` preservados (não editáveis, confirmando decisão de Out of Scope).
- Inativação (`POST /veterinarios/{id}/inativar`): **200**, `ativo: false`.
  Reativação (`POST /veterinarios/{id}/reativar`): **200**, `ativo: true`.
- Atendente tentando criar veterinário: **403**.
- Atendente listando (`GET /veterinarios`): **200**.
- Atendente buscando por nome (`GET /veterinarios/busca?nome=...`): **200**, resultado correto.
- Requisição sem token (`GET /veterinarios`): **401**.
- Editar veterinário inexistente: **404**.

Todos os resultados batem com o que a spec e os testes automatizados esperam. Dados de teste
(usuários, clínica, veterinário) foram removidos do banco de desenvolvimento ao final e o processo
do servidor uvicorn foi encerrado.

Limitação da verificação: não há frontend nesta spec (módulo é só backend), então a validação de
ponta a ponta cobriu a API HTTP real, não uma tela. Não foi verificado comportamento sob
concorrência (duas criações simultâneas com o mesmo CRMV disputando a constraint única do banco)
nem volume — fora do escopo de uma verificação de caminho principal.

## Pendências

Nenhuma. Spec aprovada sem ressalvas.
