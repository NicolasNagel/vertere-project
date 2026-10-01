# Feature Specification: Tela de Exames & Precificação (Web)

**Feature Branch**: `013-exames-precificacao-web`

**Created**: 2026-09-29

**Status**: entregue

**Input**: User description: "Tela de listagem/CRUD de Exames (catálogo de preços) e Regras de Plantão no frontend (apps/web), consumindo os endpoints já existentes do módulo S5 (Exames & Precificação) do backend. Substitui o placeholder TelaEmConstrucao da seção 'Exames' do menu, seguindo o mesmo padrão de tela estabelecido em S12 (Clínicas/Veterinários)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listar e cadastrar exames do catálogo (Priority: P1)

Uma pessoa da equipe do laboratório (admin, atendente ou técnico) acessa a seção "Exames" no menu
e vê a lista de exames cadastrados (catálogo de preços). Um administrador pode cadastrar um novo
exame informando categoria, nome e preço-base.

**Why this priority**: Sem catálogo de exames visível, ninguém consegue consultar o preço vigente
sem abrir a planilha antiga — é o valor mínimo desta spec e pré-requisito direto da futura tela de
Atendimentos (escolha de exames com preço).

**Independent Test**: Pode ser testado sozinho logando como admin, abrindo "Exames", cadastrando um
exame novo com categoria/nome/preço-base válidos e vendo-o aparecer na lista.

**Acceptance Scenarios**:

1. **Given** a pessoa logada tem papel admin, atendente ou técnico, **When** ela abre a seção
   "Exames", **Then** vê a lista de exames cadastrados com categoria, nome, preço-base e status
   (ativo/inativo).
2. **Given** a pessoa logada tem papel admin, **When** ela preenche o formulário de novo exame com
   categoria, nome e preço-base válidos e confirma, **Then** o exame aparece na lista sem precisar
   recarregar a página.
3. **Given** a pessoa logada tem papel atendente ou técnico, **When** ela abre a seção "Exames",
   **Then** ela vê a lista mas não vê nenhuma ação de cadastrar/editar/inativar/reativar exame.

---

### User Story 2 - Editar, inativar e reativar exame (Priority: P1)

Um administrador edita categoria, nome ou preço-base de um exame já cadastrado, e pode inativá-lo
ou reativá-lo sem apagar o histórico de atendimentos que o usaram (histórico ainda não existe nesta
spec, mas a garantia é a mesma decisão já tomada no backend em S5).

**Why this priority**: Preço muda com frequência real (reajuste de tabela) e exame descontinuado
precisa saber de vista sem apagar registro — mesmo nível de prioridade do cadastro inicial, mesmo
padrão já usado em S12 para Clínicas/Veterinários.

**Independent Test**: Pode ser testado abrindo um exame existente, editando o preço-base,
inativando-o, vendo o status mudar na lista, e reativando-o de volta.

**Acceptance Scenarios**:

1. **Given** um exame está listado, **When** um administrador edita categoria, nome ou preço-base e
   confirma, **Then** os dados atualizados aparecem na lista.
2. **Given** um exame ativo está listado, **When** um administrador o inativa, **Then** o status
   muda para "inativo" na lista, sem excluir o registro.
3. **Given** um exame inativo está listado, **When** um administrador o reativa, **Then** o status
   volta para "ativo".

---

### User Story 3 - Listar e cadastrar regras de plantão (Priority: P2)

Um administrador acessa, dentro da mesma seção "Exames", a lista de regras de adicional de plantão
(dia da semana + faixa de horário + valor adicional) e cadastra uma nova regra.

**Why this priority**: Depende do catálogo de exames já existir como conceito na tela (User Story
1) e é consumida pela futura tela de Atendimentos para sugerir o adicional — mas o cadastro em si
é menos frequente que o de exames, por isso prioridade P2.

**Independent Test**: Pode ser testado sozinho logando como admin, abrindo a aba/seção de regras de
plantão dentro de "Exames", cadastrando uma regra nova (ex: sexta-feira, 18:00–06:00, adicional de
R$ 50) e vendo-a na lista.

**Acceptance Scenarios**:

1. **Given** a pessoa logada tem papel admin ou atendente, **When** ela abre a seção de regras de
   plantão, **Then** vê a lista de regras cadastradas com dia da semana, horário de início, horário
   de fim, valor adicional e status (ativa/inativa).
2. **Given** a pessoa logada tem papel admin, **When** ela preenche o formulário de nova regra com
   dia da semana, horário de início, horário de fim e valor adicional válidos e confirma, **Then**
   a regra aparece na lista sem precisar recarregar a página.
3. **Given** a pessoa logada tem papel técnico, **When** ela tenta acessar a seção de regras de
   plantão, **Then** o sistema nega o acesso (mesma checagem de papel do backend, `REGRA_PLANTAO_VER`
   concedida só a admin e atendente).

---

### User Story 4 - Editar e inativar regra de plantão (Priority: P2)

Um administrador edita o horário ou valor adicional de uma regra de plantão já cadastrada, e pode
inativá-la quando ela deixa de valer.

**Why this priority**: Mesma lógica de manutenção de cadastro da User Story 2, aplicada à regra de
plantão — depende da tela de listagem da User Story 3 já existir.

**Independent Test**: Pode ser testado abrindo uma regra existente, editando o valor adicional,
inativando-a, e vendo o status mudar na lista.

**Acceptance Scenarios**:

1. **Given** uma regra de plantão está listada, **When** um administrador edita dia da semana,
   horário de início, horário de fim ou valor adicional e confirma, **Then** os dados atualizados
   aparecem na lista.
2. **Given** uma regra ativa está listada, **When** um administrador a inativa, **Then** o status
   muda para "inativa" na lista, sem excluir o registro.
3. **Given** uma regra inativa está listada, **When** um administrador a reativa, **Then** o status
   volta para "ativa".

---

### Edge Cases

- O que acontece quando a pessoa tenta cadastrar um exame com preço-base negativo ou zero, ou uma
  regra de plantão com valor adicional negativo? O formulário deve validar e impedir a submissão
  antes de chamar a API, mostrando mensagem de erro específica.
- O que acontece quando a pessoa cadastra uma regra de plantão com horário de início maior que o
  horário de fim (plantão cruzando a meia-noite, ex: 18:00–06:00)? A tela deve aceitar normalmente
  — o backend (S5) já trata esse caso como janela cruzando o dia, não é erro.
- O que acontece se a sessão expirar enquanto a pessoa está no meio de um cadastro/edição? Segue o
  handler global de sessão expirada já existente no shell autenticado (S11).
- O que acontece quando a busca/listagem de exames ou regras não encontra nenhum resultado (ex:
  filtro "apenas ativos" sem nenhum exame ativo)? A lista deve mostrar um estado vazio claro,
  distinto de erro de carregamento.
- O que acontece quando um atendente ou técnico (sem `EXAME_GERENCIAR`) abre a tela de exames? A
  lista aparece normalmente (leitura liberada aos 3 papéis de staff), mas nenhum botão de
  cadastrar/editar/inativar/reativar é exibido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE substituir o placeholder da seção "Exames" no menu (hoje
  `TelaEmConstrucao`, `implementado: false` em `itensDeNavegacao.ts`) por uma tela de conteúdo
  real, mantendo os papéis já autorizados para essa seção (`admin`, `atendente`, `tecnico`).
- **FR-002**: O sistema DEVE listar todos os exames cadastrados, mostrando categoria, nome,
  preço-base e status (ativo/inativo), com opção de filtrar por categoria e para mostrar apenas os
  ativos, visível para os papéis `admin`, `atendente` e `tecnico`.
- **FR-003**: O sistema DEVE permitir, apenas ao papel `admin`, cadastrar um novo exame informando
  categoria, nome e preço-base, validando que o preço-base é um valor monetário positivo antes de
  confirmar.
- **FR-004**: O sistema DEVE permitir, apenas ao papel `admin`, editar categoria, nome e preço-base
  de um exame existente.
- **FR-005**: O sistema DEVE permitir, apenas ao papel `admin`, inativar e reativar um exame,
  preservando o registro e seu histórico.
