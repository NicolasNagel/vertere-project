# ADR-0002: Frameworks e ferramentas do MVP

## Status

Aceito

## Contexto

O ADR-0001 fixou Python no backend e Node.js/TypeScript no frontend. Para começar a implementar a primeira spec (Auth/Usuários, issue #2), era preciso escolher o framework web de cada lado e as ferramentas de suporte (ORM, gerenciador de dependências, testes).

## Decisão

- **Backend web framework**: FastAPI — tipagem via Pydantic, async nativo, gera OpenAPI automaticamente (contrato explícito com o frontend TS), boa integração com LangChain na fase de IA.
- **Frontend framework**: React + Vite — mesmo padrão usado antes da remoção do código anterior; SPA estática, custo de hospedagem baixo.
- **Gerenciador de dependências Python**: `uv` — resolução e instalação rápidas, lockfile determinístico.
- **Banco de dados**: PostgreSQL — mesmo SGBD usado na versão anterior do projeto; atende bem o volume da planilha (milhares de atendimentos) com baixo custo em provedores gerenciados.
- **ORM/migrações**: SQLAlchemy 2.x + Alembic.
- **Testes backend**: `pytest`.
- **Layout**: monorepo com `apps/api` (Python/FastAPI) e `apps/web` (React/Vite/TS), mesma convenção do projeto anterior.

## Consequências

- A seam definida na spec de Auth (`authenticate`/`authorize`) é implementada como funções Python puras, testadas com `pytest` usando um repositório de usuários fake em memória — sem subir FastAPI nem Postgres nos testes desse módulo.
- Autenticação/senha usam hashing via `bcrypt` diretamente (não `passlib`: incompatível com bcrypt 4.x/5.x, projeto sem manutenção ativa). A sessão (JWT ou cookie de sessão) é decisão de implementação do endpoint HTTP, não da seam de domínio, e pode evoluir sem alterar `authenticate`/`authorize`.
- Contrato de API entre `apps/api` e `apps/web` é o schema OpenAPI gerado pelo FastAPI — qualquer mudança de contrato é visível ali.
