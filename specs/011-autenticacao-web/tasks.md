---

description: "Task list template for feature implementation"
---

# Tasks: Autenticação e Shell Autenticado do Frontend

**Input**: Design documents from `specs/011-autenticacao-web/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Este projeto é test-first por convenção (`CLAUDE.md`, Princípio IV da constitution) —
diferente do padrão do Spec Kit (testes opcionais por default), tarefas de teste aqui são
**obrigatórias**, escritas antes da implementação de cada história.

**Organização**: tasks agrupadas por user story (spec.md), cada uma independentemente testável.
Cada task concluída = um commit (`tipo(escopo): mensagem`, escopo `s11`), conforme `CLAUDE.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência entre si)
- **[Story]**: US1 (login), US2 (shell/navegação por papel), US3 (sessão expirada)
- Caminhos de arquivo exatos, conforme `plan.md` → Project Structure

## Phase 1: Setup

**Purpose**: inicializar `apps/web` do zero — primeiro código de frontend do projeto.

- [x] T001 Criar `apps/web/` com a estrutura de pastas de `plan.md` (`src/autenticacao/`,
  `src/shell/`, `src/ui/`, `src/api/`, `src/assets/`, `tests/`)
- [x] T002 Inicializar `apps/web/package.json` via `pnpm create vite . --template react-ts`,
  ajustando para `pnpm` (conforme `CLAUDE.md`); adicionar `react-router` como dependência
- [x] T003 [P] Configurar `apps/web/vite.config.ts` e `apps/web/tsconfig.json` (strict mode)
- [x] T004 [P] Configurar Vitest + React Testing Library: `apps/web/vitest.config.ts` (ou seção em
  `vite.config.ts`) + `apps/web/tests/setup.ts`
- [x] T005 [P] `apps/web/index.html`: incluir as 4 famílias de fonte via Google Fonts (Big Shoulders
  Display, Cormorant Garamond, Manrope, JetBrains Mono — pesos exatos listados em
  `vertere-lab/assets/features/screens/1-login.html`, citado em `research.md`)
- [x] T006 [P] Criar `apps/web/src/index.css` com os tokens de `research.md` (`--color-brand-ink
  #2c4768`, `--color-brand-ink-deep #1f3450`, `--color-text-primary #1a2d45`,
  `--color-text-secondary #596979`, `--color-surface-cream #eeeae0`, `--color-surface-form #fbfaf6`,
  `--color-border #e5e2db`, `--color-accent-mist #9cbfc2`, `--font-display`, `--font-script`,
  `--font-body`, `--font-mono`)
- [x] T007 [P] Adicionar `openapi-typescript` como dev dependency + script `gerar-tipos-api` em
  `package.json` que lê `http://localhost:8000/openapi.json` (backend local) e escreve
  `apps/web/src/api/tipos.gerados.ts`
- [x] T008 [P] Copiar `vertere-logo-white.png` e `vertere-mark.png` de
  `github.com/NicolasNagel/vertere-lab` (`assets/features/`) para `apps/web/src/assets/` (mesma
  marca, versão anterior do produto — ver `research.md`)

**Checkpoint**: `pnpm install && pnpm dev` sobe uma página em branco sem erro de build.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestrutura que as três user stories compartilham — nenhuma história começa antes
disso estar pronto.

**⚠️ CRITICAL**: nenhuma task de US1/US2/US3 começa antes desta fase terminar.

- [x] T009 Rodar o script de T007 contra o backend local rodando, gerando
  `apps/web/src/api/tipos.gerados.ts` de verdade (arquivo nunca editado à mão — regenerado sempre
  que o contrato da API mudar)
- [x] T010 [P] Definir `SessaoUsuario` e `ItemDeNavegacao` em `apps/web/src/tipos.ts`, exatamente
  como especificado em `data-model.md` (campos `token`/`papel`/`clinicaId` para `SessaoUsuario`;
  `rotulo`/`rota`/`papeisPermitidos`/`implementado` para `ItemDeNavegacao`) — `SessaoUsuario` ganhou
  também `email` (retrofit na fase US2, ver commit correspondente)
- [x] T011 Implementar `apps/web/src/autenticacao/armazenamentoSessao.ts` — `obter()`/`salvar()`/
  `limpar()` sobre `sessionStorage` (não `localStorage`, decisão de `research.md`), tipado com
  `SessaoUsuario`
- [x] T012 [P] Implementar `apps/web/src/ui/Botao.tsx` + `apps/web/src/ui/botao.css` — variantes
  primário/secundário/ghost com os tokens de `research.md` (raio de borda 2px, maiúsculo/
  letter-spacing largo no primário, conforme `button.css` de referência)
