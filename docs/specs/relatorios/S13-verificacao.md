# Verificação — S13

**Veredito**: ❌ BLOQUEADA
**Data**: 2026-10-01 (2ª verificação; a 1ª, de 2026-09-30, também bloqueou e gerou a Phase 8)
**Testes**: `pnpm test` em `apps/web` (vitest run): 24 arquivos, **164 passed, 0 failed**.
Também rodados: `pnpm lint` (oxlint, 0 erros, 4 warnings, nenhum novo desde a 1ª verificação; o
único em código da S13 é `useColecaoCrud.ts:34` `set-state-in-effect`, o mesmo padrão de
`useClinicas.ts`/`useVeterinarios.ts`) e `pnpm build` (`tsc -b && vite build`, limpo).
Tentativa de cobertura: `pnpm exec vitest run --coverage src/exames src/api/useColecaoCrud.test.ts`
falhou com `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'` (ver Pendências).

Spec: `specs/013-exames-precificacao-web/{spec.md,plan.md,tasks.md}` (via `docs/specs.md`, linha S13).
Nenhuma instrução adicional do autor foi passada nesta invocação, só o código `S13`.

## Tasks

- 48 tasks em `tasks.md`, todas `[X]`. A branch tem commit `s13` para cada uma, ou para um grupo
  declarado (ex.: `T013-T014`, `T037-T040`). Phase 8 (T041-T048) tem um commit por task, com teste
  falho antes da implementação (T041→T042, T043→T044, T045→T046, T047→T048).
- **Phase 8, conferida no código**:
  - T042: select "Filtrar por categoria" e checkbox "Apenas ativos" em `CatalogoDeExames`.
  - T044: checkbox "Apenas ativas" em `RegrasDePlantao`.
  - T046: "Nenhum exame encontrado." e "Nenhuma regra de plantão encontrada.", suprimidos quando
    há `erro`.
  - T048: validação `Number(valor) > 0` no `aoSubmeter` dos dois formulários, com `role="alert"`.
    O `min="0.01"` foi removido.
  - Todos com testes em `TelaExames.test.tsx`, `FormularioExame.test.tsx` e
    `FormularioRegraPlantao.test.tsx`, que cobrem `0` e `-5`.
- T017/T018, T033/T034 e T036 ("já implementado em T009/T026/T028") estão confirmadas: prop
  `exame?`/`regra?` com prefill, testes de modo edição e ações por linha em `LinhaRegraPlantao`.
- **T039**, remarcada `[X]` no commit `ef691b8`, que só altera `tasks.md`. Não dá para auditar um
  percurso manual pelo diff. Por isso refiz os 6 cenários na UI real nesta verificação (ver
  "Funcional de ponta a ponta"). O resultado bate com o que a task descreve, então a marcação
  agora é verdadeira.
- **T038 marcada `[X]` sem evidência possível.** A task pede "Rodar `pnpm --dir apps/web test`
  **com cobertura visível** para `apps/web/src/exames/` e `apps/web/src/api/useColecaoCrud.ts`"
  (Princípio IV da constituição). Os motivos:
  - `apps/web` não tem provider de cobertura instalado. `@vitest/coverage-v8` e
    `@vitest/coverage-istanbul` aparecem no lockfile só como peer opcional do vitest e não estão
    em `package.json` nem em `node_modules/@vitest/`.
  - `pnpm test` é `vitest run`, sem `--coverage`.
  - O commit `7ac524b`, que marcou a task, não registra número de cobertura nenhum.

  Ou seja: a cobertura não pode ter sido vista, e o checklist afirma o contrário.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| US1 | Listar e cadastrar exames: leitura para os 3 papéis, escrita só admin, filtros por categoria e "apenas ativos" | Atendida | `TelaExames.tsx::CatalogoDeExames` (filtros nas linhas 112-132, estado vazio em 148-151), `FormularioExame.tsx`, `useExames.ts`, `examesApi.ts`; T004-T012, T041/T042, T045-T048. Exercitada na UI real (Cenário 1). |
| US2 | Editar, inativar e reativar exame (só admin) | Atendida | `LinhaExame` (gate `podeGerenciar = papel === 'admin'`), `useExames.editar/inativar/reativar` via `executarAcaoSobreItem`, `examesApi.*`; T013-T020. Exercitada na UI real (Cenário 2). |
| US3 | Listar e cadastrar regras de plantão: leitura admin/atendente, escrita só admin, aceita cruzar meia-noite, filtro "apenas ativas" | Atendida | `TelaExames.tsx::RegrasDePlantao` + abas (`podeVerRegrasPlantao`), `FormularioRegraPlantao.tsx`, `useRegrasPlantao.ts`, `regrasPlantaoApi.ts`; T021-T028, T043/T044. Exercitada na UI real (Cenário 3). |
| US4 | Editar, inativar e reativar regra de plantão (só admin) | Atendida | `LinhaRegraPlantao`, `useRegrasPlantao.editar/inativar/reativar`, `regrasPlantaoApi.*`; T029-T036. Exercitada na UI real (Cenário 4). |

