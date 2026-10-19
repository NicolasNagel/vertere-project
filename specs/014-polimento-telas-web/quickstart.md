# Quickstart: Polimento das Telas Web de Cadastro (S12/S13) e Validação de Valores de Exames

Roteiro manual de validação ponta a ponta, **na UI real (navegador)** e na API real. Não substitui
as suítes automatizadas (`pytest` em `apps/api`, `vitest` em `apps/web`). As lições da S12 e da S13
valem aqui: cada FR de tela se confere contando os controles visíveis, não só as chamadas HTTP.

## Pré-requisitos

- Postgres de dev (`vertere_postgres_dev`, porta 5434) no ar, com migrations em `head`.
- Backend: `cd apps/api && uv run uvicorn vertere_api.main:app --port 8000`.
- Frontend: `cd apps/web && pnpm dev` (porta 5173).
- Usuários de teste já existentes no banco de dev: `teste.admin`, `teste.atendente`,
  `teste.tecnico` e `teste.clinica@vertere.com.br` (credenciais em `handoff.md`).
- A sessão vive no `sessionStorage` da aba: navegue pelo menu depois do login.

## Cenário 1: formulário não perde o que foi digitado (US1, FR-001 a FR-004, FR-019)

Repetir em **cada uma** das quatro telas (Clínicas, Veterinários, Catálogo de Exames, Regras de
Plantão), como `admin`:

1. Abrir "Novo/Nova …", preencher, desligar o backend (parar o `uvicorn`), clicar "Salvar".
2. **Esperado**: formulário continua aberto, com os mesmos valores, e mostra "Não foi possível falar
   com o servidor. Tente novamente." dentro do formulário.
3. Religar o backend, clicar "Salvar" de novo. **Esperado**: formulário fecha e o item aparece na
   lista.
4. Abrir de novo, alterar campos e clicar "Cancelar". **Esperado**: fecha e nada é criado.
5. Abrir "Editar" de um item, mudar um campo, "Cancelar", abrir "Editar" de novo. **Esperado**: o
   formulário mostra os dados atuais, sem a alteração descartada.
6. Em Clínicas e Veterinários: com o formulário de edição aberto, **esperado**: a linha ocupa a
   largura toda da tabela (FR-019).
7. Clicar "Salvar" duas vezes rápido num cadastro válido. **Esperado**: um só item criado.

## Cenário 2: erros visíveis e legíveis (US2, FR-005 a FR-008)

1. Com o backend desligado, abrir Clínicas e depois Veterinários. **Esperado**: mensagem de falha de
   conexão, não "lista vazia" (tabela só com cabeçalho).
2. Com o backend no ar, cadastrar pela tela uma clínica com e-mail `teste@exemplo` (sem domínio de
   topo). O navegador aceita, mas o `EmailStr` do backend recusa com um 422 do Pydantic. **Esperado
   na tela**: mensagem em português citando o campo "E-mail", sem JSON. Não pode aparecer "CNPJ
   inválido", que é o que a S12 mostra hoje. Repetir em Veterinários: não pode aparecer "A clínica
   selecionada não existe mais".
3. Provocar um 404 (inativar pela tela um item apagado ou inativado por outra sessão). **Esperado**:
   a mensagem específica de "não encontrado" continua como antes.
4. Erro 500: difícil de provocar sem mexer no backend. Validado pelo teste automatizado de
   `mensagemDeErroPadrao` (corpo `Internal Server Error` → "Problema no servidor…").

## Cenário 3: servidor rejeita valores inválidos (US3, FR-009 a FR-012)

Direto pela API (curl com token de `admin`):

1. `POST /exames` com `preco_base: -10`, depois `0`. **Esperado**: 422 `Preço-base deve ser maior
   que zero.`; `GET /exames` não mostra nada novo.
2. `POST /exames` com `nome: "   "`. **Esperado**: 422 `Nome não pode ficar vazio.`
3. `POST /exames` com `categoria: "  Hematologia  "`. **Esperado**: 201, resposta com
   `"categoria": "Hematologia"`.
4. `POST /regras-plantao` com `valor_adicional: 0`. **Esperado**: 422 `Valor adicional deve ser
   maior que zero.`
5. `PATCH` do exame legado "Exame Negativo" (-10,00) mudando só o nome. **Esperado**: 422 (o preço
   inválido precisa ser corrigido). `POST /exames/{id}/inativar` dele: **esperado** 200.
6. Na tela, editar "Exame Negativo" mantendo -10: **esperado** a validação local do formulário
   barra antes de enviar ("Preço-base deve ser maior que zero.").

## Cenário 4: lista coerente com os filtros (US4, FR-013, FR-014)

Como `admin`, na tela de Exames:

1. Marcar "Apenas ativos", inativar um exame. **Esperado**: ele sai da lista.
2. Filtrar categoria "Hematologia", cadastrar um exame de categoria "Bioquímica". **Esperado**:
   não aparece na lista, e aparece o aviso "Cadastro salvo. Ele não aparece na lista por causa dos
   filtros ativos."
3. Com o filtro de categoria ativo, editar um exame trocando a categoria. **Esperado**: ele sai da
   lista.
4. Repetir 1 em Regras de Plantão ("Apenas ativas"), Clínicas ("Apenas ativas") e Veterinários
   ("Apenas ativos").

## Cenário 5: valores em reais (US5, FR-015)

1. Catálogo de Exames e Regras de Plantão: **esperado** todo valor como "R$ 50,00", "R$ 1.234,50".
2. Editar um preço para `40`. **Esperado**: "R$ 40,00" logo depois de salvar.

## Cenário 6: cada papel vê só o que pode fazer (US6, FR-016, FR-017)

| Tela | admin | atendente | tecnico |
|---|---|---|---|
| Clínicas | lista + filtros + Nova/Editar/Inativar/Reativar/prazo | lista + busca + filtro, **sem** escrita | igual atendente |
| Veterinários | lista + filtros + Novo/Editar/Inativar/Reativar | lista + busca + filtros, **sem** escrita | igual atendente |
| Exames (catálogo) | tudo | lista + filtros, sem escrita | igual atendente |
| Exames (aba Regras) | tudo | lista + filtro, sem escrita | aba **não aparece** |

Para cada célula, confirmar também que nenhum botão visível devolve "Não autorizado" ao ser
clicado.

## Cenário 7: suíte estável (US7, FR-018)

```bash
cd apps/web
for i in $(seq 1 10); do pnpm test 2>&1 | grep -E "Tests "; done
```

**Esperado**: 10 linhas, todas com `0 failed` (ou sem "failed"), e o número de testes igual nas 10.
Conferir também que nenhum teste foi marcado `.skip`/`.todo` e que nenhum `timeout` por teste foi
aumentado para mascarar a lentidão (research.md, Decisão 7).
