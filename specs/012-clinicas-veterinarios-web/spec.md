# Feature Specification: Telas de Clínicas e Veterinários (Web)

**Feature Branch**: `012-clinicas-veterinarios-web`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Tela de listagem/CRUD de Clínicas e Veterinários no frontend (apps/web), consumindo os endpoints já existentes dos módulos S2 (Clínicas) e S3 (Veterinários) do backend. Primeira tela de conteúdo real do frontend, substituindo o placeholder TelaEmConstrucao para essas duas seções de navegação."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listar e cadastrar clínicas (Priority: P1)

Uma pessoa da equipe do laboratório (admin, atendente ou técnico) acessa a seção "Clínicas" no
menu e vê a lista de clínicas cadastradas, podendo cadastrar uma nova clínica preenchendo os dados
básicos (nome, CNPJ, endereço, telefone, e-mail).

**Why this priority**: Sem clínica cadastrada não há veterinário, paciente nem atendimento
vinculado — é o cadastro-base de toda a cadeia de dados do laboratório. É também a seção mais
simples do frontend para validar o primeiro padrão real de tela de listagem/CRUD.

**Independent Test**: Pode ser testado sozinho logando como admin, abrindo "Clínicas", cadastrando
uma clínica nova com CNPJ válido e vendo-a aparecer na lista.

**Acceptance Scenarios**:

1. **Given** a pessoa logada tem papel admin, atendente ou técnico, **When** ela abre a seção
   "Clínicas", **Then** vê a lista de clínicas cadastradas com nome, CNPJ, telefone, e-mail e
   status (ativa/inativa).
2. **Given** a lista de clínicas está aberta, **When** a pessoa preenche o formulário de nova
   clínica com dados válidos e confirma, **Then** a clínica aparece na lista sem precisar recarregar
   a página.
3. **Given** a pessoa está cadastrando uma clínica, **When** ela informa um CNPJ já cadastrado ou
   um CNPJ com formato inválido, **Then** o sistema mostra uma mensagem de erro específica e não
   cria a clínica.

---

### User Story 2 - Editar, inativar e reativar clínica (Priority: P1)

A pessoa da equipe edita os dados de uma clínica já cadastrada (exceto CNPJ) e pode inativá-la ou
reativá-la, além de ajustar o prazo de pagamento usado no fechamento financeiro.

**Why this priority**: Dado cadastrado sempre muda (endereço, telefone) e clínicas que encerram
contrato precisam ser inativadas sem perder o histórico — ambos são operações do dia a dia, no
mesmo nível de prioridade que o cadastro inicial.

**Independent Test**: Pode ser testado abrindo uma clínica existente, editando o telefone,
inativando-a, vendo o status mudar na lista, e reativando-a de volta.

**Acceptance Scenarios**:

1. **Given** uma clínica está listada, **When** a pessoa edita nome, endereço, telefone ou e-mail
   e confirma, **Then** os dados atualizados aparecem na lista.
2. **Given** uma clínica ativa está listada, **When** a pessoa a inativa, **Then** o status muda
   para "inativa" na lista, sem excluir o registro.
3. **Given** uma clínica inativa está listada, **When** a pessoa a reativa, **Then** o status volta
   para "ativa".
4. **Given** uma clínica está listada, **When** a pessoa altera o prazo de pagamento em dias,
   **Then** o novo prazo é salvo e refletido na lista/detalhe da clínica.

---

### User Story 3 - Listar e cadastrar veterinários vinculados a uma clínica (Priority: P2)

A pessoa da equipe acessa a seção "Veterinários", vê a lista de veterinários (podendo filtrar por
clínica) e cadastra um novo veterinário vinculado a uma clínica existente.

**Why this priority**: Depende de já existir ao menos uma clínica cadastrada (User Story 1), por
isso vem depois — mas é igualmente necessária antes de existir atendimento, já que todo atendimento
referencia um veterinário solicitante.

**Independent Test**: Pode ser testado sozinho (com pelo menos uma clínica já cadastrada) abrindo
"Veterinários", cadastrando um veterinário novo com CRMV válido vinculado a uma clínica, e vendo-o
na lista.

