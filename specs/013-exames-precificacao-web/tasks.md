---

description: "Task list template for feature implementation"
---

# Tasks: Tela de Exames & Precificação (Web)

**Input**: Design documents from `specs/013-exames-precificacao-web/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Este projeto exige teste-primeiro (Princípio IV da constituição, `.specify/memory/constitution.md`)
— não são opcionais aqui. Cada task de teste abaixo deve ficar vermelha antes da task de
implementação correspondente deixá-la verde.

**Organization**: Tasks agrupadas por user story (spec.md) para permitir implementação e teste
independentes de cada uma. Cada task concluída é um commit próprio (CLAUDE.md → Convenções),
escopo `s13`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: A qual user story a task pertence (US1, US2, US3, US4)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Frontend puro, dentro de `apps/web/src/` (ver plan.md → Project Structure). Sem mudança em
`apps/api` — S5 já existe e não é tocado (ver `spec.md` → "Descobertas" para o achado de validação
de preço/valor no backend, registrado mas não corrigido nesta spec).

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança

- [X] T001 Confirmar que `pnpm --dir apps/web test` e `pnpm --dir apps/web lint` passam limpos na
      branch `spec/s13-exames-precificacao-web` antes de qualquer alteração (baseline herdado da
      S12) — nenhum arquivo alterado nesta task, é um gate de partida

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extrair o hook de suporte compartilhado que `useExames`/`useRegrasPlantao` vão usar,
eliminando a duplicação já sinalizada no handoff da S12 (`research.md` → Decisão 3: 3ª e 4ª
entidade repetindo o esqueleto de `useClinicas.ts`/`useVeterinarios.ts`)

**⚠️ CRITICAL**: T002/T003 bloqueiam toda task de hook (`useExames.ts`, `useRegrasPlantao.ts`) das
user stories abaixo — não bloqueiam `examesApi.ts`/`regrasPlantaoApi.ts` nem os formulários

- [X] T002 [P] Escrever testes falhos para `apps/web/src/api/useColecaoCrud.ts` em
      `apps/web/src/api/useColecaoCrud.test.ts`: hook genérico `useColecaoCrud<T extends { id: string }>(carregarLista, mensagemDeErro)`
      — estado inicial (`itens: []`, `carregando: true`); `recarregar()` bem-sucedido popula
      `itens` e zera `carregando`; `recarregar()` com `ErroHttp` seta `erro` via `mensagemDeErro`;
      `criar(acao)` bem-sucedido adiciona o item retornado a `itens` sem novo `recarregar`;
      `criar(acao)` com `ErroHttp` seta `erro` sem alterar `itens`; `executarAcaoSobreItem(acao)`
      bem-sucedido substitui, por `id`, o item correspondente em `itens`; `executarAcaoSobreItem(acao)`
      com `ErroHttp` seta `erro` sem alterar `itens`
- [X] T003 Implementar `apps/web/src/api/useColecaoCrud.ts` extraindo o esqueleto hoje duplicado em
      `apps/web/src/clinicas/useClinicas.ts`/`apps/web/src/veterinarios/useVeterinarios.ts`
      (`recarregar`/`criar` com try/catch/`ErroHttp`/`setErro`, `substituirNoEstado` por `id`), até
      T002 passar. **Não** alterar `useClinicas.ts`/`useVeterinarios.ts` para usar o hook novo —
      retrofit de S12 está fora do escopo desta spec (ver `research.md` → Decisão 3)

**Checkpoint**: hook de suporte pronto — cada user story só precisa da sua API tipada + do hook
específico construído sobre `useColecaoCrud` + o wire da própria rota.

---

## Phase 3: User Story 1 - Listar e cadastrar exames do catálogo (Priority: P1) 🎯 MVP

**Goal**: acceptance scenarios 1-3 da US1 em spec.md — listar exames cadastrados e cadastrar um
novo (só `admin`), com leitura liberada a `admin`/`atendente`/`tecnico` e controles de escrita
ocultos para quem não é `admin`.

**Independent Test**: logar como admin, abrir `/exames`, cadastrar um exame com categoria/nome/
preço-base válidos e vê-lo na lista sem reload; logar como atendente/técnico e confirmar que a
lista aparece sem nenhum botão de cadastro.

### Tests for User Story 1 ⚠️ (escrever e ver falhar antes de implementar)

- [X] T004 [P] [US1] Escrever testes falhos para `apps/web/src/exames/examesApi.ts` em
      `apps/web/src/exames/examesApi.test.ts`, mockando `requisitar` (`../api/clienteHttp`):
      `listarExames(categoria?, apenasAtivos?)` chama `GET /exames?categoria=...&apenas_ativos=...`
      (omitindo `categoria` da query quando `undefined`); `criarExame(dados)` chama `POST /exames`
      com o body serializado (`categoria`, `nome`, `preco_base`) e repassa `ErroHttp` sem capturá-lo
- [X] T005 [P] [US1] Escrever testes falhos para `apps/web/src/exames/useExames.ts` em
      `apps/web/src/exames/useExames.test.ts`, mockando `examesApi.ts` e usando `useColecaoCrud`
      (T002/T003): carregamento inicial popula `exames`; filtrar por `categoria`/`apenasAtivos`
      refaz a listagem filtrada; `criar(dados)` bem-sucedido adiciona o exame retornado à lista sem
      novo `GET`; `criar` com `ErroHttp` de status inesperado (ex: 500) resulta em
      `erro === extrairDetalheErro(erro)` (sem mapeamento específico — `data-model.md` não define
      erro de domínio para criação de exame, só 404 em edição/inativação/reativação, cobertos na
      US2)

### Implementation for User Story 1

- [X] T006 [US1] Implementar `apps/web/src/exames/examesApi.ts` com `listarExames`, `criarExame`,
      usando `requisitar<T>` e os tipos `ExameResponse`/`CriarExameRequest` de
      `apps/web/src/api/tipos.gerados.ts`, até T004 passar
- [X] T007 [US1] Implementar `apps/web/src/exames/useExames.ts` (hook com `exames`, `carregando`,
      `erro`, `categoria`, `definirCategoria`, `apenasAtivos`, `definirApenasAtivos`, `recarregar`,
      `criar`), construído sobre `useColecaoCrud` (T003) e `examesApi.ts`, com
      `mensagemDeErro(erro)` que mapeia 404 para
      `"Exame não encontrado — pode ter sido removido por outra sessão."` e usa
      `extrairDetalheErro` como fallback para os demais status, até T005 passar
- [X] T008 [P] [US1] Escrever testes falhos para `apps/web/src/exames/FormularioExame.tsx` em
      `apps/web/src/exames/FormularioExame.test.tsx`: submissão com categoria, nome e preço-base
      válidos chama `aoSalvar` com os valores digitados; submissão com `categoria` ou `nome` vazio
      é bloqueada pelo próprio formulário (validação HTML nativa `required`, sem chamada a
      `aoSalvar`); submissão com `preco_base` igual a `0` ou negativo é bloqueada pelo formulário
      (`min="0.01"` ou validação equivalente), com mensagem de erro visível, sem chamar `aoSalvar`
      — **esta é a única camada que rejeita preço não positivo nesta spec** (o backend S5 não valida
      isso, ver `spec.md` → Descobertas)
- [X] T009 [US1] Implementar `apps/web/src/exames/FormularioExame.tsx` (campos categoria, nome,
      preço-base, reaproveitando `CampoTexto`/`Botao` de `apps/web/src/ui/`, com validação de
      preço-base positivo antes de chamar `aoSalvar`), até T008 passar
- [X] T010 [P] [US1] Escrever testes falhos para `apps/web/src/exames/TelaExames.tsx` em
      `apps/web/src/exames/TelaExames.test.tsx`, mockando `useExames` e `SessaoContext`
      (papel do usuário logado): sub-seção "Catálogo de Exames" renderizada a partir do hook para
      os papéis `admin`/`atendente`/`tecnico`; só `admin` vê o botão "Novo exame"; abrir o
      formulário como admin, cadastrar um exame novo e vê-lo aparecer na lista sem reload
- [X] T011 [US1] Implementar `apps/web/src/exames/TelaExames.tsx` com a sub-seção "Catálogo de
      Exames" (lista + botão "Novo exame" visível só quando `papel === 'admin'`, lido via
      `SessaoContext`, que abre `FormularioExame`, exibindo `erro`/`carregando` do hook), até T010
      passar
- [X] T012 [US1] Ligar a rota `/exames`: em `apps/web/src/shell/itensDeNavegacao.ts` marcar a
      entrada de Exames como `implementado: true`; em `apps/web/src/rotas.tsx` registrar
      `<TelaExames />` em `componentePorRota` para a rota `/exames`; atualizar
      `apps/web/src/shell/itensDeNavegacao.test.ts` para afirmar que Clínicas, Veterinários e
      Exames são `implementado: true` e os demais continuam `false`

**Checkpoint**: US1 completa e testável de forma independente — `/exames` lista e cadastra exames
de ponta a ponta, com escrita restrita a `admin`.

---

## Phase 4: User Story 2 - Editar, inativar e reativar exame (Priority: P1)

**Goal**: acceptance scenarios 1-3 da US2 — editar categoria/nome/preço-base e inativar/reativar
um exame, sempre restrito a `admin`.

**Independent Test**: como admin, editar o preço-base de um exame existente, inativá-lo (status
muda na lista), e reativá-lo (status volta).

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] Estender `apps/web/src/exames/examesApi.test.ts` com testes falhos para
      `editarExame(id, dados)` (`PATCH /exames/{id}`), `inativarExame(id)`
      (`POST /exames/{id}/inativar`), `reativarExame(id)` (`POST /exames/{id}/reativar`)
- [X] T014 [P] [US2] Estender `apps/web/src/exames/useExames.test.ts` com testes falhos para
      `editar`, `inativar`, `reativar`: cada um atualiza o exame correspondente no estado local
      (via `useColecaoCrud.executarAcaoSobreItem`) em vez de refazer o `GET` completo; erro HTTP
      404 em qualquer uma dessas ações resulta em
      `erro === "Exame não encontrado — pode ter sido removido por outra sessão."`

### Implementation for User Story 2

- [X] T015 [US2] Estender `apps/web/src/exames/examesApi.ts` implementando `editarExame`,
      `inativarExame`, `reativarExame`, até T013 passar
- [X] T016 [US2] Estender `apps/web/src/exames/useExames.ts` implementando `editar`, `inativar`,
      `reativar` sobre `useColecaoCrud.executarAcaoSobreItem`, até T014 passar
- [X] T017 [P] [US2] Estender `apps/web/src/exames/FormularioExame.test.tsx`: modo edição (prop
      `exame` preenchida) exibe os valores já preenchidos, mantendo a mesma validação de
      preço-base positivo — **já cobertos em T008/T009** (`FormularioExame` já nasceu com a prop
      `exame?` opcional e o teste de prefill), nenhum código novo nesta task
- [X] T018 [US2] Estender `apps/web/src/exames/FormularioExame.tsx` para aceitar uma prop
      `exame?: ExameResponse` que pré-preenche os campos, até T017 passar — **já implementado em
      T009**, nenhum código novo nesta task
- [X] T019 [P] [US2] Estender `apps/web/src/exames/TelaExames.test.tsx`: ações "Editar"/"Inativar"/
      "Reativar" por linha visíveis só para `admin`, ausentes para `atendente`/`tecnico`
- [X] T020 [US2] Estender `apps/web/src/exames/TelaExames.tsx` com as ações por linha
      (editar, inativar, reativar) gated a `papel === 'admin'`, até T019 passar

**Checkpoint**: US1 + US2 completas — catálogo de Exame pronto de ponta a ponta.

---

## Phase 5: User Story 3 - Listar e cadastrar regras de plantão (Priority: P2)

**Goal**: acceptance scenarios 1-3 da US3 — listar regras de plantão (visível a `admin`/
`atendente`, não `tecnico`) e cadastrar uma nova (só `admin`), aceitando janela cruzando meia-noite.

**Independent Test**: como admin, abrir a sub-seção "Regras de Plantão" dentro de "Exames",
cadastrar uma regra com `hora_inicio > hora_fim` (plantão cruzando meia-noite) e vê-la na lista sem
erro de validação; como técnico, confirmar que a sub-seção não aparece.

### Tests for User Story 3 ⚠️

- [X] T021 [P] [US3] Escrever testes falhos para `apps/web/src/exames/regrasPlantaoApi.ts` em
      `apps/web/src/exames/regrasPlantaoApi.test.ts`, mockando `requisitar`:
      `listarRegrasPlantao(apenasAtivos?)` chama `GET /regras-plantao?apenas_ativos=...`;
      `criarRegraPlantao(dados)` chama `POST /regras-plantao` com o body serializado (`dia_semana`,
      `hora_inicio`, `hora_fim`, `valor_adicional`) e repassa `ErroHttp` sem capturá-lo
- [X] T022 [P] [US3] Escrever testes falhos para `apps/web/src/exames/useRegrasPlantao.ts` em
      `apps/web/src/exames/useRegrasPlantao.test.ts`, mockando `regrasPlantaoApi.ts` e usando
      `useColecaoCrud` (T002/T003): carregamento inicial popula `regras`; filtrar por
      `apenasAtivos` refaz a listagem; `criar(dados)` com `hora_inicio > hora_fim` bem-sucedido
      adiciona a regra retornada à lista sem novo `GET` (o backend aceita — nada a rejeitar aqui);
      `criar` com `ErroHttp` de status inesperado usa `extrairDetalheErro` como fallback

### Implementation for User Story 3

- [X] T023 [US3] Implementar `apps/web/src/exames/regrasPlantaoApi.ts` com `listarRegrasPlantao`,
      `criarRegraPlantao`, usando `RegraPlantaoResponse`/`CriarRegraPlantaoRequest` de
      `tipos.gerados.ts`, até T021 passar
- [X] T024 [US3] Implementar `apps/web/src/exames/useRegrasPlantao.ts` (hook com `regras`,
      `carregando`, `erro`, `apenasAtivos`, `definirApenasAtivos`, `recarregar`, `criar`),
      construído sobre `useColecaoCrud` e `regrasPlantaoApi.ts`, com `mensagemDeErro(erro)` que
      mapeia 404 para
      `"Regra de plantão não encontrada — pode ter sido removida por outra sessão."` e usa
      `extrairDetalheErro` como fallback, até T022 passar
- [X] T025 [P] [US3] Escrever testes falhos para `apps/web/src/exames/FormularioRegraPlantao.tsx`
      em `apps/web/src/exames/FormularioRegraPlantao.test.tsx`: `<select>` de dia da semana (0–6,
      rotulado em português); campos de horário de início/fim; submissão com `valor_adicional`
      igual a `0` ou negativo bloqueada pelo formulário (única camada de defesa, mesmo achado da
      T008 para regra de plantão); submissão com `hora_inicio` maior que `hora_fim` **não** é
      bloqueada — chama `aoSalvar` normalmente (representa plantão cruzando a meia-noite)
- [X] T026 [US3] Implementar `apps/web/src/exames/FormularioRegraPlantao.tsx` (campos dia da
      semana, hora de início, hora de fim, valor adicional, com validação só de valor adicional
      positivo — sem validar ordem entre os horários), até T025 passar
- [X] T027 [P] [US3] Estender `apps/web/src/exames/TelaExames.test.tsx`: adiciona abas "Catálogo de
      Exames"/"Regras de Plantão"; aba "Regras de Plantão" visível para `admin`/`atendente`,
      ausente para `tecnico`; dentro dela, só `admin` vê o botão "Nova regra"
- [X] T028 [US3] Estender `apps/web/src/exames/TelaExames.tsx` introduzindo as abas e a sub-seção
      "Regras de Plantão" (lista + botão "Nova regra" visível só para `admin`, sub-seção inteira
      visível só para `papel === 'admin' || papel === 'atendente'`), até T027 passar

**Checkpoint**: US1-US3 completas — cadastro de regra de plantão funcionando de ponta a ponta,
com a restrição de leitura de `tecnico` respeitada.

---

## Phase 6: User Story 4 - Editar e inativar regra de plantão (Priority: P2)

**Goal**: acceptance scenarios 1-3 da US4 — editar dia/horário/valor adicional e inativar/reativar
uma regra de plantão, sempre restrito a `admin`.

**Independent Test**: como admin, editar o valor adicional de uma regra existente, inativá-la
(status muda na lista), e reativá-la (status volta).

### Tests for User Story 4 ⚠️

- [X] T029 [P] [US4] Estender `apps/web/src/exames/regrasPlantaoApi.test.ts` com testes falhos para
      `editarRegraPlantao(id, dados)` (`PATCH /regras-plantao/{id}`), `inativarRegraPlantao(id)`
      (`POST /regras-plantao/{id}/inativar`), `reativarRegraPlantao(id)`
      (`POST /regras-plantao/{id}/reativar`)
- [X] T030 [P] [US4] Estender `apps/web/src/exames/useRegrasPlantao.test.ts` com testes falhos para
      `editar`, `inativar`, `reativar`: cada um atualiza a regra correspondente no estado local
      (via `useColecaoCrud.executarAcaoSobreItem`); erro HTTP 404 resulta em
      `erro === "Regra de plantão não encontrada — pode ter sido removida por outra sessão."`

### Implementation for User Story 4

- [X] T031 [US4] Estender `apps/web/src/exames/regrasPlantaoApi.ts` implementando
      `editarRegraPlantao`, `inativarRegraPlantao`, `reativarRegraPlantao`, até T029 passar
- [X] T032 [US4] Estender `apps/web/src/exames/useRegrasPlantao.ts` implementando `editar`,
      `inativar`, `reativar` sobre `useColecaoCrud.executarAcaoSobreItem`, até T030 passar
- [ ] T033 [P] [US4] Estender `apps/web/src/exames/FormularioRegraPlantao.test.tsx`: modo edição
      (prop `regra` preenchida) exibe os valores já preenchidos, mantendo a validação de valor
      adicional positivo e a ausência de validação de ordem entre horários
- [ ] T034 [US4] Estender `apps/web/src/exames/FormularioRegraPlantao.tsx` para aceitar uma prop
      `regra?: RegraPlantaoResponse` que pré-preenche os campos, até T033 passar
- [ ] T035 [P] [US4] Estender `apps/web/src/exames/TelaExames.test.tsx`: ações "Editar"/"Inativar"/
      "Reativar" por linha na sub-seção de regras de plantão, visíveis só para `admin`
- [ ] T036 [US4] Estender `apps/web/src/exames/TelaExames.tsx` com as ações por linha na sub-seção
      de regras de plantão, gated a `papel === 'admin'`, até T035 passar

**Checkpoint**: todas as 4 user stories completas — módulo de Exames & Precificação pronto.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: fechar a spec com a suíte verde e o handoff atualizado, prontos para `/fechar-spec`

- [ ] T037 [P] Rodar `pnpm --dir apps/web lint` e corrigir qualquer achado em
      `apps/web/src/exames/` e `apps/web/src/api/useColecaoCrud.ts`
- [ ] T038 [P] Rodar `pnpm --dir apps/web test` com cobertura visível para
      `apps/web/src/exames/` e `apps/web/src/api/useColecaoCrud.ts` (Princípio IV da constituição
      — nenhuma task é considerada concluída só porque os testes existem, a suíte real precisa
      passar)
- [ ] T039 Executar manualmente os 6 cenários de
      `specs/013-exames-precificacao-web/quickstart.md` contra o backend e o frontend rodando
      localmente, confirmando em particular que a validação de preço/valor não positivo só ocorre
      no frontend (achado de "Descobertas" em `spec.md`) e registrando qualquer outra divergência
      encontrada
- [ ] T040 Atualizar `handoff.md` relatando a S13 implementada, o achado de "Descobertas" (schema
      do backend S5 sem `gt=0`), e pronta para `/fechar-spec`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup — bloqueia toda task de hook (`useExames.ts`,
  T007/T016; `useRegrasPlantao.ts`, T024/T032) de qualquer user story, mas não bloqueia
  `examesApi.ts`/`regrasPlantaoApi.ts` nem os formulários
- **User Stories (Phase 3-6)**: T007/T016/T024/T032 dependem de T002+T003; as demais tasks de cada
  story não dependem da Foundational
  - US2 (Phase 4) depende de US1 (Phase 3): reaproveita `examesApi.ts`, `useExames.ts`,
    `FormularioExame.tsx`, `TelaExames.tsx` já criados por US1 — não é dependência de dado, é o
    mesmo conjunto de arquivos sendo estendido
  - US4 (Phase 6) depende de US3 (Phase 5) pela mesma razão, no módulo de regras de plantão
  - US3 (Phase 5) depende de US1 estar pronta **como código de UI** (a aba "Regras de Plantão" é
    adicionada dentro de `TelaExames.tsx`, criado por US1) — não como dado: as duas entidades não
    se referenciam
- **Polish (Phase 7)**: depende de todas as 4 user stories, conforme spec.md

### Parallel Opportunities

- T004 e T005 (Phase 3) — arquivos diferentes
- T008, T010 (Phase 3) — arquivos diferentes, após T007
- T013 e T014 (Phase 4) — arquivos diferentes
- T017 e T019 (Phase 4) — arquivos diferentes, após T016
- T021 e T022 (Phase 5) — arquivos diferentes
- T025 e T027 (Phase 5) — arquivos diferentes, após T024
- T029 e T030 (Phase 6) — arquivos diferentes
- T033 e T035 (Phase 6) — arquivos diferentes, após T032
- T037 e T038 (Phase 7) — comandos independentes

---

## Parallel Example: User Story 1

```bash
# Tests de US1 que podem ser escritos em paralelo (arquivos diferentes):
Task: "Escrever testes falhos para examesApi.ts em apps/web/src/exames/examesApi.test.ts"
Task: "Escrever testes falhos para useExames.ts em apps/web/src/exames/useExames.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (`useColecaoCrud`, bloqueia os hooks de qualquer story)
3. Completar Phase 3: User Story 1
4. **Parar e validar**: rodar o Cenário 1 de `quickstart.md` isoladamente
5. Rodar `/fechar-spec` só faz sentido depois das 4 user stories — o MVP aqui é um ponto de
   validação intermediária, não um ponto de fechamento de spec

