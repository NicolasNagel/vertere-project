# CLAUDE.md — Sistema de Gestão Laboratorial Veterinária
**Projeto:** Vertere Lab · Transformação de planilha → aplicação web  
**Versão:** 1.0 · Abril 2026  

---

## Visão geral do projeto

Transformação da planilha `PLANILHA_DE_CONTROLE_2026_VERTERE_LAB` em uma aplicação web estruturada para gestão laboratorial veterinária. O sistema substitui controles manuais em planilha por uma solução com integridade de dados, automação de regras de negócio e rastreabilidade completa dos atendimentos.

**Stack recomendada**

- Backend: Node.js + Fastify (ou NestJS) + PostgreSQL
- Frontend: React + TypeScript + TailwindCSS
- ORM: Prisma
- Auth: JWT com refresh token
- Infra: Docker + Railway (ou Render) para MVP

---

## Modelo de dados

### Tabelas e relacionamentos

```sql
-- clinicas
CREATE TABLE clinicas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       VARCHAR(200) NOT NULL,
  cnpj       VARCHAR(18) NOT NULL UNIQUE,
  endereco   TEXT,
  telefone   VARCHAR(20),
  email      VARCHAR(100),
  status     VARCHAR(10) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- veterinarios
CREATE TABLE veterinarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id),
  nome       VARCHAR(200) NOT NULL,
  crmv       VARCHAR(20) NOT NULL UNIQUE,
  telefone   VARCHAR(20),
  email      VARCHAR(100),
  status     VARCHAR(10) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- exames (catálogo)
CREATE TABLE exames (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      VARCHAR(150) NOT NULL,
  descricao TEXT,
  valor     NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
  status    VARCHAR(10) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo'))
);

-- atendimentos
CREATE TABLE atendimentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo        VARCHAR(20) NOT NULL UNIQUE,   -- ex: 2026-0001
  numero           INTEGER NOT NULL,
  ano              INTEGER NOT NULL,
  clinica_id       UUID NOT NULL REFERENCES clinicas(id),
  veterinario_id   UUID NOT NULL REFERENCES veterinarios(id),
  especie          VARCHAR(50),
  sexo             VARCHAR(1) CHECK (sexo IN ('M','F')),
  tipo_atendimento VARCHAR(100),
  valor_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (numero, ano)
);

-- atendimento_exames (N:N)
CREATE TABLE atendimento_exames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  UUID NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  exame_id        UUID NOT NULL REFERENCES exames(id),
  valor           NUMERIC(10,2) NOT NULL,
  UNIQUE (atendimento_id, exame_id)
);

-- índices de performance
CREATE INDEX idx_vet_clinica   ON veterinarios(clinica_id);
CREATE INDEX idx_atd_clinica   ON atendimentos(clinica_id);
CREATE INDEX idx_atd_vet       ON atendimentos(veterinario_id);
CREATE INDEX idx_atd_exame     ON atendimento_exames(atendimento_id);
CREATE INDEX idx_atd_created   ON atendimentos(created_at DESC);
```

### Regras críticas do banco

- `protocolo` é gerado pelo backend no formato `YYYY-NNNN` (ex: `2026-0001`), nunca pelo cliente.
- `valor_total` é sempre recalculado como `SUM(atendimento_exames.valor)` ao salvar — nunca recebe valor direto do frontend.
- `veterinario_id` deve pertencer à mesma `clinica_id` do atendimento (validado na API).

---

## Arquitetura da API

### Rotas

```
GET    /clinicas                  → lista com paginação
POST   /clinicas                  → cria clínica
GET    /clinicas/:id              → detalhe
PATCH  /clinicas/:id              → atualiza
PATCH  /clinicas/:id/status       → ativa/inativa

GET    /veterinarios              → lista (filtro: ?clinica_id=)
POST   /veterinarios              → cria (clinica_id obrigatório)
GET    /veterinarios/:id          → detalhe
PATCH  /veterinarios/:id          → atualiza

GET    /exames                    → catálogo ativo
POST   /exames                    → cria exame
PATCH  /exames/:id                → atualiza

GET    /atendimentos              → lista com filtros (clinica, vet, data, protocolo)
POST   /atendimentos              → cria atendimento + exames (transação)
GET    /atendimentos/:id          → detalhe completo
PATCH  /atendimentos/:id          → atualiza (recalcula valor_total)

GET    /relatorios/receita        → receita por período
GET    /relatorios/volume         → volume por clínica e veterinário
```