**Acceptance Scenarios**:

1. **Given** a pessoa logada tem papel admin, atendente ou técnico, **When** ela abre a seção
   "Veterinários", **Then** vê a lista de veterinários cadastrados com nome, CRMV, clínica
   vinculada e status (ativo/inativo).
2. **Given** a lista de veterinários está aberta, **When** a pessoa filtra por uma clínica
   específica, **Then** só os veterinários daquela clínica aparecem na lista.
3. **Given** a lista de veterinários está aberta, **When** a pessoa preenche o formulário de novo
   veterinário com CRMV válido e escolhe uma clínica existente, **Then** o veterinário aparece na
   lista vinculado à clínica escolhida.
4. **Given** a pessoa está cadastrando um veterinário, **When** ela informa um CRMV vazio, um CRMV
   já cadastrado, ou uma clínica inexistente, **Then** o sistema mostra uma mensagem de erro
   específica e não cria o veterinário.

---

### User Story 4 - Editar, inativar e reativar veterinário (Priority: P2)

A pessoa da equipe edita os dados de um veterinário já cadastrado (exceto CRMV e clínica) e pode
inativá-lo ou reativá-lo.

**Why this priority**: Mesma lógica de manutenção de cadastro da User Story 2, aplicada ao
veterinário — depende da tela de listagem da User Story 3 já existir.

**Independent Test**: Pode ser testado abrindo um veterinário existente, editando o telefone,
inativando-o, vendo o status mudar na lista, e reativando-o de volta.

**Acceptance Scenarios**:

1. **Given** um veterinário está listado, **When** a pessoa edita nome, telefone ou e-mail e
   confirma, **Then** os dados atualizados aparecem na lista.
2. **Given** um veterinário ativo está listado, **When** a pessoa o inativa, **Then** o status
   muda para "inativo" na lista, sem excluir o registro.
3. **Given** um veterinário inativo está listado, **When** a pessoa o reativa, **Then** o status
   volta para "ativo".

---

### Edge Cases

- O que acontece quando a pessoa tenta cadastrar um veterinário e não existe nenhuma clínica ativa
  cadastrada? O formulário deve deixar isso claro (ex: lista de clínicas vazia com orientação para
  cadastrar uma clínica primeiro) em vez de permitir submissão sem clínica selecionada.
- O que acontece se a sessão expirar enquanto a pessoa está no meio de um cadastro/edição? O
  comportamento deve seguir o handler global de sessão expirada já existente no shell autenticado
  (S11) — redirecionar para login preservando a intenção de retorno, sem perder feedback confuso.
- O que acontece quando a busca por nome (clínica ou veterinário) não encontra nenhum resultado?
  A lista deve mostrar um estado vazio claro, distinto de erro de carregamento.
- O que acontece se duas pessoas editam a mesma clínica/veterinário ao mesmo tempo? Sem
  travamento otimista nesta spec — a última gravação bem-sucedida prevalece (fora de escopo:
  controle de concorrência).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE substituir o placeholder de "Clínicas" e "Veterinários" no menu
  (hoje `TelaEmConstrucao`, `implementado: false` em `itensDeNavegacao.ts`) por telas de conteúdo
  real, mantendo os papéis já autorizados para essas seções (`admin`, `atendente`, `tecnico`).
- **FR-002**: O sistema DEVE listar todas as clínicas cadastradas, mostrando nome, CNPJ, telefone,
  e-mail e status (ativa/inativa), com opção de filtrar para mostrar apenas as ativas.
- **FR-003**: O sistema DEVE permitir buscar clínicas por nome (parcial, sem diferenciar
  maiúsculas/minúsculas).
- **FR-004**: O sistema DEVE permitir cadastrar uma nova clínica informando nome, CNPJ, endereço,
  telefone e e-mail, validando CNPJ (formato e duplicidade) antes de confirmar.
- **FR-005**: O sistema DEVE permitir editar nome, endereço, telefone e e-mail de uma clínica
  existente. CNPJ não é editável após o cadastro.
- **FR-006**: O sistema DEVE permitir inativar e reativar uma clínica, preservando o registro e seu
  histórico.