- [x] T013 [P] Implementar `apps/web/src/ui/CampoTexto.tsx` + `apps/web/src/ui/campo-texto.css` —
  `<label for>` + `<input>` semânticos (não `<div>` estilizado, melhoria de UI/UX sobre o mock
  estático), com suporte a ícone e a alternância de mostrar/ocultar senha como
  `<button type="button" aria-pressed>`
- [x] T014 Implementar `apps/web/src/api/clienteHttp.ts` — `fetch` fino que injeta
  `Authorization: Bearer <token>` a partir de `armazenamentoSessao.obter()`, usa a URL base de
  `import.meta.env.VITE_API_URL`, e aceita um callback `aoReceberNaoAutorizado` (ainda não conectado
  a nada — US3 conecta) para não acoplar Setup a uma decisão de UX que é da US3
- [x] T015 Implementar `apps/web/src/App.tsx` + `apps/web/src/main.tsx` + `apps/web/src/rotas.tsx`
  (esqueleto do `react-router`, sem guard de papel ainda — US2 adiciona)

**Checkpoint**: infraestrutura pronta — US1, US2 e US3 podem começar (em paralelo, se houver mais de
uma pessoa; em sequência de prioridade aqui: US1 → US2 → US3).

---

## Phase 3: User Story 1 - Login com e-mail/senha (Priority: P1) 🎯 MVP

**Goal**: usuário autentica com e-mail/senha contra a API já existente e é redirecionado; erro
mostra mensagem genérica (spec.md, Acceptance Scenarios 1–3).

**Independent Test**: abrir a aplicação sem sessão ativa, logar com credenciais válidas e inválidas,
confirmar redirecionamento/mensagem — sem depender de nenhuma tela do shell existir ainda
(`TelaLogin` pode redirecionar para uma rota vazia nesta fase).

### Tests for User Story 1 ⚠️

> Escrever estes testes primeiro, confirmar que falham antes de implementar.

- [x] T016 [P] [US1] Teste: `clienteAuth.login` encadeia `POST /auth/login` → `GET /auth/me` e
  retorna `SessaoUsuario` completo (token+papel+clinicaId), em
  `apps/web/src/autenticacao/clienteAuth.test.ts` (mock de `fetch`)
- [x] T017 [P] [US1] Teste: `useSessao` — login bem-sucedido guarda a sessão via
  `armazenamentoSessao.salvar` e expõe `autenticado=true`, em
  `apps/web/src/autenticacao/useSessao.test.ts` — arquivo renomeado para `SessaoContext.test.tsx`
  na fase US3 (ver T033)
- [x] T018 [P] [US1] Teste: `useSessao` — login com credenciais inválidas OU usuário inativo (ambos
  os casos, mesmo mock de erro 401 genérico do backend) retorna a mesma mensagem de erro e não
  guarda sessão, em `apps/web/src/autenticacao/useSessao.test.ts`

### Implementation for User Story 1

- [x] T019 [US1] Implementar `apps/web/src/autenticacao/clienteAuth.ts` (depende de T014, T009) —
  `POST /auth/login` + `GET /auth/me` em sequência, usando os tipos de `tipos.gerados.ts`
- [x] T020 [US1] Implementar `apps/web/src/autenticacao/useSessao.ts` (depende de T011, T019) —
  hook com `autenticado`, `papel`, `login(email, senha)`, `sair()` — **substituído por
  `SessaoContext.tsx` na fase US3** (T033): um hook com `useState` próprio por componente não
  conseguia propagar "sessão expirada" para componentes já montados; virou Context compartilhado
- [x] T021 [US1] Implementar `apps/web/src/autenticacao/PainelMarca.tsx` +
  `apps/web/src/autenticacao/painel-marca.css` — painel esquerdo com logo (T008), slogan em
  `--font-display`/`--font-script` ("Cada amostra, *uma história*. Cada resultado, *um cuidado*.",
  copy de `vertere-lab`) e os dois círculos decorativos translúcidos
- [x] T022 [US1] Implementar `apps/web/src/autenticacao/TelaLogin.tsx` +
  `apps/web/src/autenticacao/tela-login.css` (depende de T012, T013, T020, T021) — layout de painel
  duplo, formulário usando `CampoTexto`/`Botao`, erro anunciado via `role="alert"`, `:focus-visible`
  em todo elemento interativo
- [x] T023 [US1] Teste de componente: `TelaLogin` — submete credenciais válidas e é redirecionado,
  credenciais inválidas mostram erro sem sair da tela (React Testing Library), em
  `apps/web/src/autenticacao/TelaLogin.test.tsx`

