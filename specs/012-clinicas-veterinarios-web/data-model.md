# Data Model: Telas de Clínicas e Veterinários (Web)

Esta feature não cria nem altera modelo de dados no backend — as entidades já existem em S2
(Clínicas) e S3 (Veterinários). Este documento mapeia os tipos já gerados em
`apps/web/src/api/tipos.gerados.ts` (a partir do OpenAPI do backend) para o que as telas exibem e
editam, e as transições de estado relevantes para a UI.

## Clínica

Fonte: `ClinicaResponse` / `CriarClinicaRequest` / `EditarClinicaRequest`
(`apps/api/src/vertere_api/clinicas/schemas.py`, `router.py`).

| Campo | Tipo | Editável na UI | Origem da validação |
|-------|------|----------------|----------------------|
| `id` | `string` | não (gerado no cadastro) | backend |
| `nome` | `string` | sim (criar e editar) | backend (obrigatório) |
| `cnpj` | `string` | só no cadastro, imutável depois | backend (`CnpjInvalido`, `CnpjJaCadastrado`) |
| `endereco` | `string` | sim (criar e editar) | backend |
| `telefone` | `string` | sim (criar e editar) | backend |
| `email` | `string` | sim (criar e editar) | backend |
| `ativo` | `boolean` | não editado direto — via ações "Inativar"/"Reativar" | backend |
| `prazo_pagamento_dias` | `number` | sim, via ação própria ("Definir prazo de pagamento") | backend |

**Transições de estado** (`ativo`):
- `ativa → inativa` via `POST /clinicas/{id}/inativar`
- `inativa → ativa` via `POST /clinicas/{id}/reativar`
- Nenhuma exclusão definitiva (fora de escopo, ver Assumptions da spec).

## Veterinário

Fonte: `VeterinarioResponse` / `CriarVeterinarioRequest` / `EditarVeterinarioRequest`
(`apps/api/src/vertere_api/veterinarios/schemas.py`, `router.py`).

| Campo | Tipo | Editável na UI | Origem da validação |
|-------|------|----------------|----------------------|
| `id` | `string` | não | backend |
| `nome` | `string` | sim (criar e editar) | backend (obrigatório) |
| `crmv` | `string` | só no cadastro, imutável depois | backend (`CrmvVazio`, `CrmvJaCadastrado`) |
| `telefone` | `string` | sim (criar e editar) | backend |
| `email` | `string` | sim (criar e editar) | backend |
| `clinica_id` | `string` | só no cadastro, imutável depois | backend (`ClinicaInexistente`) |
| `ativo` | `boolean` | não editado direto — via ações "Inativar"/"Reativar" | backend |

**Transições de estado** (`ativo`):
- `ativo → inativo` via `POST /veterinarios/{id}/inativar`
- `inativo → ativo` via `POST /veterinarios/{id}/reativar`
- Nenhuma exclusão definitiva.

**Relacionamento**: todo `Veterinario` referencia exatamente uma `Clinica` (`clinica_id`), imutável
após o cadastro. A tela de listagem de veterinários oferece filtro por `clinica_id`
(`GET /veterinarios?clinica_id=...`); o formulário de cadastro de veterinário exige selecionar uma
clínica existente entre as retornadas por `GET /clinicas?apenas_ativas=true`.

## Erros mapeados para mensagem de UI (FR-014)

| Erro do backend (HTTP status) | Mensagem de UI |
|---|---|
| `CnpjInvalido` (422) | "CNPJ inválido — verifique o formato informado." |
| `CnpjJaCadastrado` (409) | "Já existe uma clínica cadastrada com esse CNPJ." |
| `ClinicaNaoEncontrada` (404) | "Clínica não encontrada — pode ter sido removida por outra sessão." |
| `CrmvVazio` (422) | "Informe o CRMV do veterinário." |
| `CrmvJaCadastrado` (409) | "Já existe um veterinário cadastrado com esse CRMV." |
| `ClinicaInexistente` (422, ao cadastrar veterinário) | "A clínica selecionada não existe mais — atualize a lista de clínicas." |
| `VeterinarioNaoEncontrado` (404) | "Veterinário não encontrado — pode ter sido removido por outra sessão." |
| `401` (sessão expirada) | delega ao handler global já existente (S11) — sem mensagem própria desta feature |
