# Implementation Plan: Telas de Clínicas e Veterinários (Web)

**Branch**: `spec/s12-clinicas-veterinarios-web` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-clinicas-veterinarios-web/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Substituir o placeholder `TelaEmConstrucao` por telas reais de listagem/CRUD de Clínicas e
Veterinários em `apps/web`, consumindo os endpoints já existentes de S2 (`/clinicas`) e S3
(`/veterinarios`) via o cliente HTTP genérico já existente (`requisitar<T>` em `clienteHttp.ts`).
Nenhuma mudança de backend: contratos, autorização (`Acao.CLINICA_*`/`Acao.VETERINARIO_*`) e regras
de negócio (CNPJ, CRMV, prazo de pagamento, ativo/inativo) já existem e são apenas consumidos.
Segue exatamente os padrões já estabelecidos na S11 (roteamento por `itensDeNavegacao`, sessão via
`SessaoContext`, handler de sessão expirada) — esta é a primeira feature a de fato ligar uma tela
de conteúdo a esse shell.

## Technical Context

**Language/Version**: TypeScript 6.0 (frontend), React 19.2

**Primary Dependencies**: React Router 8 (rotas já existentes), cliente HTTP interno
(`apps/web/src/api/clienteHttp.ts`, wrapper fino de `fetch`), tipos gerados a partir do OpenAPI
(`apps/web/src/api/tipos.gerados.ts`) — nenhuma dependência nova (sem lib de formulário/estado; o
projeto usa hooks nativos do React, seguindo o padrão já em `TelaLogin.tsx`)

**Storage**: N/A nesta feature — persistência é 100% no backend existente (PostgreSQL via S2/S3),
o frontend não guarda estado de domínio fora da sessão do componente

**Testing**: Vitest + `@testing-library/react` + `@testing-library/user-event` (mesmo stack de
`TelaLogin.test.tsx`/`SessaoContext.test.tsx`); testes de componente com fetch mockado, sem servidor
real

**Target Platform**: Navegador web (SPA servida por Vite/`apps/web`)

**Project Type**: Web application — feature é só frontend (`apps/web`); backend (`apps/api`, S2/S3)
já existe e não é modificado

**Performance Goals**: Sem meta numérica nova; segue o padrão implícito de SPA já em uso (resposta
percebida imediata em listagem de dezenas de registros, sem paginação — ver Assumptions da spec)

**Constraints**: Reaproveitar integralmente o controle de acesso por papel do shell (S11) —
nenhuma checagem de permissão nova nesta feature; reaproveitar o handler global de sessão expirada
(`definirHandlerNaoAutorizado`) já conectado em `App.tsx`; identificadores/UI em português (domínio
PT-BR, Princípio III da constituição)

**Scale/Scope**: 2 seções de navegação (`/clinicas`, `/veterinarios`), 4 user stories, ~10-15
componentes/arquivos novos (lista + formulário + hooks de dados por entidade), sem paginação
(volume pequeno assumido no domínio real do laboratório)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Regra de Ouro)**: N/A direto — feature não envolve IA nem cálculo financeiro novo;
  a tela de clínica apenas exibe/edita `prazo_pagamento_dias` já calculado/validado pelo backend.
  PASS.
- **Princípio II (`authorize()` centralizado)**: feature não introduz checagem de permissão nova —
  reaproveita `RotaProtegida`/`itensDeNavegacao` (que já espelham as `Acao` do backend) e o próprio
  backend continua sendo quem decide via `exigir_acao`/`authorize()`. Nenhum `if papel === ...` novo
  no frontend além do que `RotaProtegida` já faz. PASS.
- **Princípio III (Domínio em Português)**: todo componente, hook, arquivo e rótulo de UI desta
  feature em português, seguindo o padrão de `TelaLogin.tsx`/`ShellAutenticado.tsx`. PASS (a
  verificar na implementação).
- **Princípio IV (Seam de teste na camada mais alta possível)**: a seam natural do frontend para
  esta feature é o hook de dados por entidade (ex: `usarClinicas`/`usarVeterinarios`), testável com
  fetch mockado, sem montar o componente de tela inteiro para cada regra — mesmo padrão de
  `clienteAuth.test.ts`. Componentes de tela testados por cima disso (Testing Library), não
  reimplementando a mesma cobertura de regra de negócio (essa já está testada no backend S2/S3).
  PASS.
- **Princípio V (Spec como fonte de verdade)**: este plano decorre diretamente de `spec.md`; tasks
  serão geradas por `/speckit-tasks` e fechamento por `/fechar-spec` antes do PR. PASS.

Nenhuma violação a justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-clinicas-veterinarios-web/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command) — N/A, ver nota abaixo
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

Sem `contracts/`: o contrato HTTP consumido por esta feature já existe e está publicado em
`apps/api` (S2/S3) e espelhado em `apps/web/src/api/tipos.gerados.ts` (gerado do OpenAPI). Esta
feature não expõe nenhuma interface nova a terceiros — é puramente um consumidor.

### Source Code (repository root)

```text
apps/web/src/
├── clinicas/
│   ├── clinicasApi.ts          # chamadas HTTP tipadas: listar, buscar, criar, editar,
│   │                           # inativar/reativar, definir prazo de pagamento
│   ├── usarClinicas.ts         # hook de estado/carregamento (seam de teste principal)
│   ├── usarClinicas.test.ts
│   ├── TelaClinicas.tsx        # lista + ação de abrir formulário de cadastro/edição
│   ├── TelaClinicas.test.tsx
│   ├── FormularioClinica.tsx   # formulário de criar/editar clínica
│   └── FormularioClinica.test.tsx
├── veterinarios/
│   ├── veterinariosApi.ts      # chamadas HTTP tipadas: listar (com filtro clinica_id), buscar,
│   │                           # criar, editar, inativar/reativar
│   ├── usarVeterinarios.ts
│   ├── usarVeterinarios.test.ts
│   ├── TelaVeterinarios.tsx
│   ├── TelaVeterinarios.test.tsx
│   ├── FormularioVeterinario.tsx
│   └── FormularioVeterinario.test.tsx
├── shell/itensDeNavegacao.ts    # `implementado: true` para Clínicas e Veterinários
├── rotas.tsx                    # roteia /clinicas e /veterinarios para as telas reais,
│                                 # em vez de TelaEmConstrucao
└── ui/                           # reaproveita Botao.tsx, CampoTexto.tsx já existentes;
                                   # nova primitiva de tabela/lista só se não houver equivalente
```

**Structure Decision**: sem `backend/`/`frontend/` separados porque o repositório já usa
`apps/api` + `apps/web` como estrutura de monorepo fixa (ADR-0001/0002); esta feature só adiciona
código em `apps/web/src/{clinicas,veterinarios}/`, seguindo o padrão de módulo-por-domínio já usado
em `apps/web/src/autenticacao/`. Cada domínio (clínicas, veterinários) é uma pasta própria com
API client + hook + tela + formulário + testes, em vez de uma pasta `pages/`/`services/` genérica —
mantém a mesma organização por domínio de negócio que o backend já usa em `apps/api/src/vertere_api/`.

## Complexity Tracking

*Sem violações da Constitution Check — seção não aplicável.*
