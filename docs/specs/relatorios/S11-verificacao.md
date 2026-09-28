# Verificação — S11

**Veredito**: ✅ APROVADA
**Data**: 2026-09-28
**Testes**: `pnpm test` (Vitest) em `apps/web` — 25 passed, 0 failed (7 test files)

## Tasks

`specs/011-autenticacao-web/tasks.md` contém 39 tasks (T001–T039), todas marcadas `[x]`. Auditei
uma amostra representativa de cada fase contra o código de verdade, não só a marcação:

- **Setup (T001–T008)**: `apps/web/` existe com a estrutura exata de `plan.md`
  (`src/autenticacao/`, `src/shell/`, `src/ui/`, `src/api/`, `src/assets/`), `package.json` usa
  `pnpm`/Vite/React 19/TS, `vitest`+`@testing-library/react` configurados, script
  `gerar-tipos-api` presente. Confirmado por `pnpm install` + `pnpm build` rodando sem erro.
- **Foundational (T009–T015)**: `src/api/tipos.gerados.ts` existe e é consistente com o schema
  real do backend (`components['schemas']['LoginResponse']`/`UsuarioResponse'` usados em
  `clienteAuth.ts` batem com `auth/schemas.py`); `armazenamentoSessao.ts` usa `sessionStorage`
  (não `localStorage`, conforme decisão de `research.md`); `clienteHttp.ts` injeta
  `Authorization: Bearer` e expõe `definirHandlerNaoAutorizado` (T014, base do FR-007).
- **US1 (T016–T023)**: `clienteAuth.login` encadeia `POST /auth/login` → `GET /auth/me`
  (`clienteAuth.ts:13-27`), testado em `clienteAuth.test.ts`; `SessaoContext.tsx` (evolução
  documentada de `useSessao.ts`, task T020/T033) implementa `login`/`sair`/erro genérico;
  `TelaLogin.tsx` usa `role="alert"` para erro. Testes: `TelaLogin.test.tsx` (3 casos),
  `SessaoContext.test.tsx` (5 casos) cobrem os 3 Acceptance Scenarios de US1.
- **US2 (T024–T031)**: `itensDeNavegacao.ts` e `itensDeNavegacao.test.ts` comparam explicitamente
  contra `_PERMISSOES`; verifiquei manualmente linha a linha contra
  `apps/api/src/vertere_api/auth/service.py::_PERMISSOES` (ver seção User Stories) — bate.
  `RotaProtegida.tsx` bloqueia por papel com `role="alert"` de acesso negado (FR-005).
  `ShellAutenticado.tsx` monta o menu via `itensParaPapel`, botão "Sair" chama `useSessao().sair`.