### Motor de regras — geração de protocolo

```typescript
// src/services/protocolo.service.ts
async function gerarProtocolo(ano: number, trx: Transaction): Promise<string> {
  // SELECT com lock para evitar concorrência
  const { rows } = await trx.query(`
    SELECT COALESCE(MAX(numero), 0) + 1 AS proximo
    FROM atendimentos
    WHERE ano = $1
    FOR UPDATE
  `, [ano]);
  
  const numero = rows[0].proximo;
  const protocolo = `${ano}-${String(numero).padStart(4, '0')}`;
  return protocolo;
}
```

O lock `FOR UPDATE` garante unicidade mesmo com requisições simultâneas.

### Transação de criação de atendimento

```typescript
// Toda criação de atendimento é uma transação única:
// 1. Gerar protocolo (com lock)
// 2. Inserir atendimento com valor_total = 0
// 3. Inserir atendimento_exames com o valor snapshot de cada exame
// 4. Recalcular e UPDATE valor_total
// 5. Commit
```

O valor de cada exame é copiado (`snapshot`) no momento do atendimento para que alterações futuras no catálogo não afetem atendimentos passados.

---

## Plano de desenvolvimento

### Fase 1 — Fundação (semanas 1–2)

**Objetivo:** banco rodando, API esqueleto, CI configurado.

- [ ] Criar repositório monorepo (`/apps/api`, `/apps/web`, `/packages/shared`)
- [ ] Configurar Docker Compose (PostgreSQL + API)
- [ ] Rodar migrations SQL (5 tabelas + índices)
- [ ] Seed com dados de teste (3 clínicas, 5 vets, 10 exames)
- [ ] Esqueleto do Fastify com health check
- [ ] Configurar ESLint, Prettier, Husky
- [ ] Pipeline CI básico (lint + typecheck)

**Entregável:** `GET /health` retorna 200 com conexão ao banco confirmada.

---

### Fase 2 — CRUD dos cadastros (semanas 3–4)

**Objetivo:** módulos de Clínicas, Veterinários e Exames funcionais.

- [ ] CRUD completo de Clínicas (com validação de CNPJ)
- [ ] CRUD completo de Veterinários (FK obrigatória + validação de CRMV)
- [ ] CRUD do catálogo de Exames
- [ ] Validações com Zod em todos os endpoints
- [ ] Testes unitários das validações
- [ ] Testes de integração: CNPJ duplicado, CRMV duplicado, vet sem clínica

**Entregável:** cadastros operacionais via curl/Insomnia.

---

### Fase 3 — Núcleo: atendimentos (semanas 5–6)

**Objetivo:** módulo central do sistema funcionando com todas as regras.

- [ ] `POST /atendimentos` com transação completa
  - geração de protocolo (lock)
  - snapshot de valores dos exames
  - cálculo automático de `valor_total`
- [ ] `GET /atendimentos` com filtros e paginação
- [ ] `PATCH /atendimentos/:id` com recálculo de `valor_total`
- [ ] Validação: `veterinario_id` pertence à `clinica_id` informada
- [ ] Testes: protocolo único, valor correto, múltiplos exames

**Entregável:** criação de atendimento com protocolo `2026-NNNN` e valor calculado.

---

### Fase 4 — Frontend: telas de cadastro (semanas 7–8)

**Objetivo:** interfaces de Clínicas, Veterinários e Exames.

- [ ] Setup React + Vite + TypeScript + TailwindCSS
- [ ] Componentes base: DataTable, Form, Modal, Badge, Toast
- [ ] Tela: lista de Clínicas (busca + status)
- [ ] Tela: formulário de Clínica
- [ ] Tela: lista de Veterinários (filtro por clínica)
- [ ] Tela: formulário de Veterinário (dropdown de clínica)
- [ ] Tela: catálogo de Exames

**Entregável:** cadastros acessíveis via browser.

---

### Fase 5 — Frontend: atendimentos (semana 9)

**Objetivo:** tela principal do sistema.

- [ ] Tela: lista de atendimentos (protocolo, clínica, vet, valor, data)
- [ ] Tela: formulário de atendimento
  - dropdown de clínica → filtra dropdown de veterinário
  - checklist de exames com soma em tempo real
  - `valor_total` calculado localmente antes de salvar
- [ ] Exibição do protocolo gerado após salvar
- [ ] Filtros: por clínica, veterinário, período

