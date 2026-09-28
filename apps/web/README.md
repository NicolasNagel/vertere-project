# Vertere Lab — Frontend Web

Frontend (SPA) do Vertere Lab: React 19 + Vite + TypeScript, consumindo a API já existente em
`apps/api`. Primeira spec deste app: `specs/011-autenticacao-web/` (login + shell autenticado com
navegação por papel).

## Setup

```powershell
pnpm install
```

Configure a URL da API (copie `.env.example` para `.env.local`, ambos na raiz de `apps/web`):

```
VITE_API_URL=http://localhost:8000
```

Com o backend rodando localmente (`apps/api`, `uv run uvicorn vertere_api.main:app`), gere os tipos
TypeScript a partir do OpenAPI:

```powershell
pnpm run gerar-tipos-api
```

Isso escreve `src/api/tipos.gerados.ts` — **nunca edite esse arquivo à mão**; regenere sempre que o
contrato da API mudar.

## Rodando localmente

```powershell
pnpm dev
```

Abre em `http://localhost:5173` (ou a próxima porta livre).

## Testes

```powershell
pnpm test        # roda uma vez (vitest run)
pnpm test:watch  # modo watch
```

## Build

```powershell
pnpm build
```

## Design system

Paleta, tipografia e componentes base (`src/ui/`) herdados de
[`github.com/NicolasNagel/vertere-lab`](https://github.com/NicolasNagel/vertere-lab) (versão
anterior deste mesmo produto) — ver `specs/011-autenticacao-web/research.md` para a decisão
completa e as melhorias de acessibilidade aplicadas sobre a referência original.

## Estrutura

Pastas por feature de domínio (`src/autenticacao/`, `src/shell/`), espelhando o padrão já usado no
backend (`auth/`, `pacientes/`, ...). `src/api/` e `src/ui/` são as únicas pastas técnica-
transversais — ver `specs/011-autenticacao-web/plan.md` → Project Structure.