- **FR-006**: O sistema DEVE listar todas as regras de plantão cadastradas, mostrando dia da
  semana, horário de início, horário de fim, valor adicional e status (ativa/inativa), com opção de
  filtrar para mostrar apenas as ativas, visível para os papéis `admin` e `atendente` (não
  `tecnico`, refletindo `Acao.REGRA_PLANTAO_VER` do backend).
- **FR-007**: O sistema DEVE permitir, apenas ao papel `admin`, cadastrar uma nova regra de plantão
  informando dia da semana, horário de início, horário de fim e valor adicional, validando que o
  valor adicional é positivo antes de confirmar. Horário de início maior que horário de fim é
  aceito (representa plantão cruzando a meia-noite).
- **FR-008**: O sistema DEVE permitir, apenas ao papel `admin`, editar dia da semana, horário de
  início, horário de fim e valor adicional de uma regra de plantão existente.
- **FR-009**: O sistema DEVE permitir, apenas ao papel `admin`, inativar e reativar uma regra de
  plantão, preservando o registro e seu histórico.
- **FR-010**: O sistema DEVE impedir que uma pessoa sem papel autorizado (fora de
  `admin`/`atendente`/`tecnico`) acesse a tela de Exames, e impedir que o papel `tecnico` acesse a
  listagem de regras de plantão — reaproveitando o controle de acesso por papel já existente no
  shell (S11) e as `Acao` do backend (S5), sem reimplementar checagem de papel na tela.
- **FR-011**: O sistema DEVE ocultar (não apenas desabilitar sem explicação) os controles de
  cadastrar/editar/inativar/reativar exame e regra de plantão para papéis sem permissão de
  gerenciamento (`atendente`, `tecnico`), já que a leitura do catálogo é liberada a eles mas a
  escrita não.
- **FR-012**: O sistema DEVE mostrar mensagens de erro específicas e compreensíveis para cada falha
  de validação já sinalizada pelo backend (preço-base inválido, valor adicional inválido, exame ou
  regra de plantão não encontrado), sem expor detalhes técnicos da API.

### Key Entities *(include if feature involves data)*

- **Exame**: item do catálogo de preços do laboratório. Atributos relevantes na tela: categoria,
  nome, preço-base (monetário), status (ativo/inativo). Já existe no backend (S5); esta spec só
  adiciona a interface web.
- **Regra de Plantão**: regra de adicional de preço aplicada por dia da semana e faixa de horário.
  Atributos relevantes na tela: dia da semana, horário de início, horário de fim, valor adicional
  (monetário), status (ativa/inativa). Já existe no backend (S5); esta spec só adiciona a interface
  web. Não referencia Exame diretamente — é um adicional aplicado ao atendimento como um todo,
  calculado pela função `calcular_adicional_plantao` já implementada em S5.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa da equipe consegue consultar o preço-base de um exame específico em menos
  de 30 segundos a partir do login, sem precisar abrir a planilha antiga.
- **SC-002**: Um administrador consegue cadastrar um exame novo e vê-lo na lista em menos de 1
  minuto.
- **SC-003**: Um administrador consegue cadastrar uma regra de plantão nova e vê-la na lista em
  menos de 1 minuto.
- **SC-004**: 100% da seção "Exames" deixa de mostrar o placeholder de tela em construção para os
  papéis autorizados.
- **SC-005**: Toda tentativa de cadastro/edição com dado inválido (preço-base, valor adicional)
  resulta em mensagem de erro específica visível na tela, nunca em falha silenciosa ou tela
  quebrada.

## Assumptions

- Esta tela consome exclusivamente os endpoints já existentes de Exames & Precificação (S5) —
  nenhuma mudança de contrato ou nova regra de negócio no backend é necessária.
- O controle de acesso por papel desta tela segue o que já está definido em
  `itensDeNavegacao.ts`/`SessaoContext` (S11) para o nível de navegação (`admin`, `atendente`,
  `tecnico` veem a seção "Exames" no menu), refinado pelas `Acao` do backend (S5) para controles
  dentro da tela: leitura de exame liberada aos 3 papéis, leitura de regra de plantão restrita a
  `admin`/`atendente`, e toda escrita (cadastrar/editar/inativar/reativar, ambas entidades)
  restrita a `admin`.