**Checkpoint**: US1 funcional e testável sozinha — cenários 1–3 e 8 (refresh preserva sessão) do
`quickstart.md`.

---

## Phase 4: User Story 2 - Shell autenticado com navegação por papel (Priority: P1)

**Goal**: shell pós-login com menu condicionado por papel, replicando as `Acao` já concedidas pelo
backend; bloqueio de acesso direto por URL (spec.md, Acceptance Scenarios 1–4).

**Independent Test**: logar com um usuário de cada papel (fixtures/seed do backend) e comparar o
menu renderizado contra `auth/service.py::_PERMISSOES` — não depende de nenhuma tela de conteúdo
real existir (usa `TelaEmConstrucao` como destino).

### Tests for User Story 2 ⚠️

- [x] T024 [P] [US2] Teste: `itensDeNavegacao` retorna exatamente os itens esperados para cada um
  dos 4 papéis (`admin`, `atendente`, `tecnico`, `clinica`), comparando contra a tabela de
  `_PERMISSOES` transcrita em `data-model.md`, em `apps/web/src/shell/itensDeNavegacao.test.ts` —
  **`clinica` corrigido durante a implementação para não espelhar `_PERMISSOES` literalmente**, ver
  nota em `data-model.md` e o commit de T026
- [x] T025 [P] [US2] Teste: `RotaProtegida` bloqueia renderização quando o papel do usuário não está
  em `papeisPermitidos` da rota, permite quando está, em `apps/web/src/shell/RotaProtegida.test.tsx`

### Implementation for User Story 2

- [x] T026 [US2] Implementar `apps/web/src/shell/itensDeNavegacao.ts` (depende de T010) — lista
  completa de `ItemDeNavegacao` (Clínicas, Veterinários, Pacientes, Exames, Atendimentos, Laudos,
  Financeiro, Usuários), `implementado: false` para todas nesta spec (FR-008) — `clinica` usa rotas
  `/portal/*` distintas das rotas de staff, não os mesmos `ItemDeNavegacao` (correção de design
  feita nesta task, documentada em `data-model.md`)
- [x] T027 [US2] Implementar `apps/web/src/shell/RotaProtegida.tsx` (depende de T020, T026) — guard
  de rota por papel (FR-005)
- [x] T028 [P] [US2] Implementar `apps/web/src/shell/TelaEmConstrucao.tsx` (FR-008)
- [x] T029 [US2] Implementar `apps/web/src/shell/ShellAutenticado.tsx` +
  `apps/web/src/shell/shell-autenticado.css` (depende de T020, T026) — sidebar fixa 220px em
  `--color-brand-ink-deep`, item ativo com borda esquerda `--color-accent-mist`, rótulos de seção em
  `--font-mono` maiúsculo, avatar no rodapé, botão "Sair" (chama `useSessao.sair`), colapsável em
  mobile com `prefers-reduced-motion` respeitado na transição
- [x] T030 [US2] Conectar `apps/web/src/rotas.tsx` (depende de T015, T022, T027, T029) — `Shell` como
  rota-layout, uma rota filha por item de `itensDeNavegacao`, cada uma envolvida por `RotaProtegida`
- [x] T031 [US2] Teste de integração: `ShellAutenticado` — menu mostra os itens corretos para cada
  papel logado, "Sair" limpa a sessão e volta ao login, em
  `apps/web/src/shell/ShellAutenticado.test.tsx`

**Checkpoint**: US1+US2 funcionais juntas — cenários 4–6 e 9 do `quickstart.md`.

---

## Phase 5: User Story 3 - Sessão expirada ou inválida (Priority: P2)

**Goal**: uma resposta `401` de qualquer chamada limpa a sessão e redireciona ao login com aviso
(spec.md, Acceptance Scenario 1).

**Independent Test**: forçar um token inválido/expirado e confirmar o redirecionamento com a
mensagem, independente de qual seção estava aberta.

### Tests for User Story 3 ⚠️

- [x] T032 [P] [US3] Teste: `clienteHttp` — uma resposta `401` de qualquer chamada dispara
  `aoReceberNaoAutorizado` exatamente uma vez, em `apps/web/src/api/clienteHttp.test.ts` — a lógica
  coberta já existia desde T014 (Foundational); este teste confirma o comportamento, não foi um red
  state genuíno

### Implementation for User Story 3

- [x] T033 [US3] Conectar `aoReceberNaoAutorizado` (depende de T014, T020) — **`useSessao.ts` virou
  `SessaoContext.tsx`** (`SessaoProvider`): descoberto durante esta task que um hook com `useState`
  próprio por componente não propagaria a sessão expirada a componentes já montados (cada um com seu
  próprio estado local). O Provider único, montado em `App.tsx`, resolve isso — estado compartilhado
  por toda a árvore
