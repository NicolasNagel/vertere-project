# Implementation Plan: Tela de Exames & Precificação (Web)

**Branch**: `spec/s13-exames-precificacao-web` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-exames-precificacao-web/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Substituir o placeholder `TelaEmConstrucao` da seção "Exames" por uma tela real com duas
sub-seções — catálogo de Exames e Regras de Plantão — em `apps/web`, consumindo os endpoints já
existentes de S5 (`/exames`, `/regras-plantao`) via o cliente HTTP genérico já existente
(`requisitar<T>` em `clienteHttp.ts`) e os tipos já gerados em `tipos.gerados.ts`. Nenhuma mudança
de backend: contratos, autorização (`Acao.EXAME_*`/`Acao.REGRA_PLANTAO_*`) e regras de negócio
(preço-base/valor adicional monetário, janela de horário cruzando meia-noite) já existem e são
apenas consumidos. Segue os mesmos padrões já estabelecidos em S11 (roteamento por
`itensDeNavegacao`, sessão via `SessaoContext`) e S12 (módulo por domínio com `*Api.ts` + `use*.ts`
+ `Tela*.tsx` + `Formulario*.tsx`) — com uma diferença de S12: controles de escrita
(cadastrar/editar/inativar/reativar) são visíveis só ao papel `admin`, não a todo `staff`, porque
`Acao.EXAME_GERENCIAR`/`Acao.REGRA_PLANTAO_GERENCIAR` restringem a admin no backend (diferente de
`Acao.CLINICA_GERENCIAR`/`Acao.VETERINARIO_GERENCIAR`, que S12 tratava como implicitamente
liberadas a todo `staff` autorizado a acessar a rota).

## Technical Context

**Language/Version**: TypeScript 6.0 (frontend), React 19.2

**Primary Dependencies**: React Router 8 (rotas já existentes), cliente HTTP interno
(`apps/web/src/api/clienteHttp.ts`), tipos gerados a partir do OpenAPI
(`apps/web/src/api/tipos.gerados.ts` — `ExameResponse`, `CriarExameRequest`, `EditarExameRequest`,
`RegraPlantaoResponse`, `CriarRegraPlantaoRequest`, `EditarRegraPlantaoRequest` já existem, gerados
do backend S5) — nenhuma dependência nova

**Storage**: N/A nesta feature — persistência é 100% no backend existente (PostgreSQL via S5), o
frontend não guarda estado de domínio fora da sessão do componente

**Testing**: Vitest + `@testing-library/react` + `@testing-library/user-event` (mesmo stack de
`useClinicas.test.ts`/`TelaClinicas.test.tsx`); testes de componente com fetch mockado, sem
servidor real

**Target Platform**: Navegador web (SPA servida por Vite/`apps/web`)

**Project Type**: Web application — feature é só frontend (`apps/web`); backend (`apps/api`, S5) já
existe e não é modificado

**Performance Goals**: Sem meta numérica nova; segue o padrão implícito de SPA já em uso (resposta
percebida imediata em listagem de dezenas de registros, sem paginação — ver Assumptions da spec)

**Constraints**: Reaproveitar integralmente o controle de acesso do shell (S11) para o nível de
navegação (papel `admin`/`atendente`/`tecnico` vê a seção "Exames") e refletir na UI, sem duplicar
lógica de decisão, as duas restrições mais finas do backend (S5) que não existiam em S12: leitura
de regra de plantão restrita a `admin`/`atendente` (não `tecnico`) e toda escrita (ambas entidades)
restrita a `admin`; identificadores/UI em português (Princípio III da constituição)

**Scale/Scope**: 1 seção de navegação (`/exames`, com sub-seções de Exame e Regra de Plantão), 4
user stories, ~10-14 componentes/arquivos novos (lista + formulário + hooks de dados por entidade,
mais um componente de abas/seções para organizar as duas dentro da mesma tela), sem paginação

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Regra de Ouro)**: N/A direto — feature não envolve IA; a tela apenas exibe/edita
  valores monetários (`preco_base`, `valor_adicional`) já validados e calculados pelo backend, sem
  nenhum cálculo de precificação no frontend. PASS.