- Exclusão definitiva de exame ou regra de plantão está fora de escopo — o ciclo de vida é sempre
  ativo/inativo, nunca remoção do registro (mesma decisão já tomada no backend em S5 e nas telas de
  S12).
- Busca textual por nome/categoria de exame não é obrigatória nesta spec — o backend (S5) já não
  oferece esse filtro (só categoria e status), e o PRD não pede busca textual para este módulo
  (diferente de Clínicas/Veterinários em S12). Fica para uma spec futura se a necessidade surgir.
- Paginação da lista não é obrigatória nesta spec: o volume esperado de exames e regras de plantão
  do laboratório é pequeno o suficiente para listagem completa sem paginação (mesma suposição já
  validada em S12).
- Exame e Regra de Plantão são apresentados na mesma seção de navegação "Exames" (não há item de
  menu separado para regras de plantão em `itensDeNavegacao.ts`), organizados como duas
  sub-seções/abas de uma mesma tela — decisão de apresentação, não de dados; a spec não prescreve o
  layout exato (lista única com toggle, abas, ou seções lado a lado), deixando essa escolha para o
  `plan.md`.
- A sugestão automática de adicional de plantão para um atendimento real (endpoint que expõe
  `calcular_adicional_plantao`) não é usada por nenhuma tela nesta spec — só a futura tela de
  Atendimentos vai consumi-la. Aqui, a tela de regras de plantão é puro CRUD de cadastro.

## Descobertas

- **Backend (S5) não valida positividade nem obrigatoriedade de alguns campos que esta spec exige
  na UI**: `CriarExameRequest`/`EditarExameRequest`/`CriarRegraPlantaoRequest`/
  `EditarRegraPlantaoRequest` (`apps/api/src/vertere_api/exames/schemas.py`) não têm constraint
  Pydantic `gt=0` em `preco_base`/`valor_adicional`, nem impedem `categoria`/`nome` vazios — o
  backend aceita e persiste esses valores sem rejeitar (achado durante `/speckit-plan`, ver
  `data-model.md`). FR-003/FR-007 desta spec continuam válidos como validação **de frontend**
  (impedir a submissão antes de chamar a API), mas não há uma segunda camada de defesa no backend
  hoje. Corrigir o schema do backend está fora do escopo desta spec (frontend puro) — fica
  registrado aqui para decisão do usuário sobre abrir ou não uma spec/task de correção do backend.

## Verificação

`/fechar-spec S13` em 2026-09-30: **❌ BLOQUEADA**. Relatório:
`docs/specs/relatorios/S13-verificacao.md`. Pendências, corrigidas pela Phase 8 de `tasks.md`
(T041-T048), exceto a 5, que é T039:

1. **FR-002**: filtros do catálogo de exames (categoria, apenas ativos) ausentes na tela. O hook
   `useExames` já tinha os setters, mas `CatalogoDeExames` não os usava.
2. **FR-006**: filtro "apenas ativas" das regras de plantão ausente na tela.
3. **Edge Case "estado vazio"**: a lista vazia renderizava só o cabeçalho da tabela.
4. **T008/T025**: faltava a "mensagem de erro visível" para valor zero ou negativo. Os testes não
   cobriam valor negativo e só checavam o bloqueio do `aoSalvar`.
5. **T039**: estava marcada `[X]` sem o percurso pela UI real. Foi desmarcada.

`/fechar-spec S13` (3ª rodada; a 2ª travou sem veredito) em 2026-10-01: **❌ BLOQUEADA**. As
pendências 1-5 acima foram confirmadas como resolvidas, e a T039 foi refeita na UI real. Pendência
nova, a única:

6. **T038**: estava marcada `[X]` sem "cobertura visível" (Princípio IV da constituição). Em
   `apps/web` não há provider de cobertura: `vitest run --coverage` falha com
   `MISSING DEPENDENCY @vitest/coverage-v8`. A S12 tem a mesma lacuna. Aguardando decisão do
   usuário entre (a) adicionar `@vitest/coverage-v8` e registrar os números, ou (b) reescrever a
   T038 e registrar a divergência com a constituição.

`/fechar-spec S13` (4ª rodada) em 2026-10-01: **✅ APROVADA**. As pendências 1-6 foram confirmadas
como resolvidas.
