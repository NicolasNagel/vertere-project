# Data Model — S11: Autenticação e Shell Autenticado do Frontend

Nenhuma entidade nova de backend/banco — esta spec só introduz estado client-side derivado do que a
API já retorna (S1). As "entidades" abaixo são os tipos que vivem no frontend.

## SessaoUsuario (estado client-side)

Espelho, no navegador, do que `POST /auth/login` já retorna — não uma entidade de banco.

| Campo | Tipo | Origem | Notas |
|---|---|---|---|
| `token` | `string` | `POST /auth/login` retorna só `LoginResponse.access_token` (`auth/schemas.py`) — não inclui papel | guardado em `sessionStorage`, nunca logado/exibido |
| `papel` | `Papel` (gerado do OpenAPI) | `GET /auth/me` (`auth/router.py::me`), chamado logo após o login com o token recém-obtido, retorna `UsuarioResponse` (`id`, `email`, `papel`, `ativo`, `clinica_id`) | endpoint já existe, sem mudança de contrato de backend necessária — login vira duas chamadas em sequência (`POST /auth/login` → `GET /auth/me`), não uma |
| `clinicaId` | `string \| null` | mesmo `GET /auth/me` | não usado nesta spec (US2 só filtra menu por papel, não por clínica), mas guardado para specs futuras que precisarem dele sem uma segunda chamada |

**Transições de estado**: `deslogado` → (login bem-sucedido + `GET /auth/me` resolvido) →
`autenticado` → (logout explícito, ou 401 de qualquer chamada, ou fechamento da aba) → `deslogado`.
Não há estado intermediário persistido — a sessão é binária do ponto de vista do frontend.

## ItemDeNavegacao (dado puro, não persistido)

Usado tanto para montar o menu (US2/FR-004) quanto para o guard de rota (FR-005) — a mesma lista
alimenta as duas decisões, para que nunca divirjam (mostrar um link que a rota bloquearia, ou
bloquear uma rota cujo link aparece, seriam os dois jeitos de essa spec falhar SC-002/SC-003).

| Campo | Tipo | Notas |
|---|---|---|
| `rotulo` | `string` | texto visível no menu, em português (ex: "Pacientes") |
| `rota` | `string` | path da rota (ex: `/pacientes`) |
| `papeisPermitidos` | `Papel[]` | para `admin`/`atendente`/`tecnico`, espelha as `Acao` de leitura concedidas por papel em `auth/service.py::_PERMISSOES`; para `clinica`, ver nota abaixo — **não** é um espelho literal de `_PERMISSOES` |
| `implementado` | `boolean` | `false` até a spec futura daquela seção existir; controla se a rota renderiza a tela real ou `TelaEmConstrucao` (FR-008) |

**`clinica` não é um espelho literal de `_PERMISSOES`, é intencional**: o backend concede a
`Papel.CLINICA` algumas `Acao` de leitura (`PACIENTE_VER`, `ATENDIMENTO_VER`, `LAUDO_VER`,
`CLINICA_VER`, `VETERINARIO_VER`, `EXAME_VER`) para que um usuário clínica participe de fluxos
internos — isso **não** significa que ele deva navegar as mesmas telas administrativas de
Pacientes/Atendimentos/Laudos/Clínicas/Veterinários/Exames que `admin`/`atendente`/`tecnico` usam. A
S9 (Portal da Clínica) já estabeleceu que `clinica` acessa um namespace próprio e mais restrito
(`/portal/*`: só Pacientes, Atendimentos, Laudos, com escopo de dados por clínica) — replicar
literalmente `_PERMISSOES` no menu ofereceria navegação para telas que a arquitetura de backend
não pretende que `clinica` use. `itensDeNavegacao.ts` reflete isso com entradas próprias para
`clinica` (rota prefixada `/portal/`, rótulo igual ao item de staff correspondente mas
`ItemDeNavegacao` distinto) — exatamente o Acceptance Scenario 3 de `spec.md`, que é a fonte de
verdade para o menu de clínica, não a leitura direta de `_PERMISSOES`.

**Nota de sincronização (risco documentado, não um requisito novo)**: para os papéis de staff
(`admin`/`atendente`/`tecnico`), esta tabela é mantida à mão no frontend (`itensDeNavegacao.ts`)
espelhando `_PERMISSOES` do backend. Um teste de integração futuro deveria comparar as duas listas
programaticamente (ex: buscando a lista de `Acao` por papel via um endpoint de introspecção, se
existir, ou por fixture compartilhada) para que SC-002 não dependa só de alguém lembrar de atualizar
os dois lados manualmente. Se não houver endpoint de introspecção hoje, isso é uma "Descoberta" a
registrar (guardrail do projeto) para decisão do PO, não uma implementação nova de endpoint por
conta própria desta spec de frontend — o teste desta spec (`itensDeNavegacao.test.ts`) compara
contra uma transcrição manual de `_PERMISSOES`, não contra o backend real.