- **US3 (T032–T035)**: `clienteHttp.ts` chama `aoReceberNaoAutorizado()` só quando a requisição
  tinha token (não dispara em falha de login sem sessão prévia — testado em
  `clienteHttp.test.ts`, 2 casos). `SessaoContext.tsx` registra o handler via `useEffect` e limpa
  sessão + seta mensagem de expiração — testado em `SessaoContext.test.tsx` (caso "uma resposta
  401 de qualquer chamada... limpa a sessão").
- **Polish (T036–T039)**: contraste WCAG documentado com números plausíveis (não recalculei
  luminância, mas os valores citados são consistentes com as cores de `index.css`);
  `apps/web/README.md` existe com instruções de setup; T038 registra o achado real de CORS
  (corrigido no commit `4264f37`, confirmado por mim via `curl -i OPTIONS` real, ver "Funcional de
  ponta a ponta").

Nenhuma task encontrada como falsamente marcada. O checklist é auditável e condiz com o código.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| US1 | Login e-mail/senha, erro genérico, sessão sobrevive a refresh | **Atendida** | `TelaLogin.tsx`, `SessaoContext.tsx`, `clienteAuth.ts`; testes `TelaLogin.test.tsx`, `SessaoContext.test.tsx`, `clienteAuth.test.ts`; validado end-to-end contra backend real (ver abaixo) |
| US2 | Shell com menu por papel + bloqueio de rota direta + logout | **Atendida** | `ShellAutenticado.tsx`, `itensDeNavegacao.ts`, `RotaProtegida.tsx`; testes `ShellAutenticado.test.tsx`, `itensDeNavegacao.test.ts`, `RotaProtegida.test.tsx`; validado end-to-end (admin/atendente/clínica, bloqueio de `/financeiro` para atendente) |
| US3 | 401 de qualquer chamada limpa sessão e redireciona com aviso | **Atendida** (com ressalva funcional, ver abaixo) | `clienteHttp.ts` (`aoReceberNaoAutorizado`), `SessaoContext.tsx` (handler); testes `clienteHttp.test.ts`, `SessaoContext.test.tsx` (caso 401 real via `requisitar()`) |

## Seam de teste

Confirma a decisão de `plan.md`/Princípio IV: lógica pura testável sem DOM —
`itensParaPapel` (papel → itens de menu) e o handler de 401 em `clienteHttp`/`SessaoContext` são
testados via `renderHook`/chamadas diretas, sem montar a árvore inteira. Os testes de componente
(`TelaLogin.test.tsx`, `ShellAutenticado.test.tsx`, `RotaProtegida.test.tsx`) cobrem só a
integração final, exatamente como planejado. Os testes cobrem os 3 cenários de aceite de US1, os
4 de US2 e o cenário de US3 — não são testes de "não quebrou", comparam texto/estado esperado
explicitamente (ex: `itensDeNavegacao.test.ts` compara contra uma transcrição de `_PERMISSOES`).

## Out of Scope

Nenhuma tela de conteúdo real foi implementada — todas as 11 rotas de `itensDeNavegacao.ts` têm
`implementado: false` e renderizam `TelaEmConstrucao` (confirmado por teste dedicado e por
inspeção de `rotas.tsx`). Nenhuma lógica de negócio, cálculo ou decisão de autorização nova foi
introduzida no frontend além do espelho de UX descrito na spec. Sem biblioteca de data-fetching
(React Query etc.) e sem framework de utilitário CSS, conforme decidido em `plan.md`.

## ADRs

Aderente a ADR-0002: React + Vite + TypeScript + `pnpm`, monorepo `apps/web` ao lado de
`apps/api`. Contrato de API consumido via tipos gerados do OpenAPI (`tipos.gerados.ts`), não
escritos à mão — confirmado a mão: `LoginResponse`/`UsuarioResponse` usados em `clienteAuth.ts`
correspondem aos schemas reais do backend (validado rodando o backend e comparando `/openapi.json`
implicitamente pelo teste de login end-to-end). Nenhum desvio de stack não documentado.

## Descobertas

Não há seção "Descobertas" em `spec.md`/`plan.md`/`tasks.md` com pendência de decisão do PO. A
única mudança de rota registrada (`clinica` não espelhar `_PERMISSOES` literalmente) está
documentada e justificada em `data-model.md`, dentro do próprio fluxo Spec Kit — não é uma
implementação silenciosa fora de escopo.

## Funcional de ponta a ponta

Subi o backend real (`uv run uvicorn`, Postgres via Docker já rodando em `localhost:5434`) e o
frontend real (`pnpm dev`, Vite em `localhost:5173`), criei usuários reais de cada papel
(`admin`, `atendente`, `tecnico`, `clinica`, e um `admin` inativo) diretamente no banco, e dirigi
um Chromium real via Playwright contra a aplicação rodando (não mocks, não `TestClient`):

- Login válido (admin) → redireciona e mostra "Sair": confirmado.
- Login inválido (senha errada) → mensagem genérica de erro, permanece no login: confirmado.
- Usuário inativo com senha correta → mesma mensagem genérica: confirmado.
- Menu do admin lista Financeiro e Usuários; menu do atendente não lista nenhum dos dois:
  confirmado.
- Acesso direto por URL a `/financeiro` como atendente → bloqueado ("Acesso negado"): confirmado.
- Menu da clínica lista só Pacientes/Atendimentos/Laudos (namespace `/portal/*`): confirmado.
- Refresh (F5) preserva a sessão (continua mostrando "Sair"): confirmado.
- CORS: `curl -i -X OPTIONS` real contra `/auth/login` com `Origin: http://localhost:5173` retorna
  `200` com `access-control-allow-origin` correto — a correção do achado de T038 (commit
  `4264f37`) está de fato aplicada e funcional, não só documentada.
- Cadeia `POST /auth/login` → `GET /auth/me` testada via `curl` direto contra o backend real,
  confirma o contrato que `clienteAuth.ts` assume.

**Ressalva sobre US3 (sessão expirada)**: o mecanismo de detecção de 401 (`clienteHttp` +
`SessaoContext`) está implementado e coberto por teste automatizado que dispara `requisitar()`
com um 401 real e confirma o redirecionamento (`SessaoContext.test.tsx`). Não consegui, e não
acredito que seja possível hoje, disparar esse caminho **organicamente pela UI real**: depois do
login, a única chamada de API que a aplicação faz é `GET /auth/me` durante o próprio login — todas
as seções do shell são `TelaEmConstrucao` sem fetch próprio, e a sessão restaurada de
`sessionStorage` num refresh não é revalidada contra a API. Ou seja, FR-007 está corretamente
implementado como mecanismo (qualquer chamada futura via `clienteHttp` vai disparar o handler), mas
não há hoje, na spec entregue, nenhum ponto de UI que gere essa chamada além do login — o cenário 7
do `quickstart.md` só é exercitável interceptando/forjando uma chamada manualmente (como fiz nos
testes automatizados, e como a nota de T038 sugere ter sido feito via ferramentas de
desenvolvedor). Isto não é uma falha de FR-007 em si (o requisito é sobre o mecanismo, e as
telas com chamadas de API reais são explicitamente "fora de escopo" desta spec, a virem em specs
futuras) — mas é uma limitação real de cobertura end-to-end que a spec deveria deixar mais
explícita do que deixa hoje (T038 afirma "cenário 7... confirmado" sem detalhar como, dado que não
há nenhuma tela real chamando a API). Não bloqueio a spec por isso porque (a) o requisito textual é
sobre o mecanismo, não sobre uma tela específica que ainda não existe por design, e (b) a cobertura
automatizada do mecanismo é real e específica (não é teste de "não quebrou"). Registro aqui para
transparência, não como pendência de bloqueio.

## Pendências

Nenhuma pendência bloqueante. Observação não bloqueante: `spec.md` ainda tem `**Status**: Draft` e
`docs/specs.md` lista S11 como `rascunho`, desatualizado frente ao volume de código e testes já
entregues — cabe a quem chamou este relatório atualizar o status/índice após o veredito, conforme
o ciclo de vida descrito em `docs/specs.md`.
