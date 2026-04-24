# Feature: Relatório de Fechamento

## Visão geral

Relatório gerencial que consolida atendimentos por empresa e período, exportável para Excel (.xlsx). Substitui o controle manual em planilha para fechamento quinzenal/mensal com clínicas parceiras.

---

## Estrutura do relatório

Cada linha representa **um atendimento**. Exames de plantão (categoria `Plantão`) são agregados na coluna `Adicional` em vez de aparecer como linha separada.

| Coluna | Origem |
|--------|--------|
| Clínica | `clinicas.nome` |
| Data | `atendimentos.created_at` |
| Protocolo | `atendimentos.protocolo` |
| Veterinário | `veterinarios.nome` |
| Paciente | `atendimentos.nome_animal` |
| Espécie | `atendimentos.especie` |
| Proprietário | `atendimentos.nome_proprietario` |
| Tipo de Exame | `STRING_AGG(exames.categoria)` excluindo Plantão |
| Exame | `STRING_AGG(exames.nome)` excluindo Plantão |
| Tipo | `Normal` ou `Plantão` (derivado da presença de exame de plantão) |
| Valor | Soma dos exames excluindo plantão |
| Desconto | `atendimentos.desconto` (padrão 0) |
| Adicional | Soma dos exames de plantão |
| Valor Total | `atendimentos.valor_total` |

**Totais ao final:** Valor Bruto (soma Valor), Adicionais (soma Adicional), Valor Total (soma Valor Total).

---

## Filtros

| Parâmetro | Tipo | Obrigatório |
|-----------|------|-------------|
| `clinica_id` | UUID | Sim |
| `data_inicio` | YYYY-MM-DD | Sim |
| `data_fim` | YYYY-MM-DD | Sim |

Os filtros de clínica e período já existem no módulo de atendimentos — reutilizados diretamente.

---

## Arquitetura

### Banco de dados — Migration 005

Adiciona coluna `desconto` em `atendimentos`:

```sql
ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS desconto NUMERIC(10,2) NOT NULL DEFAULT 0;
```

Desconto é registrado por atendimento (não por exame individual), o que reflete a prática real do laboratório.

### Backend — novo endpoint

```
GET /relatorios/fechamento?clinica_id=&data_inicio=&data_fim=
```

**Arquivo:** `apps/api/src/modules/relatorios/relatorios.routes.ts`

Query SQL com `GROUP BY atendimento` e `STRING_AGG` para nomes de exames. Exames de categoria `Plantão` são separados para compor a coluna `adicional`.

**Resposta:**
```json
{
  "rows": [...],
  "totais": {
    "valor_bruto": 10508.00,
    "adicionais": 1220.00,
    "valor_total": 11728.00
  }
}
```

### Frontend — seção Fechamento

**Arquivo:** `apps/web/src/pages/RelatoriosPage.tsx`

Nova seção abaixo dos relatórios existentes com:
- Dropdown de clínica (carrega lista ativa)
- Date pickers de período
- Botão **Gerar** → dispara query
- Tabela de preview com todos os 14 campos
- Botão **Exportar Excel** → gera `.xlsx` no browser via `xlsx` (SheetJS)

**Biblioteca:** `xlsx` instalada em `apps/web` — geração 100% client-side, sem endpoint extra para download.

---

## Como executar localmente

```bash
# 1. Rodar a migration
cd apps/api
npm run migrate   # ou: npx ts-node src/db/migrate.ts

# 2. Subir a API
npm run dev

# 3. Subir o frontend
cd apps/web
npm run dev

# 4. Testar o endpoint diretamente
curl "http://localhost:3000/relatorios/fechamento?clinica_id=<UUID>&data_inicio=2026-04-01&data_fim=2026-04-30"
```

---

## Casos de teste

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 1 | Período sem atendimentos | `rows: []`, totais zerados |
| 2 | Atendimento sem plantão | `tipo = Normal`, `adicional = 0` |
| 3 | Atendimento com plantão | `tipo = Plantão`, `adicional > 0` |
| 4 | Atendimento com múltiplos exames | nomes concatenados com ` + ` |
| 5 | Desconto > 0 | `valor_total = valor + adicional - desconto` |
| 6 | Filtro por clínica | retorna apenas atendimentos daquela clínica |
| 7 | Export Excel | arquivo `.xlsx` baixado com header + dados + totais |

---

## Decisões de design

| Decisão | Motivo |
|---------|--------|
| Uma linha por atendimento (não por exame) | Corresponde à estrutura da planilha original e ao fluxo de fechamento |
| Exame de Plantão vira "Adicional" | No relatório original, plantão nunca aparece como linha — é uma taxa sobre o atendimento |
| Export client-side com `xlsx` | Sem streaming no servidor, sem tipo de conteúdo extra; dados já estão no cache do React Query |
| `desconto` em `atendimentos`, não em `atendimento_exames` | Desconto é concedido sobre o atendimento inteiro, não por exame individual |