Cruzamento com os Functional Requirements (controles contados na tela renderizada, não só no hook):

- **FR-001**: atendido. `itensDeNavegacao.ts` tem `implementado: true` e `rotas.tsx` mapeia
  `/exames` para `TelaExames`. Na tela real não aparece mais placeholder.
- **FR-002**: atendido. A tela mostra categoria, nome, preço-base e status, mais o select de
  categoria e o checkbox "Apenas ativos". As duas requisições foram observadas no log do backend
  (`?apenas_ativos=false&categoria=Hematologia`, troca direta para `VerifS13b`, `apenas_ativos=true`).
- **FR-003, FR-004, FR-005**: atendidos.
- **FR-006**: atendido. A tela mostra dia, horário, valor e status, mais o checkbox "Apenas ativas".
- **FR-007, FR-008, FR-009**: atendidos. Quarta-feira 21:30-03:15 foi aceita na UI.
  `0 = Segunda-feira` bate com `datetime.weekday()` do backend.
- **FR-010**: atendido. Com papel `clinica`, `/exames` mostra "Acesso negado" e o item não aparece
  no menu. Com `tecnico`, não existe a aba "Regras de Plantão".
- **FR-011**: atendido. Atendente e técnico não veem "Novo exame", "Nova regra" nem a coluna Ações.
  Os controles são ocultados, não desabilitados.
- **FR-012**: atendido para os casos que o backend sinaliza (404). Valor não positivo é tratado no
  formulário com mensagem específica. Para observação: um 422 com lista do FastAPI ainda cairia
  cru em `extrairDetalheErro`, mas a validação do formulário torna esse caminho praticamente
  inalcançável.

## Seam de teste

A seam do plan (Princípio IV) são os hooks `useExames`/`useRegrasPlantao` sobre `useColecaoCrud`,
testados com a API mockada. Eles cobrem:

- carregamento;
- criação;
- edição, inativação e reativação;
- 404 com mensagem específica;
- fallback de erro;
- re-listagem ao mudar filtro.

`useColecaoCrud.test.ts` tem 7 casos. A lacuna apontada na 1ª verificação foi fechada: filtros e
estado vazio agora também são testados em `TelaExames.test.tsx`, na camada de tela, e não só no
hook. A validação de valor não positivo é testada com `0` e com valor negativo, conferindo a
mensagem em `role="alert"`. A seam está adequada.

O que falta é a cobertura **visível**, que a constituição e a T038 exigem (ver Pendências).

## Out of Scope

Não há scope creep:

- Nenhuma alteração em `apps/api`. O achado de `schemas.py` sem `gt=0` ficou só registrado.
- Nenhuma exclusão definitiva, busca textual ou paginação.
- Nenhum uso de `calcular_adicional_plantao`.
- `useClinicas.ts`/`useVeterinarios.ts` não foram tocados.
- `package.json` está fora do diff.

## ADRs

Aderente a ADR-0001/0002: React + Vite + TypeScript, `pnpm`, vitest/Testing Library, cliente HTTP
interno e tipos gerados do OpenAPI (`tipos.gerados.ts`). Nenhuma dependência nova. Identificadores
e rótulos estão em português.

## Descobertas

`spec.md` → "Descobertas" registra que o backend S5 não valida `preco_base`/`valor_adicional`
positivos nem `categoria`/`nome` vazios. Nada foi implementado no backend sem decisão do PO,
o que está correto. O item continua aberto para decisão do usuário.

No banco de dev existe um exame "Teste / Exame Negativo" com preço `-10.00` e **ativo**, criado
via API na sessão de implementação. Ele aparece no catálogo real. É efeito colateral de dev, não
defeito da S13, mas vale inativá-lo.

## Funcional de ponta a ponta

Ambiente desta verificação:

- Postgres `vertere_postgres_dev` já estava rodando.
- `uvicorn` em `:8000` e `vite` em `:5173`, iniciados e encerrados nesta sessão.
- Chrome real via extensão Claude in Chrome.
- Sessões dos 4 usuários de teste: token obtido por `POST /auth/login` + `GET /auth/me` contra o
  backend local e injetado em `sessionStorage['vertere:sessao']`. O formulário de login não foi
  percorrido nesta verificação; ele já é coberto pela S11.

Resultado por cenário do `quickstart.md`:

1. **Cenário 1 (admin)**:
   - Preço-base `-3` mostra "Preço-base deve ser maior que zero." e nenhum `POST` sai.
   - `77.50` gera `POST /exames` 201, e o exame "VerifS13c / Exame UI verif" aparece na lista sem
     reload. A categoria nova também entra no select.
2. **Cenário 2**:
   - Edição inline para `88.10` gera `PATCH` 200, e o valor é atualizado na linha.
   - Inativar mostra "Inativo", e o exame continua listado. Reativar volta para "Ativo".
3. **Cenário 3**:
   - Valor `-20` mostra "Valor adicional deve ser maior que zero.".
   - Quarta-feira 21:30-03:15 com `35.75` é aceita e aparece sem reload.
   - Atendente vê a aba com as 5 regras, sem "Nova regra" e sem Ações.
   - Técnico só vê a aba "Catálogo de Exames", com a lista e sem controles de escrita.
4. **Cenário 4**:
   - Editar o valor para `41.20` reflete na lista.
   - Inativar mostra "Inativa", reativar mostra "Ativa".
   - "Apenas ativas" filtra corretamente (3 regras ativas).
5. **Cenário 5**:
   - Com token inválido no carregamento, `/exames` dá 401 e a tela volta para `/login` com "Sua
     sessão expirou. Faça login novamente.".
   - Também testei o token invalidado depois da tela carregada, seguido de clique em "Inativar":
     a tela foi para `/login` com a mesma mensagem.
6. **Papéis não autorizados**: com `clinica`, o menu só tem Pacientes, Atendimentos e Laudos
   (portal), e `/exames` por URL mostra "Acesso negado. Você não tem permissão para ver esta
   seção.".

Filtros na UI real:

- Select de categoria: Hematologia, depois troca direta para VerifS13b, depois "Todas".
- "Apenas ativos" esconde os inativos.

O estado vazio não foi reproduzido no navegador, porque não há combinação de filtro que gere lista
vazia com os dados atuais. Ele foi confirmado por leitura de código e pelos testes de T045.

Efeitos colaterais no banco de dev: exame "VerifS13c / Exame UI verif" (88.10) e regra
Quarta-feira 21:30-03:15 (41.20). Os dois foram deixados **inativos** via API ao final. Servidores
encerrados. O container Postgres continua rodando.

## Pendências (se bloqueada)

1. **T038 marcada `[X]` sem cobertura visível. A cobertura não pode ser gerada no estado atual do
   repositório.**
   - **Onde**: `specs/013-exames-precificacao-web/tasks.md` (T038) e `apps/web/package.json`.
   - **Situação**: a T038 e o Princípio IV da constituição exigem rodar a suíte "com cobertura
     visível" para `apps/web/src/exames/` e `apps/web/src/api/useColecaoCrud.ts`. Em `apps/web`
     não há provider de cobertura instalado: `vitest run --coverage` falha com
     `MISSING DEPENDENCY @vitest/coverage-v8`. O checklist afirma algo que não aconteceu e não
     podia acontecer.
   - **O que fazer**: escolher uma das saídas.
     - (a) Adicionar `@vitest/coverage-v8` como devDependency de `apps/web`. É ferramenta de
       teste, sem impacto de runtime, mas é decisão de tooling e precisa de OK explícito do
       usuário, porque `package.json` hoje está fora do diff da spec. Depois, rodar
       `pnpm exec vitest run --coverage` restrito aos arquivos da S13 e registrar os números na
       própria T038.
     - (b) Com decisão explícita do usuário, reescrever a T038 para o que de fato foi feito (suíte
       verde, sem cobertura) e registrar a divergência com o Princípio IV. A mesma lacuna existe
       na T039 da S12 (já entregue), então vale tratar em `spec.md` → "Descobertas" como item de
       harness.

   Esta é a única pendência. Todos os FRs, as 4 user stories, os 6 cenários do quickstart (agora
   exercitados na UI real) e as pendências 1-5 da 1ª verificação foram confirmados agora.

Observações que não bloqueiam (registradas para o `/code-review`):

- A linha de edição usa `colSpan={4}` numa tabela de 5 colunas quando `podeGerenciar`.
- Os formulários não têm "Cancelar": uma vez aberto, o formulário só fecha salvando.
- `aoSalvar` fecha o formulário antes do resultado da API. Em erro, o usuário perde o que digitou.
- Valores monetários aparecem crus (`88.10`), sem formatação BRL.
- `categoria`/`nome` só com espaços passam pelo `required` e o backend aceita.
- Com um filtro ativo, criar um exame de outra categoria, ou inativar um exame com "Apenas ativos"
  marcado, mantém o item na lista até a próxima listagem, porque o estado local não reaplica o
  filtro.
- `CatalogoDeExames` chama `setCategoriasConhecidas` durante o render (padrão de estado derivado).
  Funciona, mas vale olhar no review.