- **FR-007**: O sistema DEVE permitir definir/alterar o prazo de pagamento (em dias) de uma
  clínica.
- **FR-008**: O sistema DEVE listar todos os veterinários cadastrados, mostrando nome, CRMV,
  telefone, e-mail, clínica vinculada e status (ativo/inativo), com opção de filtrar por clínica e
  para mostrar apenas os ativos.
- **FR-009**: O sistema DEVE permitir buscar veterinários por nome (parcial, sem diferenciar
  maiúsculas/minúsculas), combinável com o filtro por clínica.
- **FR-010**: O sistema DEVE permitir cadastrar um novo veterinário informando nome, CRMV,
  telefone, e-mail e a clínica à qual pertence, validando CRMV (não vazio e sem duplicidade) e a
  existência da clínica antes de confirmar.
- **FR-011**: O sistema DEVE permitir editar nome, telefone e e-mail de um veterinário existente.
  CRMV e clínica vinculada não são editáveis após o cadastro.
- **FR-012**: O sistema DEVE permitir inativar e reativar um veterinário, preservando o registro e
  seu histórico.
- **FR-013**: O sistema DEVE impedir que uma pessoa sem papel autorizado (fora de
  `admin`/`atendente`/`tecnico`) acesse as telas de Clínicas e Veterinários, reaproveitando o
  controle de acesso por papel já existente no shell (S11) — nenhuma checagem nova de permissão é
  reimplementada nessas telas.
- **FR-014**: O sistema DEVE mostrar mensagens de erro específicas e compreensíveis para cada
  falha de validação já sinalizada pelo backend (CNPJ inválido, CNPJ duplicado, CRMV vazio, CRMV
  duplicado, clínica inexistente, clínica/veterinário não encontrado), sem expor detalhes técnicos
  da API.

### Key Entities *(include if feature involves data)*

- **Clínica**: cliente do laboratório que solicita exames. Atributos relevantes na tela: nome,
  CNPJ (imutável após cadastro), endereço, telefone, e-mail, status (ativa/inativa), prazo de
  pagamento em dias. Já existe no backend (S2); esta spec só adiciona a interface web.
- **Veterinário**: profissional vinculado a uma clínica, solicitante de atendimentos/exames.
  Atributos relevantes na tela: nome, CRMV (imutável após cadastro), telefone, e-mail, clínica
  vinculada (imutável após cadastro), status (ativo/inativo). Já existe no backend (S3); esta spec
  só adiciona a interface web.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa da equipe consegue cadastrar uma clínica nova e vê-la na lista em menos de
  1 minuto, sem precisar de suporte técnico.
- **SC-002**: Uma pessoa da equipe consegue cadastrar um veterinário vinculado a uma clínica
  existente em menos de 1 minuto.
- **SC-003**: 100% das seções "Clínicas" e "Veterinários" deixam de mostrar o placeholder de tela
  em construção para os papéis autorizados.
- **SC-004**: Toda tentativa de cadastro/edição com dado inválido (CNPJ, CRMV, clínica inexistente)
  resulta em mensagem de erro específica visível na tela, nunca em falha silenciosa ou tela
  quebrada.

## Assumptions

- As telas desta spec consomem exclusivamente os endpoints já existentes de Clínicas (S2) e
  Veterinários (S3) — nenhuma mudança de contrato ou nova regra de negócio no backend é necessária.
- O controle de acesso por papel destas telas segue o que já está definido em
  `itensDeNavegacao.ts`/`SessaoContext` (S11): apenas os papéis `admin`, `atendente` e `tecnico`
  acessam `/clinicas` e `/veterinarios` (o papel `clinica` não participa desta spec — seu acesso é
  via `/portal/*`, fora de escopo aqui).
- Exclusão definitiva de clínica ou veterinário está fora de escopo — o ciclo de vida é sempre
  ativo/inativo, nunca remoção do registro, para preservar histórico ligado a atendimentos.
- Paginação da lista não é obrigatória nesta spec: o volume esperado de clínicas/veterinários do
  laboratório é pequeno o suficiente para listagem completa sem paginação (assumido a partir do
  domínio real da planilha original).
