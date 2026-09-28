# Feature Specification: Autenticação e Shell Autenticado do Frontend

**Feature Branch**: `spec/s11-frontend-web`

**Created**: 2026-09-24

**Status**: Entregue (aprovada em `/fechar-spec` — ver `docs/specs/relatorios/S11-verificacao.md`)

**Input**: User description: "Frontend web (apps/web, React + Vite + TypeScript) do Vertere Lab, começando pela tela de login e pelo shell autenticado com navegação por papel — primeira spec de frontend do projeto, backend do MVP (S1–S10) já está completo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login com e-mail/senha (Priority: P1)

Um usuário de qualquer papel (admin, atendente, técnico, clínica) acessa a URL do sistema, vê uma
tela de login, informa e-mail e senha, e é autenticado usando a API já existente
(`POST /auth/login`, S1). Em caso de sucesso, é redirecionado para o shell autenticado; em caso de
falha, vê uma mensagem de erro genérica (sem revelar se o e-mail existe, mesmo comportamento já
implementado no backend).

**Why this priority**: sem login funcional, nenhuma outra tela do frontend é alcançável — é o
pré-requisito literal de tudo mais.

**Independent Test**: pode ser testado sozinho abrindo a aplicação sem sessão ativa, tentando login
com credenciais válidas e inválidas, e confirmando o redirecionamento (ou a mensagem de erro) sem
depender de nenhuma outra tela existir ainda.

**Acceptance Scenarios**:

1. **Given** um usuário ativo com credenciais corretas, **When** ele submete o formulário de login,
   **Then** o sistema autentica, guarda a sessão (token) e redireciona para o shell autenticado.
2. **Given** credenciais incorretas ou usuário inexistente, **When** o formulário é submetido,
   **Then** o sistema mostra uma mensagem de erro genérica ("E-mail ou senha inválidos") e permanece
   na tela de login, sem distinguir a causa.
3. **Given** um usuário inativo (`ativo=False`) com senha correta, **When** ele tenta logar,
   **Then** o sistema recusa com a mesma mensagem genérica do cenário 2 (não revela que a conta
   existe mas está desativada).

---

### User Story 2 - Shell autenticado com navegação por papel (Priority: P1)

Depois do login, o usuário vê um shell (cabeçalho/menu + área de conteúdo) que lista apenas as
seções às quais o papel dele tem acesso. Um atendente não vê link para telas financeiras; um usuário
do tipo clínica só vê as seções do namespace `/portal/*` (S9); um administrador vê tudo. As seções
em si (telas de cadastro, atendimentos, laudos, etc.) são especificadas em specs futuras — esta
spec entrega o shell e a navegação condicionada por papel, com uma tela de espaço reservado
("em construção") para cada seção ainda não implementada.

**Why this priority**: é o segundo pré-requisito estrutural — toda tela futura do frontend vive
dentro deste shell, e a navegação por papel é a primeira superfície visível do controle de acesso
que já existe no backend (Regra de Ouro do projeto: quem decide o que o usuário pode fazer é o
backend via `authorize()`, mas o frontend não deve nem oferecer o link para uma ação que o papel do
usuário não tem).

**Independent Test**: pode ser testado logando com usuários de cada papel (admin, atendente,
técnico, clínica — já existem via seed/fixtures de teste do backend) e confirmando que o menu
mostra exatamente as seções esperadas para aquele papel, sem depender de nenhuma tela de conteúdo
estar implementada de verdade.

**Acceptance Scenarios**:

1. **Given** um usuário logado com papel `admin`, **When** ele vê o shell, **Then** o menu lista
   todas as seções do sistema (Clínicas, Veterinários, Pacientes, Exames, Atendimentos, Laudos,
   Financeiro, Usuários).
2. **Given** um usuário logado com papel `atendente`, **When** ele vê o shell, **Then** o menu não
   lista a seção Financeiro (mesma restrição de `Acao.FINANCEIRO_VER` do backend).
3. **Given** um usuário logado com papel `clinica`, **When** ele vê o shell, **Then** o menu lista
   apenas as seções equivalentes ao namespace `/portal/*` (Pacientes, Atendimentos, Laudos — visão
   restrita), sem qualquer link de gestão/cadastro.
4. **Given** um usuário autenticado, **When** ele clica em "Sair", **Then** a sessão é encerrada
   (token descartado) e ele volta para a tela de login.

---

### User Story 3 - Sessão expirada ou inválida (Priority: P2)

Se o token de sessão expirar, for revogado, ou a API responder `401`, o usuário é redirecionado
automaticamente para a tela de login (sem crash de tela em branco), com uma mensagem indicando que a
sessão expirou.

**Why this priority**: sem isso, um usuário com sessão expirada vê uma tela quebrada ou travada em
vez de conseguir logar de novo — não bloqueia o caminho feliz do login inicial, mas é necessário
para o sistema ser usável no dia a dia (sessões expiram, o backend já suporta expiração de sessão,
S1).

**Independent Test**: pode ser testado forçando um token inválido/expirado (ex: manipulando o
storage do navegador) e confirmando o redirecionamento com a mensagem, independente de qual seção
estava aberta.

**Acceptance Scenarios**:

1. **Given** um usuário com sessão ativa navegando o shell, **When** uma chamada à API retorna
   `401`, **Then** o frontend limpa a sessão local e redireciona para o login com uma mensagem
   ("Sua sessão expirou, faça login novamente").

---

### Edge Cases

- O que acontece se o usuário atualizar a página (F5) estando autenticado? A sessão deve persistir
  (token guardado em storage local do navegador), sem exigir novo login a cada refresh.
- O que acontece se o usuário acessar diretamente a URL de uma seção que o papel dele não tem acesso
  (ex: atendente digitando a URL de Financeiro)? O frontend deve bloquear a navegação e mostrar uma
  tela de "acesso negado" (ou redirecionar ao shell), nunca confiar apenas em esconder o link do
  menu — o esconder é UX, o bloqueio de rota é o que evita o acesso direto por URL.
- O que acontece se a API estiver fora do ar durante o login? O frontend mostra uma mensagem de erro
  de conexão genérica, distinta da mensagem de credenciais inválidas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST apresentar uma tela de login com campos de e-mail e senha, que chama
  `POST /auth/login` da API existente.
- **FR-002**: O sistema MUST guardar o token de sessão retornado pelo login de forma que sobreviva a
  um refresh de página (storage local do navegador), sem persistir a senha em nenhum momento.
- **FR-003**: O sistema MUST redirecionar para o shell autenticado após login bem-sucedido, e exibir
  uma mensagem de erro genérica após falha (sem distinguir e-mail inexistente, senha errada, ou
  conta inativa — mesmo comportamento do backend, `AutenticacaoInvalida`).
- **FR-004**: O sistema MUST exibir, dentro do shell, apenas os itens de navegação correspondentes
  ao papel do usuário autenticado (`admin`, `atendente`, `tecnico`, `clinica`), refletindo as mesmas
  restrições de `Acao` já aplicadas pelo backend (ex: `Acao.FINANCEIRO_VER` não concedida a
  atendente/técnico).
- **FR-005**: O sistema MUST bloquear a navegação direta (por URL) a uma seção não permitida ao
  papel do usuário, mesmo que o item de menu correspondente esteja escondido — a ausência do link no
  menu é conveniência de UX, não controle de acesso; o controle de acesso real continua sendo do
  backend (`authorize()`), e o frontend replica a mesma decisão apenas para não oferecer uma
  navegação que vai falhar.
- **FR-006**: O sistema MUST oferecer uma ação de "Sair" que encerra a sessão local e retorna à tela
  de login.
- **FR-007**: O sistema MUST detectar uma resposta `401` de qualquer chamada à API, limpar a sessão
  local, e redirecionar para o login com uma mensagem indicando expiração de sessão.
- **FR-008**: Cada seção do menu para a qual ainda não existe tela implementada MUST exibir um
  espaço reservado ("em construção" ou equivalente) em vez de um link quebrado ou ausente — a
  navegação por papel (FR-004) já reflete a estrutura final do sistema, mesmo antes de cada tela
  existir.

### Key Entities

- **Sessão do usuário (frontend)**: token de autenticação + papel do usuário logado, guardados no
  navegador; não é uma entidade nova de backend — é o espelho no frontend do que a API já retorna no
  login.
- **Item de navegação**: rótulo + rota + lista de papéis permitidos; usado tanto para montar o menu
  visível (FR-004) quanto para o bloqueio de rota direta (FR-005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário com credenciais corretas consegue logar e ver o shell em menos de 3
  segundos numa rede local, sem passos manuais além de preencher e-mail/senha.
- **SC-002**: 100% dos itens de menu exibidos para um papel correspondem exatamente às `Acao`
  concedidas àquele papel no backend (nenhum item a mais, nenhum a menos) — validável comparando o
  menu renderizado para cada um dos 4 papéis contra `auth/service.py::_PERMISSOES`.
- **SC-003**: Uma tentativa de acessar por URL uma seção não permitida ao papel do usuário é
  bloqueada 100% das vezes (sem exceção baseada em papel específico).
- **SC-004**: Uma sessão expirada resulta em redirecionamento ao login em 100% dos casos, sem tela
  em branco ou erro não tratado visível ao usuário.

## Assumptions

- A API (S1–S10) já está pronta e estável o suficiente para o frontend consumir sem mudanças de
  contrato; qualquer ajuste de contrato necessário durante esta spec deve ser registrado, não
  implementado por conta própria (guardrail do projeto: mudança de escopo vira nota, não decisão
  unilateral).
- As seções listadas no shell (Clínicas, Veterinários, Pacientes, Exames, Atendimentos, Laudos,
  Financeiro, Usuários) refletem os módulos já existentes no backend (S1–S8); cada uma vira uma tela
  de verdade em uma spec futura própria — esta spec só entrega a casca de navegação e os espaços
  reservados.
- Não há ainda uma decisão de biblioteca de componentes/design system — isso é decisão de
  implementação (plan.md), não de especificação; esta spec não define stack de UI além do já fixado
  em `CLAUDE.md` (React + Vite + TypeScript + pnpm).
- "Papel" e as restrições de navegação por papel usadas aqui são as já definidas em
  `auth/domain.py::Papel` e `auth/service.py::_PERMISSOES` (S1) — esta spec não introduz papel novo
  nem regra de permissão nova, só replica no frontend o que o backend já decide.
