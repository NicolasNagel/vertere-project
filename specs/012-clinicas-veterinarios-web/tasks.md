---

description: "Task list template for feature implementation"
---

# Tasks: Telas de Clínicas e Veterinários (Web)

**Input**: Design documents from `specs/012-clinicas-veterinarios-web/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Este projeto exige teste-primeiro (Princípio IV da constituição, `.specify/memory/constitution.md`)
— não são opcionais aqui. Cada task de teste abaixo deve ficar vermelha antes da task de
implementação correspondente deixá-la verde.

**Organization**: Tasks agrupadas por user story (spec.md) para permitir implementação e teste
independentes de cada uma. Cada task concluída é um commit próprio (CLAUDE.md → Convenções),
escopo `s12`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: A qual user story a task pertence (US1, US2, US3, US4)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Frontend puro, dentro de `apps/web/src/` (ver plan.md → Project Structure). Sem mudança em
`apps/api` — S2/S3 já existem e não são tocados.

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança

- [X] T001 Confirmar que `pnpm --dir apps/web test` e `pnpm --dir apps/web lint` passam limpos na
      branch `spec/s12-clinicas-veterinarios-web` antes de qualquer alteração (baseline herdado da
      S11) — nenhum arquivo alterado nesta task, é um gate de partida

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infra compartilhada por Clínicas e Veterinários — nenhuma user story pode ser
considerada completa (rota real funcionando) sem isso

**⚠️ CRITICAL**: T002 e T003 bloqueiam a etapa final ("wire route") de toda user story

- [ ] T002 [P] Criar `apps/web/src/api/erroApi.ts` exportando `extrairDetalheErro(erro: ErroHttp): string`
      — faz `JSON.parse` do corpo de erro que `requisitar` (`clienteHttp.ts`) captura via
      `resposta.text()` (FastAPI retorna `{"detail": "<mensagem>"}` em toda `HTTPException`),
      devolvendo o campo `detail`; se o corpo não for JSON válido ou não tiver `detail`, devolve
      `erro.message` como fallback. Esta função é a base para os dois módulos de domínio
      distinguirem os erros de `data-model.md` (inclusive os dois erros 422 diferentes de
      veterinários, que só se distinguem pelo texto do detalhe, não pelo status)
- [ ] T003 Refatorar `apps/web/src/rotas.tsx` para suportar um componente real por rota: introduzir
      `componentePorRota: Partial<Record<string, ReactNode>>` consultado antes do fallback atual
      `<TelaEmConstrucao titulo={item.rotulo} />` no `.map(itensDeNavegacao)`; nenhuma rota usa o
      mapa ainda (fica vazio), então o comportamento observável não muda nesta task

**Checkpoint**: infraestrutura pronta — cada user story só precisa registrar sua própria entrada em
`componentePorRota` para ligar a tela real.

---

## Phase 3: User Story 1 - Cadastrar e listar clínicas (Priority: P1) 🎯 MVP

**Goal**: acceptance scenarios 1-3 da US1 em spec.md — listar clínicas cadastradas e cadastrar uma
nova, com validação de CNPJ (inválido/duplicado) devolvendo erro específico.

**Independent Test**: logar como admin/atendente/técnico, abrir `/clinicas`, cadastrar uma clínica
com CNPJ válido e vê-la na lista sem reload; repetir com CNPJ já cadastrado e ver mensagem de erro
específica sem duplicar o registro.

### Tests for User Story 1 ⚠️ (escrever e ver falhar antes de implementar)

- [ ] T004 [P] [US1] Escrever testes falhos para `apps/web/src/clinicas/clinicasApi.ts` em
      `apps/web/src/clinicas/clinicasApi.test.ts`, mockando `requisitar` (`../api/clienteHttp`):
      `listarClinicas(apenasAtivas?)` chama `GET /clinicas?apenas_ativas=...`;
      `buscarClinicasPorNome(nome, apenasAtivas?)` chama `GET /clinicas/busca?nome=...`;
      `criarClinica(dados)` chama `POST /clinicas` com o body serializado e repassa `ErroHttp` sem
      capturá-lo (tradução de erro não é responsabilidade desta camada)
- [ ] T005 [P] [US1] Escrever testes falhos para `apps/web/src/clinicas/usarClinicas.ts` em
      `apps/web/src/clinicas/usarClinicas.test.ts`, mockando `clinicasApi.ts`: carregamento inicial
      popula `clinicas`; `criar(dados)` bem-sucedido adiciona a clínica retornada ao estado local
      sem novo `GET`; `criar` com erro HTTP 422 cujo detalhe é sobre CNPJ resulta em
      `erro === "CNPJ inválido — verifique o formato informado."` (data-model.md); `criar` com erro
      HTTP 409 resulta em `erro === "Já existe uma clínica cadastrada com esse CNPJ."`

### Implementation for User Story 1

- [ ] T006 [US1] Implementar `apps/web/src/clinicas/clinicasApi.ts` com `listarClinicas`,
      `buscarClinicasPorNome`, `criarClinica`, usando `requisitar<T>` e os tipos `ClinicaResponse`/
      `CriarClinicaRequest` de `apps/web/src/api/tipos.gerados.ts`, até T004 passar
- [ ] T007 [US1] Implementar `apps/web/src/clinicas/usarClinicas.ts` (hook com
      `clinicas`, `carregando`, `erro`, `recarregar`, `criar`), usando `clinicasApi.ts` e
      `extrairDetalheErro` (T002) para montar as mensagens da tabela de `data-model.md`, até T005
      passar
- [ ] T008 [P] [US1] Escrever testes falhos para `apps/web/src/clinicas/FormularioClinica.tsx` em
      `apps/web/src/clinicas/FormularioClinica.test.tsx`: submissão com todos os campos
      preenchidos chama `aoSalvar` com os valores digitados; submissão com `nome` ou `cnpj` vazio é
      bloqueada pelo próprio formulário (validação HTML nativa `required`, sem chamada a `aoSalvar`)
- [ ] T009 [US1] Implementar `apps/web/src/clinicas/FormularioClinica.tsx` (campos nome, cnpj,
      endereço, telefone, e-mail, reaproveitando `CampoTexto`/`Botao` de `apps/web/src/ui/`), até
      T008 passar
- [ ] T010 [P] [US1] Escrever testes falhos para `apps/web/src/clinicas/TelaClinicas.tsx` em
      `apps/web/src/clinicas/TelaClinicas.test.tsx`, mockando `usarClinicas`: lista renderizada a
      partir do hook; abrir o formulário, cadastrar uma clínica nova e vê-la aparecer na lista sem
      reload; erro de CNPJ duplicado exibido na tela (`role="alert"`, seguindo o padrão de
      `tela-login__erro` em `TelaLogin.tsx`)
- [ ] T011 [US1] Implementar `apps/web/src/clinicas/TelaClinicas.tsx` (lista + botão "Nova
      clínica" que abre `FormularioClinica`, exibindo `erro`/`carregando` do hook), até T010
      passar
- [ ] T012 [US1] Ligar a rota `/clinicas`: em `apps/web/src/shell/itensDeNavegacao.ts` marcar a
      entrada de Clínicas como `implementado: true`; em `apps/web/src/rotas.tsx` registrar
      `<TelaClinicas />` em `componentePorRota` (T003) para a rota `/clinicas`; atualizar
      `apps/web/src/shell/itensDeNavegacao.test.ts` (o teste atual afirma que todos os itens têm
      `implementado === false` — ajustar para afirmar que só Clínicas é `true` nesta task, os
      demais continuam `false`)

**Checkpoint**: US1 completa e testável de forma independente — `/clinicas` lista e cadastra
clínicas de ponta a ponta.

---

## Phase 4: User Story 2 - Editar, inativar e reativar clínica (Priority: P1)

**Goal**: acceptance scenarios 1-4 da US2 — editar dados (exceto CNPJ), inativar/reativar,
alterar prazo de pagamento.

**Independent Test**: abrir uma clínica existente, editar o telefone, inativá-la (status muda na
lista), reativá-la (status volta), e alterar o prazo de pagamento.

### Tests for User Story 2 ⚠️

- [ ] T013 [P] [US2] Estender `apps/web/src/clinicas/clinicasApi.test.ts` com testes falhos para
      `editarClinica(id, dados)` (`PATCH /clinicas/{id}`), `inativarClinica(id)`
      (`POST /clinicas/{id}/inativar`), `reativarClinica(id)` (`POST /clinicas/{id}/reativar`),
      `definirPrazoPagamento(id, dias)` (`POST /clinicas/{id}/prazo-pagamento`)
- [ ] T014 [P] [US2] Estender `apps/web/src/clinicas/usarClinicas.test.ts` com testes falhos para
      `editar`, `inativar`, `reativar`, `definirPrazoPagamento`: cada um atualiza a clínica
      correspondente no estado local em vez de refazer o `GET` completo; erro HTTP 404 em
      qualquer uma dessas ações resulta em
      `erro === "Clínica não encontrada — pode ter sido removida por outra sessão."`

### Implementation for User Story 2

- [ ] T015 [US2] Estender `apps/web/src/clinicas/clinicasApi.ts` implementando `editarClinica`,
      `inativarClinica`, `reativarClinica`, `definirPrazoPagamento`, até T013 passar
- [ ] T016 [US2] Estender `apps/web/src/clinicas/usarClinicas.ts` implementando `editar`,
      `inativar`, `reativar`, `definirPrazoPagamento` (atualização local do item na lista), até
      T014 passar
- [ ] T017 [P] [US2] Estender `apps/web/src/clinicas/FormularioClinica.test.tsx`: modo edição
      (prop `clinica` preenchida) exibe os valores já preenchidos e o campo CNPJ como somente
      leitura
- [ ] T018 [US2] Estender `apps/web/src/clinicas/FormularioClinica.tsx` para aceitar uma prop
      `clinica?: ClinicaResponse` que pré-preenche os campos e torna o CNPJ não editável quando
      presente, até T017 passar
- [ ] T019 [P] [US2] Estender `apps/web/src/clinicas/TelaClinicas.test.tsx`: ação "Editar" por
      linha abre o formulário preenchido; ações "Inativar"/"Reativar" por linha mudam o status
      exibido; campo de prazo de pagamento por linha salva o novo valor
- [ ] T020 [US2] Estender `apps/web/src/clinicas/TelaClinicas.tsx` com as ações por linha
      (editar, inativar, reativar, definir prazo de pagamento), até T019 passar

**Checkpoint**: US1 + US2 completas — módulo de Clínicas pronto de ponta a ponta.

---

## Phase 5: User Story 3 - Cadastrar e filtrar veterinários (Priority: P2)

**Goal**: acceptance scenarios 1-4 da US3 — listar (com filtro por clínica) e cadastrar
veterinário vinculado a uma clínica existente, com validação de CRMV e clínica.

**Independent Test**: com ao menos uma clínica cadastrada (US1), abrir `/veterinarios`, cadastrar
um veterinário com CRMV válido vinculado a essa clínica, filtrar a lista por ela, e ver a
mensagem de erro específica ao tentar cadastrar com CRMV vazio.

### Tests for User Story 3 ⚠️

- [ ] T021 [P] [US3] Escrever testes falhos para `apps/web/src/veterinarios/veterinariosApi.ts` em
      `apps/web/src/veterinarios/veterinariosApi.test.ts`, mockando `requisitar`:
      `listarVeterinarios(clinicaId?, apenasAtivos?)` chama `GET /veterinarios?clinica_id=...&apenas_ativos=...`;
      `buscarVeterinariosPorNome(nome, clinicaId?, apenasAtivos?)` chama `GET /veterinarios/busca?...`;
      `criarVeterinario(dados)` chama `POST /veterinarios`
- [ ] T022 [P] [US3] Escrever testes falhos para `apps/web/src/veterinarios/usarVeterinarios.ts`
      em `apps/web/src/veterinarios/usarVeterinarios.test.ts`, mockando `veterinariosApi.ts`:
      carregamento inicial popula `veterinarios`; filtrar por `clinicaId` refaz a listagem
      filtrada; `criar` bem-sucedido adiciona à lista; `criar` com erro 422 cujo detalhe é
      "CRMV não pode ser vazio" resulta em `erro === "Informe o CRMV do veterinário."`; `criar`
      com erro 422 cujo detalhe é "Clínica ... não encontrada" resulta em
      `erro === "A clínica selecionada não existe mais — atualize a lista de clínicas."`
      (os dois 422 só se distinguem pelo texto do detalhe via `extrairDetalheErro`, T002 — não
      pelo status); `criar` com erro 409 resulta em
      `erro === "Já existe um veterinário cadastrado com esse CRMV."`

### Implementation for User Story 3

- [ ] T023 [US3] Implementar `apps/web/src/veterinarios/veterinariosApi.ts` com
      `listarVeterinarios`, `buscarVeterinariosPorNome`, `criarVeterinario`, usando
      `VeterinarioResponse`/`CriarVeterinarioRequest` de `tipos.gerados.ts`, até T021 passar
- [ ] T024 [US3] Implementar `apps/web/src/veterinarios/usarVeterinarios.ts` (hook com
      `veterinarios`, `carregando`, `erro`, `filtroClinicaId`, `recarregar`, `criar`), usando
      `veterinariosApi.ts` e `extrairDetalheErro` para distinguir os dois erros 422 por substring
      do detalhe, até T022 passar
- [ ] T025 [P] [US3] Escrever testes falhos para
      `apps/web/src/veterinarios/FormularioVeterinario.tsx` em
      `apps/web/src/veterinarios/FormularioVeterinario.test.tsx`: recebe a lista de clínicas
      ativas via prop e renderiza um `<select>` de clínica; submissão sem clínica selecionada ou
      sem CRMV é bloqueada; submissão válida chama `aoSalvar` com os valores digitados e a
      `clinica_id` escolhida
- [ ] T026 [US3] Implementar `apps/web/src/veterinarios/FormularioVeterinario.tsx`, até T025
      passar
- [ ] T027 [P] [US3] Escrever testes falhos para
      `apps/web/src/veterinarios/TelaVeterinarios.tsx` em
      `apps/web/src/veterinarios/TelaVeterinarios.test.tsx`, mockando `usarVeterinarios` e
      `usarClinicas` (para a lista de clínicas do formulário): lista renderizada; filtro por
      clínica reduz a lista exibida; cadastro de veterinário reflete na lista sem reload; erro de
      CRMV vazio exibido na tela
- [ ] T028 [US3] Implementar `apps/web/src/veterinarios/TelaVeterinarios.tsx` (lista + filtro por
      clínica + botão "Novo veterinário" que abre `FormularioVeterinario`, exibindo
      `erro`/`carregando` do hook), até T027 passar
- [ ] T029 [US3] Ligar a rota `/veterinarios`: em `itensDeNavegacao.ts` marcar a entrada de
      Veterinários como `implementado: true`; em `rotas.tsx` registrar `<TelaVeterinarios />` em
      `componentePorRota` para a rota `/veterinarios`; atualizar `itensDeNavegacao.test.ts` para
      afirmar que Clínicas e Veterinários são `implementado: true` e os demais continuam `false`

**Checkpoint**: US1-US3 completas — cadastro de veterinário vinculado a clínica funcionando de
ponta a ponta.

---

## Phase 6: User Story 4 - Editar, inativar e reativar veterinário (Priority: P2)

**Goal**: acceptance scenarios 1-3 da US4 — editar dados (exceto CRMV e clínica),
inativar/reativar.

**Independent Test**: abrir um veterinário existente, editar o telefone, inativá-lo (status muda
na lista), reativá-lo (status volta).

### Tests for User Story 4 ⚠️

- [ ] T030 [P] [US4] Estender `apps/web/src/veterinarios/veterinariosApi.test.ts` com testes
      falhos para `editarVeterinario(id, dados)` (`PATCH /veterinarios/{id}`),
      `inativarVeterinario(id)` (`POST /veterinarios/{id}/inativar`), `reativarVeterinario(id)`
      (`POST /veterinarios/{id}/reativar`)
- [ ] T031 [P] [US4] Estender `apps/web/src/veterinarios/usarVeterinarios.test.ts` com testes
      falhos para `editar`, `inativar`, `reativar`: cada um atualiza o veterinário correspondente
      no estado local; erro HTTP 404 resulta em
      `erro === "Veterinário não encontrado — pode ter sido removido por outra sessão."`

### Implementation for User Story 4

- [ ] T032 [US4] Estender `apps/web/src/veterinarios/veterinariosApi.ts` implementando
      `editarVeterinario`, `inativarVeterinario`, `reativarVeterinario`, até T030 passar
- [ ] T033 [US4] Estender `apps/web/src/veterinarios/usarVeterinarios.ts` implementando `editar`,
      `inativar`, `reativar`, até T031 passar
- [ ] T034 [P] [US4] Estender `apps/web/src/veterinarios/FormularioVeterinario.test.tsx`: modo
      edição (prop `veterinario` preenchida) exibe os valores já preenchidos e torna CRMV e
      clínica somente leitura
- [ ] T035 [US4] Estender `apps/web/src/veterinarios/FormularioVeterinario.tsx` para aceitar uma
      prop `veterinario?: VeterinarioResponse` que pré-preenche os campos e bloqueia edição de
      CRMV/clínica quando presente, até T034 passar
- [ ] T036 [P] [US4] Estender `apps/web/src/veterinarios/TelaVeterinarios.test.tsx`: ações
      "Editar"/"Inativar"/"Reativar" por linha
- [ ] T037 [US4] Estender `apps/web/src/veterinarios/TelaVeterinarios.tsx` com as ações por linha,
      até T036 passar

**Checkpoint**: todas as 4 user stories completas — módulos de Clínicas e Veterinários prontos.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: fechar a spec com a suíte verde e o handoff atualizado, prontos para `/fechar-spec`

- [ ] T038 [P] Rodar `pnpm --dir apps/web lint` e corrigir qualquer achado em
      `apps/web/src/clinicas/` e `apps/web/src/veterinarios/`
- [ ] T039 [P] Rodar `pnpm --dir apps/web test` com cobertura visível para
      `apps/web/src/clinicas/` e `apps/web/src/veterinarios/` (Princípio IV da constituição —
      nenhuma task é considerada concluída só porque os testes existem, a suíte real precisa
      passar)
- [ ] T040 Executar manualmente os 5 cenários de `specs/012-clinicas-veterinarios-web/quickstart.md`
      contra o backend e o frontend rodando localmente, registrando qualquer divergência encontrada
- [ ] T041 Atualizar `handoff.md` relatando a S12 implementada e pronta para `/fechar-spec`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup — bloqueia a task de "wire route" (T012, T029) de
  toda user story, mas não bloqueia o início das tasks de API/hook/formulário de cada story
- **User Stories (Phase 3-6)**: T012 e T029 dependem de T002+T003; as demais tasks de cada story
  não dependem da Foundational além de T002 (erroApi, usada nos hooks)
  - US2 (Phase 4) depende de US1 (Phase 3) estar pronta: reaproveita `clinicasApi.ts`,
    `usarClinicas.ts`, `FormularioClinica.tsx`, `TelaClinicas.tsx` já criados por US1 — não é uma
    dependência de dado, é o mesmo conjunto de arquivos sendo estendido
  - US4 (Phase 6) depende de US3 (Phase 5) pela mesma razão, no módulo de veterinários
  - US3 (Phase 5) depende de US1 estar pronta **como dado**, não como código: precisa existir ao
    menos uma clínica cadastrada para testar o cadastro de veterinário (ver spec.md → Independent
    Test da US3); o código de `veterinarios/` em si não importa nada de `clinicas/` além do tipo
    de clínica para popular o `<select>` do formulário
- **Polish (Phase 7)**: depende de todas as user stories que forem entregues nesta spec (todas as
  4, conforme spec.md)

### Parallel Opportunities

- T004 e T005 (Phase 3) — arquivos diferentes
- T008, T010 (Phase 3) — arquivos diferentes, após T007
- T013 e T014 (Phase 4) — arquivos diferentes
- T017 e T019 (Phase 4) — arquivos diferentes, após T016
- T021 e T022 (Phase 5) — arquivos diferentes
- T025 e T027 (Phase 5) — arquivos diferentes, após T024
- T030 e T031 (Phase 6) — arquivos diferentes
- T034 e T036 (Phase 6) — arquivos diferentes, após T033
- T038 e T039 (Phase 7) — comandos independentes

---

## Parallel Example: User Story 1

```bash
# Tests de US1 que podem ser escritos em paralelo (arquivos diferentes):
Task: "Escrever testes falhos para clinicasApi.ts em apps/web/src/clinicas/clinicasApi.test.ts"
Task: "Escrever testes falhos para usarClinicas.ts em apps/web/src/clinicas/usarClinicas.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (bloqueia o "wire route" de qualquer story)
3. Completar Phase 3: User Story 1
4. **Parar e validar**: rodar o Cenário 1 de `quickstart.md` isoladamente
5. Rodar `/fechar-spec` só faz sentido depois de todas as 4 user stories — o MVP aqui é um ponto de
   validação intermediária, não um ponto de fechamento de spec

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → validar isoladamente (Cenário 1 do quickstart) → clínicas cadastráveis e listáveis
3. US2 → validar isoladamente (Cenário 2) → módulo de Clínicas completo
4. US3 → validar isoladamente (Cenário 3, com dado de US1) → veterinários cadastráveis e listáveis
5. US4 → validar isoladamente (Cenário 4) → módulo de Veterinários completo
6. Phase 7 → lint, cobertura, quickstart completo, handoff atualizado → pronto para `/fechar-spec`

---

## Notes

- [P] = arquivos diferentes, sem dependência de task incompleta
- [Story] identifica a user story de spec.md para rastreabilidade
- Cada task de teste precisa estar vermelha antes da task de implementação correspondente
- Commit por task concluída, nunca várias tasks acumuladas num commit (CLAUDE.md → Convenções,
  Princípio V da constituição)
- Rodar a suíte do módulo afetado antes de cada commit de task
- Evitar: task vaga, duas tasks [P] no mesmo arquivo, dependência entre stories que quebre o
  teste independente de cada uma