**Entregável:** fluxo completo de registro de atendimento.

---

### Fase 6 — Relatórios (semana 10)

**Objetivo:** visibilidade gerencial.

- [ ] Endpoint: receita por período (agrupado por mês)
- [ ] Endpoint: volume por clínica
- [ ] Endpoint: volume por veterinário
- [ ] Tela: painel de relatórios com gráficos simples
- [ ] Exportação CSV

**Entregável:** gestores conseguem ver receita e volume sem abrir planilha.

---

### Fase 7 — Testes e qualidade (semana 11)

**Objetivo:** cobertura dos casos críticos mapeados.

**Casos de teste obrigatórios:**

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 1 | Criar clínica com dados válidos | HTTP 201 + id gerado |
| 2 | CNPJ duplicado | HTTP 409 |
| 3 | Inativar clínica | status = inativo |
| 4 | Criar veterinário sem clinica_id | HTTP 422 |
| 5 | CRMV duplicado | HTTP 409 |
| 6 | Criar atendimento com 3 exames | valor_total = soma dos 3 |
| 7 | Protocolo do 1º atendimento do ano | `2026-0001` |
| 8 | Protocolo do 2º atendimento | `2026-0002` |
| 9 | Dois atendimentos simultâneos | protocolos únicos (sem race condition) |
| 10 | Vet não pertence à clínica | HTTP 422 |
| 11 | Editar exames do atendimento | valor_total recalculado |
| 12 | Exame inativo não aparece na seleção | filtrado corretamente |

---

### Fase 8 — Deploy e migração (semana 12)

**Objetivo:** sistema em produção com dados reais.

- [ ] Configurar ambiente de produção (Railway ou Render)
- [ ] Variáveis de ambiente documentadas no `.env.example`
- [ ] Script de migração dos dados da planilha para o banco
- [ ] Checklist de go-live
- [ ] Treinamento operacional básico (15 min)

**Script de migração da planilha:**

```typescript
// scripts/migrate-from-sheet.ts
// 1. Ler CSV exportado da planilha
// 2. Deduplicate clínicas por nome
// 3. Inserir clínicas → mapear IDs
// 4. Inserir veterinários com clinica_id
// 5. Inserir exames do catálogo
// 6. Inserir atendimentos históricos com protocolo preservado
// Rodar em transação, com rollback em caso de erro
```

---

## Estrutura de diretórios recomendada

```
vertere-lab/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── clinicas/
│   │   │   │   ├── veterinarios/
│   │   │   │   ├── exames/
│   │   │   │   ├── atendimentos/
│   │   │   │   └── relatorios/
│   │   │   ├── services/
│   │   │   │   └── protocolo.service.ts
│   │   │   ├── db/
│   │   │   │   └── migrations/
│   │   │   └── main.ts
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── api/
│       └── package.json
├── packages/
│   └── shared/          ← tipos TypeScript compartilhados
├── docker-compose.yml
├── .env.example
└── CLAUDE.md            ← este arquivo
```

---

## Variáveis de ambiente

```env
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/vertere_lab
JWT_SECRET=troque-por-secret-forte
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

---

## Decisões de arquitetura registradas

| Decisão | Motivo |
|---------|--------|
| Snapshot do valor do exame em `atendimento_exames.valor` | Alterações futuras no catálogo não afetam histórico |
| Lock `FOR UPDATE` na geração de protocolo | Garante unicidade mesmo com concorrência |
| `valor_total` calculado no backend, nunca aceito do frontend | Evita inconsistência e manipulação |
| UUID como PK em todas as tabelas | Facilita migração de dados e futura integração |
| Veterinário validado contra clínica no atendimento | Integridade de negócio que o banco não garante sozinho |

---

## Contexto para Claude

Este arquivo descreve o sistema completo. Ao trabalhar neste projeto:

1. Sempre validar `veterinario_id` contra `clinica_id` antes de salvar um atendimento.
2. Nunca aceitar `valor_total` do frontend — sempre recalcular no backend.
3. Gerar `protocolo` dentro de uma transação com `SELECT ... FOR UPDATE`.
4. O valor de cada exame em `atendimento_exames.valor` é um snapshot — copiar de `exames.valor` no momento da criação.
5. Ao listar veterinários num dropdown de atendimento, filtrar apenas os ativos e da clínica selecionada.
6. Ao listar exames para seleção, filtrar apenas os com `status = 'ativo'`.
