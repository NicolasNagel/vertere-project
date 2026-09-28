# Implementation Plan: Autenticação e Shell Autenticado do Frontend

**Branch**: `spec/s11-frontend-web` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-autenticacao-web/spec.md`

## Summary

Primeiro código de `apps/web` do projeto: tela de login contra `POST /auth/login` (S1), shell
autenticado com navegação renderizada a partir das mesmas `Acao` que o backend já concede por papel,
e interceptação de `401` para encerrar sessão e voltar ao login. Abordagem técnica: SPA em
React + Vite + TypeScript, tipos de API gerados do OpenAPI do FastAPI (nunca escritos à mão, por
convenção do projeto), sessão guardada em `sessionStorage`, roteamento com guard de papel client-side
que só existe para não *oferecer* navegação inválida — a autoridade de acesso continua 100% no
backend (`authorize()`), replicando no frontend a Regra de Ouro do projeto.

## Technical Context

**Language/Version**: TypeScript 6.x sobre React 19 (versão instalada pelo scaffold atual do Vite —
corrigido de "React 18" na primeira redação deste plano), Node.js 20+ para tooling (build/test).

**Primary Dependencies**:
- `react` + `react-dom` — já fixado em `CLAUDE.md`.
- `vite` — bundler/dev server, já fixado em `CLAUDE.md`.
- `react-router` (v6+) — roteamento client-side; escolhido por ser o padrão de facto para SPA React
  e o único ponto do plano que precisa de um roteador (nada na spec pede algo mais pesado, ex:
  meta-framework com SSR — não há requisito de SEO/SSR para um sistema interno atrás de login).
- `openapi-typescript` (dev dependency) — gera tipos TypeScript a partir do schema OpenAPI que o
  FastAPI já expõe em `/openapi.json`, para nunca escrever à mão o formato de `PacienteResponse`,
  `LaudoResponse`, etc. (mesmo espírito do Princípio III da constitution: contratos gerados, não
  reescritos). Cliente HTTP fino por cima (`fetch` nativo), sem biblioteca de data-fetching (React
  Query etc.) nesta spec — o volume de chamadas de login/shell não justifica cache/invalidação
  sofisticados ainda; reavaliar quando uma spec futura precisar de fato de cache entre telas.
- Estilo: **sem framework de utilitário** — tokens de design (`:root { --color-*; --font-* }`) +
  um arquivo CSS por componente, herdados de `github.com/NicolasNagel/vertere-lab` (versão anterior
  do mesmo produto, indicada pelo usuário como referência de marca) e refinados com práticas de
  acessibilidade que o mock original (HTML estático) não precisava resolver. Revisão de uma decisão
  anterior desta mesma spec (Tailwind + Radix) — ver `research.md` para o antes/depois completo e a
  justificativa da mudança.

**Storage**: `sessionStorage` do navegador para o token de sessão (não `localStorage`) — decisão de
segurança: encerra automaticamente ao fechar a aba/navegador, reduzindo a janela de um token
vazado por XSS continuar válido indefinidamente, e ainda satisfaz FR-002 (sobreviver a um refresh
de página, já que `sessionStorage` persiste entre reloads da mesma aba). N/A para dados de negócio —
esta spec não introduz nenhuma persistência além da sessão.

**Testing**: Vitest (nativo do ecossistema Vite, mesma configuração de build) + React Testing Library
para os componentes/telas, seguindo o Princípio IV da constitution (seam de teste na camada mais
alta possível): a lógica de "quais itens de menu aparecem para qual papel" e "o que acontece com um
401" vive em funções/hooks puros, testáveis sem renderizar árvore de componentes — os testes de
componente cobrem só a integração final (US1–US3), não a lógica de decisão em si.

**Target Platform**: navegador desktop evergreen (Chrome/Edge/Firefox recentes) como alvo primário —
uso interno do laboratório + usuários de clínicas parceiras em computador de escritório; responsivo
o suficiente para tablet (ambiente de bancada de laboratório), sem alvo mobile-first nesta spec.

**Project Type**: Web application — frontend (`apps/web`) consumindo a API já existente
(`apps/api`), mesmo monorepo do projeto.

**Performance Goals**: carregamento inicial da tela de login abaixo de 2s em banda larga típica
(alinhado a SC-001: shell visível em até 3s incluindo a chamada de login); sem meta de alta
concorrência — é um sistema interno com dezenas de usuários simultâneos, não milhares.

**Constraints**: nenhum tipo `any`/objeto solto cruzando a fronteira com a API — os tipos vêm do
OpenAPI gerado, mesma disciplina de contrato que o backend já aplica com Pydantic (Constitution,
seção "Stack Tecnológico e Contratos"). Nomes de domínio (componentes, hooks, rotas visíveis ao
usuário) em português, seguindo o Princípio III; nomes de infraestrutura genérica de biblioteca
(ex: hooks utilitários sem significado de domínio) podem seguir a convenção usual do ecossistema
React quando não há termo de domínio correspondente.

**Scale/Scope**: esta spec entrega 2 telas reais (login, shell com navegação) + N placeholders "em
construção" para as seções ainda não implementadas (Clínicas, Veterinários, Pacientes, Exames,
Atendimentos, Laudos, Financeiro, Usuários) — cada uma delas vira conteúdo de verdade em uma spec
futura própria, reaproveitando o mesmo shell.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Regra de Ouro)**: N/A direto — esta spec não introduz nenhuma IA. Nenhuma decisão
  financeira/clínica é tomada no frontend; toda leitura vem de endpoints já existentes. **PASS**.
- **Princípio II (Autorização centralizada em `authorize()`)**: o shell decide o que *mostrar* no
  menu (FR-004) e bloqueia navegação direta por papel (FR-005), mas isso é conveniência de UX, não
  uma segunda fonte de verdade de autorização — qualquer chamada à API continua sendo validada pelo
  backend de verdade, e o frontend nunca decide sozinho se uma ação é permitida além de "vale a pena
  oferecer o link". **PASS**, com a ressalva documentada explicitamente no código (comentário na
  função que deriva o menu a partir do papel, apontando para `auth/service.py::_PERMISSOES` como a
  fonte real).
- **Princípio III (Domínio em português)**: nomes de componentes/telas/rotas em português (ver
  Technical Context → Constraints). **PASS**.
- **Princípio IV (Seam de teste na camada mais alta possível)**: lógica de menu-por-papel e de
  tratamento de 401 isolada em funções/hooks puros testáveis sem DOM. **PASS**.
- **Princípio V (Especificação como fonte de verdade)**: este plano é gerado a partir de
  `spec.md` via `/speckit-plan`, dentro do fluxo já decidido para S11+. **PASS**.

Nenhuma violação — não há necessidade de preencher "Complexity Tracking".

## Project Structure

### Documentation (this feature)

```text
specs/011-autenticacao-web/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md        # Fase 1 (/speckit-plan)
├── quickstart.md        # Fase 1 (/speckit-plan)
└── tasks.md             # Fase 2 (/speckit-tasks — ainda não gerado)
```

Sem `contracts/`: esta spec consome a API já existente (contrato dela já vive em `apps/api`, gerado
via OpenAPI) e não expõe nenhuma interface nova para outros consumidores — não há contrato próprio
para documentar aqui.

### Source Code (repository root)

```text
apps/web/                          # novo — primeiro código de frontend do projeto
├── src/
│   ├── main.tsx                   # bootstrap React + Router
│   ├── App.tsx                    # composição raiz (Router + Provider de sessão)
│   ├── index.css                  # tokens de design (:root --color-*/--font-*), herdados de vertere-lab
│   ├── autenticacao/
│   │   ├── TelaLogin.tsx           # US1 — layout de painel duplo (marca + formulário)
│   │   ├── tela-login.css
│   │   ├── PainelMarca.tsx         # painel esquerdo (logo, slogan, círculos decorativos)
│   │   ├── painel-marca.css
│   │   ├── useSessao.ts            # hook: estado de sessão (token, papel), login(), sair()
│   │   ├── useSessao.test.ts
│   │   └── clienteAuth.ts          # POST /auth/login + GET /auth/me em sequência (login não retorna papel, ver data-model.md)
│   ├── shell/
│   │   ├── ShellAutenticado.tsx    # US2 — layout + menu
│   │   ├── shell-autenticado.css
│   │   ├── itensDeNavegacao.ts     # US2 — mapa papel -> itens de menu (dado puro, testável)
│   │   ├── itensDeNavegacao.test.ts
│   │   ├── RotaProtegida.tsx       # US2/FR-005 — guarda de rota por papel
│   │   └── TelaEmConstrucao.tsx    # FR-008 — placeholder por seção
│   ├── ui/
│   │   ├── Botao.tsx               # variantes primário/secundário/ghost (mesmos tokens do vertere-lab)
│   │   ├── botao.css
│   │   ├── CampoTexto.tsx          # <label>+<input> acessível com ícone opcional
│   │   └── campo-texto.css
│   ├── api/
│   │   ├── clienteHttp.ts          # fetch fino + interceptação de 401 (US3/FR-007)
│   │   └── tipos.gerados.ts        # gerado por `openapi-typescript` a partir de /openapi.json — NUNCA editado à mão
│   ├── assets/
│   │   ├── vertere-logo-white.png  # reaproveitado de vertere-lab/assets/features (mesma marca)
│   │   └── vertere-mark.png
│   └── rotas.tsx                   # definição de rotas + associação a itensDeNavegacao
├── index.html                      # inclui as fontes (Big Shoulders Display, Cormorant Garamond, Manrope, JetBrains Mono) via Google Fonts
├── vite.config.ts
├── tsconfig.json
├── package.json                    # pnpm, conforme CLAUDE.md
└── tests/
    └── setup.ts                    # config do Testing Library/Vitest
```

**Structure Decision**: monorepo existente ganha `apps/web/` ao lado de `apps/api/` (mesmo padrão
`apps/<nome>` já usado pelo backend). Dentro de `apps/web/src/`, pastas por *feature* de domínio
(`autenticacao/`, `shell/`) em vez de pastas por *tipo técnico* (`components/`, `pages/` genéricos)
— mesma filosofia do backend (`auth/`, `pacientes/`, `laudos/`, cada um com seu `service.py`/
`domain.py`), para que a mesma pessoa navegando o backend reconheça a organização do frontend.
`api/` e `ui/` são as únicas pastas técnica-transversais: cliente HTTP e tipos gerados
(`api/`) são infraestrutura compartilhada por todas as features futuras, e os componentes de
interface genéricos sem significado de domínio (`Botao`, `CampoTexto`) vivem em `ui/` porque vão ser
reutilizados por toda spec de frontend futura, não só por esta.

## Complexity Tracking

*Sem violações do Constitution Check — seção não aplicável nesta spec.*