### Incremental Delivery

1. Setup + Foundational → hook compartilhado pronto
2. US1 → validar isoladamente (Cenário 1 do quickstart) → exames cadastráveis e listáveis
3. US2 → validar isoladamente (Cenário 2) → catálogo de Exame completo
4. US3 → validar isoladamente (Cenário 3) → regras de plantão cadastráveis e listáveis, com a
   restrição de leitura de `tecnico` respeitada
5. US4 → validar isoladamente (Cenário 4) → módulo de Regras de Plantão completo
6. Phase 7 → lint, cobertura, quickstart completo, handoff atualizado → pronto para `/fechar-spec`

---

## Notes

- [P] = arquivos diferentes, sem dependência de task incompleta
- [Story] identifica a user story de spec.md para rastreabilidade
- Cada task de teste precisa estar vermelha antes da task de implementação correspondente
- Commit por task concluída, nunca várias tasks acumuladas num commit (CLAUDE.md → Convenções,
  Princípio V da constituição)
- Rodar a suíte do módulo afetado antes de cada commit de task
- Evitar: task vaga, duas tasks [P] no mesmo arquivo, dependência entre stories que quebre o teste
  independente de cada uma
- Retrofit de `useClinicas.ts`/`useVeterinarios.ts` (S12) para usar `useColecaoCrud` **não** é
  tarefa desta spec (ver `research.md` → Decisão 3) — nenhuma task acima toca esses dois arquivos
