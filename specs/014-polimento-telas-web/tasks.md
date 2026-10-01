---

description: "Task list for feature implementation"
---

# Tasks: Polimento das Telas Web de Cadastro (S12/S13) e Validação de Valores de Exames

**Input**: Design documents from `specs/014-polimento-telas-web/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: obrigatórios, teste primeiro (Princípio IV da constituição). Cada task de teste fica
vermelha antes da task de implementação correspondente. Quando um teste nascer verde porque uma
task anterior já entregou o comportamento, registrar isso na própria task ao marcá-la (padrão da
S13), sem forçar vermelho artificial.

**Organization**: tasks agrupadas por user story (spec.md). Cada task concluída é um commit próprio,
escopo `s14` (CLAUDE.md → Convenções). Antes de cada commit, rodar a suíte do módulo afetado com
cobertura (`pnpm --dir apps/web test:cobertura` ou `uv run pytest --cov` em `apps/api`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: user story da spec (US1 a US7)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

- Backend: `apps/api/src/vertere_api/exames/` e `apps/api/tests/`
- Frontend: `apps/web/src/` e `apps/web/tests/`
- Assinaturas compartilhadas: `contracts/frontend-interfaces.md`. Contrato HTTP:
  `contracts/api-exames-validacao.md`. Mensagens e tabelas: `data-model.md`.
- Testes novos ou reescritos que digitam ou clicam usam o helper `usuario()` de
  `apps/web/tests/usuario.ts` (T003), não `userEvent.*` direto.

---

## Phase 1: Setup

**Purpose**: baseline e transição de status

- [X] T001 Gate de partida, sem alterar código. **Resultado (2026-10-01)**: web 169/169, lint com
  os 4 warnings pré-existentes, build limpo, API 40/40 nos três arquivos de exames.
  - Confirmar, na branch `spec/s14-polimento-telas-web`, que `pnpm --dir apps/web test`,
    `pnpm --dir apps/web lint`, `pnpm --dir apps/web build` e
    `uv run pytest tests/test_exames_exame_service.py tests/test_exames_regra_plantao_service.py tests/test_exames_router.py`
    (em `apps/api`) passam, e registrar os números nesta task.
  - Atualizar o status da S14 para `em-desenvolvimento` em `docs/specs.md` e em
    `specs/014-polimento-telas-web/spec.md` (`**Status**`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: as peças compartilhadas que todas as telas vão usar (contracts/frontend-interfaces.md)
e a estabilidade da suíte, primeiro, para os ciclos seguintes rodarem numa suíte confiável
(research.md, Decisão 7).

**⚠️ CRITICAL**: T002–T013 bloqueiam as phases 3, 4, 6, 7 e 8 (frontend). A Phase 5 (US3, backend)
não depende delas.

- [X] T002 Fixar `test.maxWorkers: '50%'` em `apps/web/vite.config.ts` e tirar `--maxWorkers=2` do
      script `test:cobertura` em `apps/web/package.json`, que passa a herdar da config. Rodar
      `pnpm --dir apps/web test` e `test:cobertura` uma vez cada para confirmar que continuam
      verdes. **Resultado**: `test` 169/169 (77 s). `test:cobertura` teve 1 falha por timeout na 1ª
      execução e 169/169 na 2ª: a instabilidade conhecida, que só o `maxWorkers` não resolve
      (research.md, Decisão 7). T003 e T053 atacam o resto.
- [X] T003 Criar `apps/web/tests/usuario.ts` exportando `usuario()`, que devolve
      `userEvent.setup({ delay: null })`. Comentário no arquivo explica o porquê: research.md,
      Decisão 7 (custo por tecla sob carga).
- [X] T004 [P] Escrever testes falhos para `mensagemDeErroPadrao(erro, rotulosDeCampo?)` em
      `apps/web/src/api/erroApi.test.ts`, cobrindo a tabela "Mensagens de erro padrão" de
      data-model.md e research.md, Decisão 4:
  - status 500 com corpo `Internal Server Error` → `Problema no servidor. Tente novamente em
    instantes.`;
  - corpo não-JSON com status 400 → a mesma mensagem;
  - `{"detail": "Exame x não encontrado"}` → o próprio detail;
  - 422 com `detail` lista `[{loc:["body","email"], type:"value_error", msg:"..."}]` e rótulos
    `{email:'E-mail'}` → `Verifique o campo E-mail: valor inválido.`;
  - `type` `missing` → `preenchimento obrigatório`; `greater_than` com `ctx.gt: 0` → `deve ser
    maior que 0`; `string_too_short` → `não pode ficar vazio`; `decimal_parsing` → `precisa ser
    um número`; `time_parsing` → `horário inválido`;
  - campo sem rótulo → `Verifique o campo informado: …`;
  - duas entradas na lista → duas frases unidas por espaço;
  - JSON sem `detail` utilizável → `Não foi possível concluir a operação. Tente novamente.`
- [X] T005 Implementar `mensagemDeErroPadrao` em `apps/web/src/api/erroApi.ts` até T004 passar,
      mantendo `extrairDetalheErro` com o comportamento atual (os hooks continuam a usá-lo para
      reconhecer mensagens de domínio).
- [X] T006 [P] Escrever testes falhos para o contrato novo de `useColecaoCrud` em
      `apps/web/src/api/useColecaoCrud.test.ts` (contracts/frontend-interfaces.md):
  - `criar(acao)` bem-sucedido devolve `{ok:true}` e **recarrega** a lista: `carregarLista` é
    chamado de novo e `itens` vem da recarga, sem `carregando` voltar a `true`;
  - `criar` com `ErroHttp` devolve `{ok:false, mensagem}` com `mensagem` vinda de `mensagemDeErro`,
    e **não** preenche `erro`;
  - `criar` com `TypeError` de rede devolve `{ok:false, mensagem:'Não foi possível falar com o
    servidor. Tente novamente.'}`;
  - `salvarItem(acao)`: os mesmos três casos de `criar`;
  - `executarAcaoSobreItem(acao)` bem-sucedido recarrega a lista; com falha, preenche `erro`
    (comportamento de ação de linha mantido);
  - `criar` cujo id não volta na recarga preenche `aviso` com `Cadastro salvo. Ele não aparece na
    lista por causa dos filtros ativos.`; quando volta, `aviso` fica `null`;
  - `aviso` é limpo na próxima ação e quando `carregarLista` muda (troca de filtro);
  - recarga que falha depois de uma ação bem-sucedida: a ação devolve `{ok:true}` e `erro` recebe
    a mensagem da falha de recarga.

  Atualizar ou remover os testes da S13 que assumiam `criar` adicionando sem recarga e
  preenchendo `erro`.
- [X] T007 Implementar o contrato novo em `apps/web/src/api/useColecaoCrud.ts` até T006 passar, e
      adaptar `apps/web/src/exames/useExames.ts` e `apps/web/src/exames/useRegrasPlantao.ts`:
  - `criar` e `editar` passam a devolver `Promise<ResultadoAcao>`;
  - `editar` passa a usar `salvarItem`;
  - os dois hooks expõem `aviso`.

  Atualizar `useExames.test.ts`, `useRegrasPlantao.test.ts` e `TelaExames.test.tsx` só no que o
  contrato novo quebrar (o tipo de retorno de `criar`/`editar`). As telas ainda ignoram o retorno
  até a Phase 3. **Feito**: 7 testes de hook da S13 ajustados (os de "estado local sem novo GET"
  passam a esperar a recarga; os de "erro inesperado" passam a checar o `ResultadoAcao`), e
  `aviso: null` nos mocks de `TelaExames.test.tsx`. `src/api` + `src/exames`: 103/103, 97% das
  linhas.
- [X] T008 [P] Escrever testes falhos para `useEnvioFormulario(aoSalvar, aoFechar)` em
      `apps/web/src/ui/useEnvioFormulario.test.ts`:
  - `enviar()` com `aoSalvar` → `{ok:true}` chama `aoFechar` uma vez;
  - com `{ok:false, mensagem:'x'}`, não chama `aoFechar` e `erroEnvio === 'x'`;
  - `salvando` fica `true` durante a promessa e volta a `false`;
  - um segundo `enviar()` enquanto `salvando` não chama `aoSalvar` de novo;
  - um envio bem-sucedido depois de um que falhou limpa `erroEnvio`.
- [X] T009 Implementar `apps/web/src/ui/useEnvioFormulario.ts` até T008 passar.
- [X] T010 [P] Escrever testes falhos para `podeExecutar(papel, acao)` em
      `apps/web/src/autenticacao/permissoesDeTela.test.ts`, tabela-dirigido, exatamente a tabela
      "Permissões de tela" de data-model.md:
  - `CLINICA_GERENCIAR`, `VETERINARIO_GERENCIAR`, `EXAME_GERENCIAR` e `REGRA_PLANTAO_GERENCIAR` →
    só `admin`;
  - `REGRA_PLANTAO_VER` → `admin` e `atendente`;
  - `clinica` → `false` em todas.
- [X] T011 Implementar `apps/web/src/autenticacao/permissoesDeTela.ts` (`AcaoDeTela`,
      `podeExecutar`) até T010 passar, com a nota de sincronização apontando para
      `apps/api/src/vertere_api/auth/service.py::_PERMISSOES` (mesmo formato do comentário de
      `apps/web/src/shell/itensDeNavegacao.ts`).
- [X] T012 [P] Escrever testes falhos para `formatarMoeda` em `apps/web/src/ui/formatacao.test.ts`:
  - `'50.00'` → `'R$ 50,00'`;
  - `'1234.5'` → `'R$ 1.234,50'`;
  - `40` → `'R$ 40,00'`;
  - `'10.005'` → arredonda para 2 casas;
  - comparar com U+00A0, conforme a nota de research.md, Decisão 5.
- [ ] T013 Implementar `apps/web/src/ui/formatacao.ts` (`formatarMoeda`, com um
      `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` criado uma vez no
      módulo) até T012 passar.

**Checkpoint**: peças compartilhadas prontas e suíte com `maxWorkers` fixado. As telas ainda se
comportam como antes, porque nenhuma consome o retorno de `criar`/`editar`.

---

## Phase 3: User Story 1 - Formulário não perde o que foi digitado (Priority: P1) 🎯 MVP

**Goal**: os quatro formulários só fecham com sucesso, preservam os dados em erro, não enviam duas
vezes e têm "Cancelar"; a linha em edição da S12 ocupa a tabela toda (FR-001–FR-004, FR-019).

**Independent Test**: quickstart.md, Cenário 1, em cada tela.

### Formulários

- [ ] T014 [P] [US1] Escrever testes falhos em `apps/web/src/exames/FormularioExame.test.tsx`
      (props novas `aoSalvar: (dados) => Promise<ResultadoAcao>` e `aoFechar`):
  - sucesso chama `aoFechar`;
  - falha mantém os três campos com o que foi digitado e mostra a `mensagem` em `role="alert"`;
  - dois cliques em "Salvar" chamam `aoSalvar` uma vez;
  - "Salvar" e "Cancelar" ficam desabilitados enquanto o envio está pendente;
  - "Cancelar" chama `aoFechar` sem chamar `aoSalvar`;
  - a validação local de preço-base ≤ 0 (S13) continua barrando antes de `aoSalvar`.
- [ ] T015 [US1] Implementar em `apps/web/src/exames/FormularioExame.tsx` com `useEnvioFormulario`
      até T014 passar.
- [ ] T016 [P] [US1] Escrever os mesmos testes de T014 para
      `apps/web/src/exames/FormularioRegraPlantao.test.tsx`, incluindo a validação local de valor
      adicional ≤ 0.
- [ ] T017 [US1] Implementar em `apps/web/src/exames/FormularioRegraPlantao.tsx` até T016 passar.
- [ ] T018 [P] [US1] Escrever os mesmos testes de T014 para
      `apps/web/src/clinicas/FormularioClinica.test.tsx`, com os campos Nome, CNPJ, Endereço,
      Telefone e E-mail. O CNPJ continua somente leitura em edição.
- [ ] T019 [US1] Implementar em `apps/web/src/clinicas/FormularioClinica.tsx` até T018 passar.
- [ ] T020 [P] [US1] Escrever os mesmos testes de T014 para
      `apps/web/src/veterinarios/FormularioVeterinario.test.tsx`. A mensagem "Nenhuma clínica
      ativa cadastrada — …" continua aparecendo quando não há clínica ativa, agora com "Cancelar"
      chamando `aoFechar`.
- [ ] T021 [US1] Implementar em `apps/web/src/veterinarios/FormularioVeterinario.tsx` até T020
      passar.

### Retrofit dos hooks da S12 sobre `useColecaoCrud` (research.md, Decisão 3)

- [ ] T022 [P] [US1] Reescrever `apps/web/src/clinicas/useClinicas.test.ts` para o contrato novo,
      com a API (`clinicasApi`) mockada como hoje:
  - `criar`/`editar` devolvem `ResultadoAcao`;
  - `inativar`, `reativar` e `definirPrazoPagamento` preenchem `erro` em falha;
  - com `termoBusca` preenchido, a carga usa `buscarClinicasPorNome`, senão `listarClinicas`,
    ambos com `apenasAtivas`;
  - mudar `termoBusca` ou `apenasAtivas` recarrega;
  - toda ação bem-sucedida recarrega;
  - `aviso` exposto;
  - 404 → `Clínica não encontrada — pode ter sido removida por outra sessão.`;
  - 409 → `Já existe uma clínica cadastrada com esse CNPJ.`

  Manter os nomes públicos já usados pela tela (`clinicas`, `termoBusca`, `definirTermoBusca`,
  `apenasAtivas`, `definirApenasAtivas`, …).
- [ ] T023 [US1] Reimplementar `apps/web/src/clinicas/useClinicas.ts` sobre
      `apps/web/src/api/useColecaoCrud.ts` até T022 passar.
- [ ] T024 [P] [US1] Reescrever `apps/web/src/veterinarios/useVeterinarios.test.ts` no mesmo
      molde de T022:
  - a carga usa `buscarVeterinariosPorNome` com `termoBusca`, senão `listarVeterinarios`, ambos
    com `filtroClinicaId` e `apenasAtivos`;
  - 404 → `Veterinário não encontrado — pode ter sido removido por outra sessão.`;
  - 409 → `Já existe um veterinário cadastrado com esse CRMV.`
- [ ] T025 [US1] Reimplementar `apps/web/src/veterinarios/useVeterinarios.ts` sobre
      `useColecaoCrud` até T024 passar.

### Telas

- [ ] T026 [P] [US1] Escrever testes falhos em `apps/web/src/clinicas/TelaClinicas.test.tsx`:
  - com `criar` mockado devolvendo `{ok:false, mensagem:'m'}`, o formulário "Nova clínica"
    continua aberto, com os valores digitados e a mensagem;
  - com `{ok:true}`, o formulário fecha;
  - "Cancelar" fecha sem chamar `criar`;
  - o mesmo para a edição por linha;
  - a célula da linha em edição tem `colspan="6"` (FR-019).
- [ ] T027 [US1] Ligar `apps/web/src/clinicas/TelaClinicas.tsx` ao contrato novo
      (`aoSalvar` devolve o resultado do hook, `aoFechar` fecha) e corrigir o `colSpan` até T026
      passar.
- [ ] T028 [P] [US1] Escrever os mesmos testes de T026 em
      `apps/web/src/veterinarios/TelaVeterinarios.test.tsx`, com `colspan="6"`.
- [ ] T029 [US1] Ligar `apps/web/src/veterinarios/TelaVeterinarios.tsx` até T028 passar.
- [ ] T030 [P] [US1] Escrever os mesmos testes de T026 em
      `apps/web/src/exames/TelaExames.test.tsx`, para os formulários de exame e de regra de
      plantão, novo e edição. O `colspan` da S13 (5 para admin) continua igual.
- [ ] T031 [US1] Ligar `apps/web/src/exames/TelaExames.tsx` até T030 passar.

**Checkpoint**: US1 completa. Cenário 1 do quickstart reproduzível nas quatro telas.

---

## Phase 4: User Story 2 - Erros sempre visíveis e compreensíveis (Priority: P1)

**Goal**: falha de rede na S12 vira mensagem (FR-005), e 422/500 viram texto legível nas quatro
telas (FR-006–FR-008), corrigindo o "todo 422 vira CNPJ inválido".

**Independent Test**: quickstart.md, Cenário 2.

- [ ] T032 [P] [US2] Escrever testes falhos de mensagem em
      `apps/web/src/clinicas/useClinicas.test.ts`:
  - `TypeError` de rede na carga → `erro` igual à mensagem de sem conexão (FR-005; pode nascer
    verde por causa de T023, registrar);
  - 422 com `detail` lista em `email` → `Verifique o campo E-mail: valor inválido.`, e nunca a
    mensagem de CNPJ;
  - 422 com `detail` string contendo `CNPJ` → `CNPJ inválido — verifique o formato informado.`;
  - 500 → `Problema no servidor. Tente novamente em instantes.`
- [ ] T033 [US2] Ajustar `mensagemDeErro` em `apps/web/src/clinicas/useClinicas.ts` até T032
      passar:
  - 422 só vira mensagem de CNPJ quando o `detail` string contém `CNPJ`;
  - todo o resto cai em `mensagemDeErroPadrao` com os rótulos `{ nome: 'Nome', cnpj: 'CNPJ',
    endereco: 'Endereço', telefone: 'Telefone', email: 'E-mail' }`.
- [ ] T034 [P] [US2] Escrever os testes equivalentes em
      `apps/web/src/veterinarios/useVeterinarios.test.ts`:
  - rede → sem conexão;
  - 422 lista em `email` → `Verifique o campo E-mail: valor inválido.`;
  - 422 com detail contendo `CRMV` → `Informe o CRMV do veterinário.`;
  - 422 com detail `Clínica … não encontrada` → `A clínica selecionada não existe mais — atualize
    a lista de clínicas.`;
  - 500 → servidor.
- [ ] T035 [US2] Ajustar `mensagemDeErro` em `apps/web/src/veterinarios/useVeterinarios.ts` até
      T034 passar, com os rótulos `{ nome: 'Nome', crmv: 'CRMV', telefone: 'Telefone', email:
      'E-mail', clinica_id: 'Clínica' }`.
- [ ] T036 [P] [US2] Escrever testes em `apps/web/src/exames/useExames.test.ts` e
      `apps/web/src/exames/useRegrasPlantao.test.ts`:
  - 422 com detail string `Preço-base deve ser maior que zero.` passa como está (contrato de US3);
  - 422 lista em `preco_base` → `Verifique o campo Preço-base: …`;
  - 422 lista em `valor_adicional` → `Verifique o campo Valor adicional: …`;
  - 500 → servidor;
  - 404 continua com a mensagem específica da S13.
- [ ] T037 [US2] Trocar o fallback `extrairDetalheErro` por `mensagemDeErroPadrao` em
      `apps/web/src/exames/useExames.ts` e `apps/web/src/exames/useRegrasPlantao.ts` até T036
      passar, com os rótulos:
  - exames: `{ categoria: 'Categoria', nome: 'Nome', preco_base: 'Preço-base' }`;
  - regras: `{ dia_semana: 'Dia da semana', hora_inicio: 'Horário de início', hora_fim: 'Horário
    de fim', valor_adicional: 'Valor adicional' }`.

**Checkpoint**: US2 completa. Nenhuma mensagem das quatro telas expõe JSON ou texto técnico (SC-002).

---

## Phase 5: User Story 3 - Servidor rejeita preço e dados inválidos de exames (Priority: P1)

**Goal**: FR-009–FR-012 no backend de S5, contrato em contracts/api-exames-validacao.md.

**Independent Test**: quickstart.md, Cenário 3 (curl).

**Independente das phases 2–4**: pode ser feita em paralelo com o frontend.

- [ ] T038 [P] [US3] Escrever testes falhos na seam de service em
      `apps/api/tests/test_exames_exame_service.py`, com o `ExameRepositorioFake` existente.
  - Cadastrar e editar levantam `ExameInvalido` com a mensagem exata, sem gravar nada no
    repositório:
    - `preco_base` `Decimal('0')` e `Decimal('-10')` → `"Preço-base deve ser maior que zero."`;
    - `categoria` `""` e `"   "` → `"Categoria não pode ficar vazia."`;
    - `nome` `""` e `"   "` → `"Nome não pode ficar vazio."`.
  - Precedência: com categoria e preço inválidos ao mesmo tempo, a mensagem é a da categoria.
  - `categoria="  Hematologia  "` é gravada e devolvida como `"Hematologia"`.
  - `editar_exame` com dados inválidos e id inexistente levanta `ExameInvalido`, não
    `ExameNaoEncontrado`.
  - `inativar_exame` e `reativar_exame` de um exame já gravado com `preco_base=-10` funcionam.
- [ ] T039 [US3] Implementar `ExameInvalido` e a validação em `cadastrar_exame`/`editar_exame` de
      `apps/api/src/vertere_api/exames/service.py` até T038 passar. Em `editar_exame`, validar antes
      de buscar.
- [ ] T040 [P] [US3] Escrever testes falhos em `apps/api/tests/test_exames_regra_plantao_service.py`:
  - `valor_adicional` `Decimal('0')` e `Decimal('-1')` em cadastrar e editar levantam
    `RegraPlantaoInvalida("Valor adicional deve ser maior que zero.")`, sem gravar;
  - `hora_inicio > hora_fim` continua aceito;
  - `editar_regra_plantao` inválido com id inexistente levanta `RegraPlantaoInvalida`.
- [ ] T041 [US3] Implementar `RegraPlantaoInvalida` e a validação em
      `cadastrar_regra_plantao`/`editar_regra_plantao` de `apps/api/src/vertere_api/exames/service.py`
      até T040 passar.
- [ ] T042 [P] [US3] Escrever testes falhos de router em `apps/api/tests/test_exames_router.py`
      (`TestClient`, admin):
  - `POST /exames` com `preco_base: -10` → 422 `{"detail": "Preço-base deve ser maior que zero."}`;
  - `PATCH /exames/{id}` com `nome: "   "` → 422 `Nome não pode ficar vazio.`;
  - `POST /exames` com `categoria: "  Hematologia  "` → 201 com `"categoria": "Hematologia"`;
  - `POST /regras-plantao` e `PATCH /regras-plantao/{id}` com `valor_adicional: 0` → 422 `Valor
    adicional deve ser maior que zero.`;
  - em todos os casos de 422, `GET` confirma que nada foi gravado ou alterado.
- [ ] T043 [US3] Converter `ExameInvalido`/`RegraPlantaoInvalida` em
      `HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(erro))` nos quatro endpoints de
      `apps/api/src/vertere_api/exames/router.py` (mesmo padrão de `CrmvVazio` em
      `veterinarios/router.py`) até T042 passar. Rodar `uv run pytest --cov` em `apps/api`
      inteiro.

**Checkpoint**: US3 completa. SC-003 verificável por curl.

---

## Phase 6: User Story 4 - Lista coerente com os filtros depois de cada ação (Priority: P2)

**Goal**: a recarga pós-ação (já em `useColecaoCrud`, T007) vira comportamento visível, com o aviso
de FR-014 nas quatro telas.

**Independent Test**: quickstart.md, Cenário 4.

- [ ] T044 [P] [US4] Escrever testes falhos nas três telas:
  - em `apps/web/src/exames/TelaExames.test.tsx`, `apps/web/src/clinicas/TelaClinicas.test.tsx` e
    `apps/web/src/veterinarios/TelaVeterinarios.test.tsx`, com o hook mockado devolvendo
    `aviso: 'Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.'`, a tela
    mostra o texto em `role="status"`, distinto do `role="alert"` de erro;
  - em `TelaExames`, o aviso aparece nas duas abas (catálogo e regras).
- [ ] T045 [US4] Renderizar `aviso` em `role="status"` em `apps/web/src/exames/TelaExames.tsx`,
      `apps/web/src/clinicas/TelaClinicas.tsx` e `apps/web/src/veterinarios/TelaVeterinarios.tsx`
      até T044 passar.

**Checkpoint**: US4 completa.

---

## Phase 7: User Story 5 - Valores em reais (Priority: P2)

**Goal**: FR-015.

**Independent Test**: quickstart.md, Cenário 5.

- [ ] T046 [US5] Escrever testes falhos em `apps/web/src/exames/TelaExames.test.tsx`:
  - exame com `preco_base: '1234.50'` aparece como `R$ 1.234,50`;
  - regra com `valor_adicional: '50.00'` aparece como `R$ 50,00`.
- [ ] T047 [US5] Usar `formatarMoeda` nas células de preço-base e valor adicional de
      `apps/web/src/exames/TelaExames.tsx` até T046 passar. Os inputs dos formulários continuam
      numéricos crus, porque a formatação é só para exibição.

**Checkpoint**: US5 completa.

---

## Phase 8: User Story 6 - Cada papel vê só o que pode fazer (Priority: P3)

**Goal**: FR-016/FR-017. Nenhum `papel ===` nas telas, e a escrita da S12 aparece só para admin.

**Independent Test**: quickstart.md, Cenário 6.

- [ ] T048 [P] [US6] Escrever testes falhos em `apps/web/src/clinicas/TelaClinicas.test.tsx`:
  - adicionar `vi.mock('../autenticacao/SessaoContext')`, com papel `admin` como padrão dos
    testes existentes;
  - `atendente` e `tecnico` veem a lista, "Buscar por nome" e "Apenas ativas", mas não veem "Nova
    clínica", "Editar", "Inativar", "Reativar", "Salvar prazo" nem o cabeçalho "Ações";
  - `admin` vê todos.
- [ ] T049 [US6] Esconder em `apps/web/src/clinicas/TelaClinicas.tsx` a escrita e a coluna "Ações"
      com `podeExecutar(papel, 'CLINICA_GERENCIAR')` até T048 passar. O `colSpan` da linha em
      edição segue a contagem de colunas.
- [ ] T050 [P] [US6] Escrever os testes equivalentes em
      `apps/web/src/veterinarios/TelaVeterinarios.test.tsx` (`VETERINARIO_GERENCIAR`: "Novo
      veterinário", "Editar", "Inativar", "Reativar", cabeçalho "Ações"; busca e filtros continuam
      visíveis).
- [ ] T051 [US6] Esconder a escrita em `apps/web/src/veterinarios/TelaVeterinarios.tsx` com
      `podeExecutar` até T050 passar.
- [ ] T052 [US6] Trocar, em `apps/web/src/exames/TelaExames.tsx`:
  - `papel === 'admin'` por `podeExecutar(papel, 'EXAME_GERENCIAR')` no catálogo e por
    `podeExecutar(papel, 'REGRA_PLANTAO_GERENCIAR')` nas regras;
  - `papel === 'admin' || papel === 'atendente'` por `podeExecutar(papel, 'REGRA_PLANTAO_VER')`.

  É uma refatoração sem mudança de comportamento: os testes existentes de papel em
  `TelaExames.test.tsx` são a rede. Confirmar no fim com
  `grep -rn "papel ===" apps/web/src --include=*.tsx` que não sobra comparação de papel em tela
  (FR-016).

**Checkpoint**: US6 completa.

---

## Phase 9: User Story 7 - Suíte de testes do frontend estável (Priority: P3)

**Goal**: FR-018 e SC-006 (research.md, Decisão 7).

**Independent Test**: quickstart.md, Cenário 7.

- [ ] T053 [US7] Trocar as chamadas diretas `userEvent.*` pelo helper `usuario()` de
      `apps/web/tests/usuario.ts` nos arquivos de teste que ainda as usam:
  - `apps/web/src/autenticacao/TelaLogin.test.tsx`;
  - `apps/web/src/shell/ShellAutenticado.test.tsx`;
  - e qualquer outro `*.test.tsx` de `apps/web/src` que a Phase 3 a 8 não tenha reescrito
    (conferir com `grep -rln "userEvent\." apps/web/src`).

  Sem mudar asserções. Suíte verde.
- [ ] T054 [US7] Rodar `pnpm --dir apps/web test` 10 vezes seguidas e registrar nesta task o
      resultado de cada uma (testes, falhas, duração).
  - Aceite: 10/10 sem falha, com o mesmo número de testes, sem `.skip`/`.only`/`.todo` novos, sem
    `testTimeout` aumentado e sem `retry`.
  - Se falhar: medir com `--reporter=verbose`, tratar o teste mais lento e repetir. Nunca relaxar
    o critério; se nada resolver, registrar em "Descobertas" da spec e parar para decisão do
    usuário.

**Checkpoint**: US7 completa.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T055 [P] Rodar e registrar nesta task:
  - `pnpm --dir apps/web lint` (sem achado novo);
  - `pnpm --dir apps/web build`;
  - `pnpm --dir apps/web test:cobertura`, com números de `src/api/`, `src/ui/`,
    `src/autenticacao/permissoesDeTela.ts`, `src/clinicas/`, `src/veterinarios/` e `src/exames/`;
  - `uv run pytest --cov=vertere_api.exames` em `apps/api` (cobertura de `exames/`).
- [ ] T056 Executar `specs/014-polimento-telas-web/quickstart.md` cenários 1 a 7 na UI real
      (Chrome) e na API real, por papel, e registrar o resultado de cada cenário nesta task.
      Divergência vira task nova ou "Descobertas", nunca é ignorada.
- [ ] T057 Atualizar `handoff.md` com o estado da S14 (implementada, números de T054–T056, o que
      ficou em "Descobertas") e o próximo passo (`/fechar-spec S14`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependência.
- **Foundational (Phase 2)**: depende de T001.
  - T002 e T003 primeiro.
  - Os pares teste→implementação (T004→T005, T006→T007, T008→T009, T010→T011, T012→T013) são
    independentes entre si.
- **US1 (Phase 3)**: depende de T005, T007 e T009 (formulários e hooks), e de T003 (helper nos
  testes).
- **US2 (Phase 4)**: depende de T023/T025 (hooks da S12 já migrados) e de T005.
- **US3 (Phase 5)**: só depende de T001. Pode correr inteira em paralelo com as phases 2–4.
- **US4 (Phase 6)**: depende de T007, T023, T025 e das telas de US1 (T027, T029, T031).
- **US5 (Phase 7)**: depende de T013. Mexe em `TelaExames.tsx`, então em sequência com T031/T045.
- **US6 (Phase 8)**: depende de T011 e das telas de US1/US4, que mexem nos mesmos arquivos.
- **US7 (Phase 9)**: depende de todas as phases de frontend (é a verificação final da suíte).
- **Polish (Phase 10)**: depende de tudo.

### User Story Dependencies

- US1 é o MVP e a base das telas.
- US2 e US4 se apoiam no retrofit de US1.
- US3 é independente.
- US5 e US6 são independentes entre si, mas tocam `TelaExames.tsx` em sequência.
- US7 fecha.

### Within Each User Story

- O teste vem antes da implementação e fica vermelho antes do verde.
- Um commit por task (`test(s14): T0NN …` / `feat(s14): T0NN …` / `fix(s14): …` /
  `refactor(s14): …`).
- `[X]` em `tasks.md` vai no commit da própria task.

### Parallel Opportunities

- T004, T006, T008, T010 e T012 (Phase 2): arquivos de teste diferentes.
- T014, T016, T018 e T020 (formulários), depois T022 e T024 (hooks), depois T026, T028 e T030
  (telas).
- Toda a Phase 5 (backend) em paralelo com o frontend.
- T032, T034 e T036 (Phase 4).
- T048 e T050 (Phase 8).

---

## Parallel Example: Phase 2

```text
Task: "T004 testes de mensagemDeErroPadrao em apps/web/src/api/erroApi.test.ts"
Task: "T008 testes de useEnvioFormulario em apps/web/src/ui/useEnvioFormulario.test.ts"
Task: "T010 testes de podeExecutar em apps/web/src/autenticacao/permissoesDeTela.test.ts"
Task: "T012 testes de formatarMoeda em apps/web/src/ui/formatacao.test.ts"
Task: "T038 testes de service de exame em apps/api/tests/test_exames_exame_service.py"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 e Phase 2.
2. Phase 3 (US1): formulários que não perdem dados, nas quatro telas.
3. **Parar e validar**: quickstart, Cenário 1.

### Incremental Delivery

1. Fundação → US1 (MVP) → US2 (mensagens) → US3 (backend, pode ter vindo antes, em paralelo).
2. US4 (filtros) → US5 (moeda) → US6 (papéis).
3. US7 (estabilidade, 10 execuções) → Polish (lint, build, cobertura, quickstart na UI real,
   handoff) → `/fechar-spec S14` → `/code-review` → PR.

---

## Notes

- Mudanças de escopo achadas durante a implementação vão para "Descobertas" de `spec.md` e param
  para decisão do usuário (CLAUDE.md, Guardrails).
- `tipos.gerados.ts` não muda: a validação de US3 fica no service, não em `Field(...)`
  (contracts/api-exames-validacao.md).
- Nenhum valor monetário é calculado no frontend; `formatarMoeda` só exibe (Princípio I).
