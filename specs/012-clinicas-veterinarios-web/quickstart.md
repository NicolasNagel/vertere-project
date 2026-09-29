# Quickstart: Telas de Clínicas e Veterinários (Web)

Guia para validar a feature de ponta a ponta depois da implementação. Não substitui a suíte
automatizada (`vitest` no frontend, `pytest` no backend) — é o roteiro manual de confirmação visual
que a suíte não cobre.

## Pré-requisitos

- Backend rodando localmente: `cd apps/api && uv run uvicorn vertere_api.main:app --reload`
  (porta padrão `:8000`).
- Banco com ao menos um usuário `admin` (ou `atendente`/`tecnico`) já cadastrado — reaproveitar o
  seed/setup já usado para validar a S11 (login).
- Frontend rodando localmente: `cd apps/web && pnpm dev` (porta padrão `:5173`, consumindo
  `VITE_API_URL` apontando para `:8000`).
- Tipos atualizados se o contrato do backend mudou: `cd apps/web && pnpm gerar-tipos-api` (com o
  backend já rodando) — não deveria ser necessário nesta spec, já que S2/S3 não mudam.

## Cenário 1 — Cadastrar e listar clínica (User Story 1)

1. Login como `admin` (ou `atendente`/`tecnico`) em `/login`.
2. Abrir "Clínicas" no menu.
3. Confirmar que a lista carrega (vazia ou com clínicas já existentes no banco de dev).
4. Cadastrar uma clínica nova com CNPJ válido e não duplicado.
5. **Esperado**: a clínica aparece na lista sem recarregar a página.
6. Repetir o cadastro com o mesmo CNPJ.
7. **Esperado**: mensagem de erro específica de CNPJ duplicado, clínica não duplicada na lista.

## Cenário 2 — Editar, inativar e reativar clínica (User Story 2)

1. Na lista de clínicas, editar o telefone de uma clínica existente.
2. **Esperado**: telefone atualizado aparece na lista.
3. Inativar essa clínica.
4. **Esperado**: status muda para "inativa" na lista (sem desaparecer da listagem).
5. Reativar a mesma clínica.
6. **Esperado**: status volta para "ativa".
7. Alterar o prazo de pagamento da clínica para um valor diferente.
8. **Esperado**: novo prazo refletido na lista/detalhe.

## Cenário 3 — Cadastrar e filtrar veterinário (User Story 3)

Pré-condição: ao menos uma clínica ativa cadastrada (Cenário 1).

1. Abrir "Veterinários" no menu.
2. Cadastrar um veterinário novo com CRMV válido, vinculado à clínica do Cenário 1.
3. **Esperado**: veterinário aparece na lista, vinculado à clínica escolhida.
4. Filtrar a lista pela clínica do Cenário 1.
5. **Esperado**: só veterinários dessa clínica aparecem.
6. Tentar cadastrar um veterinário com CRMV vazio.
7. **Esperado**: mensagem de erro específica, veterinário não criado.

## Cenário 4 — Editar, inativar e reativar veterinário (User Story 4)

1. Editar o telefone de um veterinário existente.
2. **Esperado**: telefone atualizado aparece na lista.
3. Inativar esse veterinário.
4. **Esperado**: status muda para "inativo" na lista.
5. Reativar o mesmo veterinário.
6. **Esperado**: status volta para "ativo".

## Cenário 5 — Sessão expirada durante uso (Edge Case)

1. Com a tela de Clínicas ou Veterinários aberta, forçar expiração de sessão (ex: invalidar o token
   manualmente ou aguardar expiração, conforme já testável na S11).
2. Disparar uma ação que faça requisição (ex: cadastrar clínica).
3. **Esperado**: comportamento idêntico ao handler global de sessão expirada já validado na S11 —
   redirecionamento para login, sem tela quebrada.

## Papéis não autorizados

1. Login como `clinica`.
2. **Esperado**: "Clínicas" e "Veterinários" (rotas `/clinicas`, `/veterinarios`) não aparecem no
   menu nem são acessíveis por URL direta — reaproveita `RotaProtegida` (S11), sem checagem nova.
