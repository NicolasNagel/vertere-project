# Quickstart: Tela de Exames & Precificação (Web)

Guia para validar a feature de ponta a ponta depois da implementação. Não substitui a suíte
automatizada (`vitest` no frontend, `pytest` no backend) — é o roteiro manual de confirmação visual
que a suíte não cobre.

## Pré-requisitos

- Backend rodando localmente: `cd apps/api && uv run uvicorn vertere_api.main:app --reload`
  (porta padrão `:8000`).
- Banco com ao menos um usuário `admin`, um `atendente` e um `tecnico` já cadastrados (para validar
  as 3 combinações de visibilidade por papel) — reaproveitar o seed/setup já usado para S11/S12.
- Frontend rodando localmente: `cd apps/web && pnpm dev` (porta padrão `:5173`, consumindo
  `VITE_API_URL` apontando para `:8000`).
- Tipos já atualizados: `ExameResponse`/`RegraPlantaoResponse`/etc. já existem em
  `apps/web/src/api/tipos.gerados.ts` (gerados a partir de S5) — não deveria ser necessário rodar
  `pnpm gerar-tipos-api` nesta spec, já que S5 não muda.

## Cenário 1 — Cadastrar e listar exame (User Story 1)

1. Login como `admin` em `/login`.
2. Abrir "Exames" no menu, sub-seção "Catálogo de Exames" (ou equivalente).
3. Confirmar que a lista carrega (vazia ou com exames já existentes no banco de dev).
4. Cadastrar um exame novo (ex: categoria "Hematologia", nome "Hemograma completo", preço-base
   "50.00").
5. **Esperado**: o exame aparece na lista sem recarregar a página.
6. Tentar cadastrar um exame com preço-base "0" ou negativo.
7. **Esperado**: mensagem de erro específica, exame não criado.
8. Logout, login como `atendente` (ou `tecnico`), abrir "Exames".
9. **Esperado**: a lista aparece normalmente, mas nenhum botão de cadastrar/editar/inativar/
   reativar exame é visível.

## Cenário 2 — Editar, inativar e reativar exame (User Story 2)

1. Como `admin`, editar o preço-base de um exame existente.
2. **Esperado**: preço atualizado aparece na lista.
3. Inativar esse exame.
4. **Esperado**: status muda para "inativo" na lista (sem desaparecer da listagem).
5. Reativar o mesmo exame.
6. **Esperado**: status volta para "ativo".

## Cenário 3 — Cadastrar e listar regra de plantão (User Story 3)

1. Como `admin`, abrir a sub-seção "Regras de Plantão" dentro de "Exames".
2. Cadastrar uma regra nova com plantão cruzando a meia-noite (ex: sexta-feira, início "18:00",
   fim "06:00", valor adicional "50.00").
3. **Esperado**: a regra aparece na lista sem recarregar a página, sem erro de validação (o
   backend aceita `hora_fim < hora_inicio`).
4. Tentar cadastrar uma regra com valor adicional negativo.
5. **Esperado**: mensagem de erro específica, regra não criada.
6. Logout, login como `atendente`, abrir "Exames" → "Regras de Plantão".
7. **Esperado**: a lista aparece (leitura liberada), sem botões de escrita.
8. Logout, login como `tecnico`, abrir "Exames".
9. **Esperado**: a sub-seção "Regras de Plantão" não aparece nem é acessível (reflete
   `Acao.REGRA_PLANTAO_VER`, que não inclui `tecnico`).

## Cenário 4 — Editar e inativar regra de plantão (User Story 4)

1. Como `admin`, editar o valor adicional de uma regra existente.
2. **Esperado**: valor atualizado aparece na lista.
3. Inativar essa regra.
4. **Esperado**: status muda para "inativa" na lista.
5. Reativar a mesma regra.
6. **Esperado**: status volta para "ativa".

## Cenário 5 — Sessão expirada durante uso (Edge Case)

1. Com a tela de Exames aberta, forçar expiração de sessão (mesmo mecanismo já validado em S11/S12).
2. Disparar uma ação que faça requisição (ex: cadastrar exame).
3. **Esperado**: comportamento idêntico ao handler global de sessão expirada — redirecionamento
   para login, sem tela quebrada.

## Papéis não autorizados

1. Login como `clinica`.
2. **Esperado**: "Exames" (rota `/exames`) não aparece no menu nem é acessível por URL direta —
   reaproveita `RotaProtegida` (S11), sem checagem nova.