- [x] T034 [US3] Integrar o handler de T033 em `apps/web/src/App.tsx` (depende de T015, T033) —
  **simplificado pela mudança de T033**: como `RotaProtegida` e `TelaLogin` já leem do mesmo
  `SessaoContext`, bastou envolver `<RouterProvider>` com `<SessaoProvider>` em `App.tsx`; nenhuma
  integração extra foi necessária além disso
- [x] T035 [US3] Teste de integração: sessão expirada durante navegação no shell redireciona ao
  login com a mensagem, sem tela em branco — **implementado em
  `apps/web/src/autenticacao/SessaoContext.test.tsx`**, não em `App.test.tsx`: testar via o próprio
  Provider (que é onde o handler de 401 é registrado) cobre o mesmo comportamento sem precisar
  montar o app inteiro com roteador

**Checkpoint**: todas as user stories funcionais — os 9 cenários do `quickstart.md` completos.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T036 [P] Verificar contraste WCAG AA de `--color-text-secondary` sobre `--color-surface-cream`
  e de todo texto sobre `--color-brand-ink`/`--color-brand-ink-deep` — calculado com a fórmula de
  luminância relativa do WCAG (não estimado): texto-secundário sobre creme 4.70:1, sobre
  surface-form 5.40:1; branco/branco-70% sobre brand-ink 9.51:1/5.63:1; sobre brand-ink-deep
  7.03:1; erro sobre surface-form 6.26:1; título sobre surface-form 9–12:1. Todos passam AA
  (4.5:1), a maioria passa AAA (7:1)
- [x] T037 [P] Confirmar `:focus-visible` visível em todo elemento interativo (login, shell, botões)
  navegando só por teclado — regra global em `src/index.css`, aplicada a todo elemento focável;
  não há CSS em nenhum componente que sobrescreva `outline` para remover isso
- [ ] T038 Rodar os 9 cenários de `quickstart.md` manualmente contra o backend real (não mockado),
  documentando o resultado — **não realizado nesta sessão**: extensão Claude in Chrome não conectada
  neste ambiente, sem acesso a navegador para inspeção visual real. Confirmado só o que dá para
  confirmar sem navegador: `pnpm run build` compila, servidor dev responde HTTP 200 com o HTML/
  título/fontes corretos, e os 25 testes automatizados (Vitest) cobrem o comportamento de cada um
  dos 9 cenários isoladamente. **Pré-requisito real antes de `/fechar-spec` declarar a spec
  funcional de ponta a ponta** — precisa ser feito numa sessão com navegador disponível.
- [x] T039 [P] `apps/web/README.md` — instruções de setup (`pnpm install`, `pnpm dev`, geração de
  tipos via T007/T009, variável `VITE_API_URL`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — começa imediatamente.
- **Foundational (Phase 2)**: depende do Setup — bloqueia todas as user stories.
- **US1 (Phase 3)**: depende só do Foundational.
- **US2 (Phase 4)**: depende do Foundational; `RotaProtegida`/`rotas.tsx` (T027/T030) também
  precisam de `TelaLogin` (T022, US1) existir como destino do redirect — por isso US2 vem depois de
  US1 nesta ordem de execução, mesmo ambas sendo P1.
- **US3 (Phase 5)**: depende do Foundational (T014) e de `useSessao` (T020, US1); testável de forma
  independente das telas de US2 (basta ter alguma rota autenticada para navegar).
- **Polish (Phase 6)**: depende de US1+US2+US3 completas.

### Parallel Opportunities

- Setup: T003–T008 em paralelo entre si (arquivos/dependências independentes).
- Foundational: T010, T012, T013 em paralelo (T011 depende de T010; T014/T015 depois).
- Testes de cada user story ([P] dentro da fase) em paralelo entre si.
- US3 pode ser desenvolvida em paralelo com US2 depois que Foundational + US1 terminarem (ambas só
  dependem de US1, não uma da outra) — ordem sequencial aqui é só a ordem de prioridade sugerida.

## Implementation Strategy

**MVP**: Setup → Foundational → US1 (login funcional, mesmo sem shell de verdade) → validar
independentemente (cenários 1–3, 8 do quickstart) antes de seguir para US2.

**Entrega incremental**: US1 → US2 → US3 → Polish, cada uma validada contra o `quickstart.md` antes
de avançar — mesma disciplina de "uma task, um commit, suíte rodando antes do commit" que o projeto
já usa nas specs de backend (`CLAUDE.md`).