- **Princípio II (`authorize()` centralizado)**: feature não introduz checagem de permissão nova no
  backend — reaproveita `RotaProtegida`/`itensDeNavegacao` para o nível de navegação e, dentro da
  tela, oculta controles de escrita/leitura fina com base no `papel` já disponível via
  `SessaoContext` (mesmo padrão que `RotaProtegida` já usa para decidir acesso a rota, aplicado
  agora a controles dentro de uma tela — não é um novo mecanismo de autorização, é o mesmo espelhado
  em granularidade menor). A decisão real de permitir/negar continua inteiramente no backend via
  `exigir_acao(Acao.EXAME_GERENCIAR | EXAME_VER | REGRA_PLANTAO_GERENCIAR | REGRA_PLANTAO_VER)`; a
  UI só evita mostrar um controle que o backend rejeitaria, não substitui a checagem. PASS.
- **Princípio III (Domínio em Português)**: todo componente, hook, arquivo e rótulo de UI desta
  feature em português, seguindo `TelaClinicas.tsx`/`FormularioClinica.tsx`. PASS (a verificar na
  implementação).
- **Princípio IV (Seam de teste na camada mais alta possível)**: a seam natural é o hook de dados
  por entidade (`useExames`/`useRegrasPlantao`), testável com fetch mockado, mesmo padrão de
  `useClinicas.test.ts`. Componentes de tela testados por cima disso (Testing Library), sem
  reimplementar cobertura de regra de negócio já testada no backend (S5, incluindo
  `calcular_adicional_plantao` e janela cruzando meia-noite). PASS.
- **Princípio V (Spec como fonte de verdade)**: este plano decorre diretamente de `spec.md`; tasks
  serão geradas por `/speckit-tasks` e fechamento por `/fechar-spec` antes do PR. PASS.

Nenhuma violação a justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/013-exames-precificacao-web/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command) — N/A, ver nota abaixo
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

Sem `contracts/`: o contrato HTTP consumido por esta feature já existe e está publicado em
`apps/api` (S5) e espelhado em `apps/web/src/api/tipos.gerados.ts` (gerado do OpenAPI). Esta
feature não expõe nenhuma interface nova a terceiros — é puramente um consumidor, mesma decisão já
tomada em S12.

### Source Code (repository root)

```text
apps/web/src/
├── exames/
│   ├── examesApi.ts             # chamadas HTTP tipadas: listar (categoria/apenas_ativos), criar,
│   │                             # editar, inativar/reativar exame
│   ├── useExames.ts             # hook de estado/carregamento (seam de teste principal)
│   ├── useExames.test.ts
│   ├── regrasPlantaoApi.ts      # chamadas HTTP tipadas: listar (apenas_ativos), criar, editar,
│   │                             # inativar/reativar regra de plantão
│   ├── useRegrasPlantao.ts
│   ├── useRegrasPlantao.test.ts
│   ├── TelaExames.tsx           # tela com as duas sub-seções (catálogo + regras de plantão),
│   │                             # cada uma com sua lista + ação de abrir formulário
│   ├── TelaExames.test.tsx
│   ├── FormularioExame.tsx      # formulário de criar/editar exame, só renderizado para admin
│   ├── FormularioExame.test.tsx
│   ├── FormularioRegraPlantao.tsx
│   └── FormularioRegraPlantao.test.tsx
├── shell/itensDeNavegacao.ts     # `implementado: true` para Exames
├── rotas.tsx                     # roteia /exames para TelaExames, em vez de TelaEmConstrucao
└── ui/                            # reaproveita Botao.tsx, CampoTexto.tsx já existentes; nenhuma
                                    # primitiva nova esperada (mesmo padrão de lista/formulário de
                                    # S12)
```

**Structure Decision**: mesma decisão de S12 — sem `backend/`/`frontend/` separados porque o
repositório já usa `apps/api` + `apps/web` como estrutura de monorepo fixa (ADR-0001/0002); esta
feature só adiciona código em `apps/web/src/exames/`, um único módulo de pasta cobrindo as duas
entidades coesas (`Exame`, `RegraPlantao`) da mesma forma que o backend já as agrupa no mesmo
módulo `exames` em S5 — não duas pastas separadas, para não fragmentar o que o próprio backend já
trata como uma unidade de domínio.

## Complexity Tracking

*Sem violações da Constitution Check — seção não aplicável.*
