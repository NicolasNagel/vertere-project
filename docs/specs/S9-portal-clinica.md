---
codigo: S9
modulo: Portal da Clínica
issue: https://github.com/NicolasNagel/vertere-project/issues/20
status: em-desenvolvimento
---

## Problem Statement

Usuários do papel `clinica` (S1) já têm, hoje, acesso de leitura parcialmente restrito à
própria clínica: `atendimentos.service.listar_atendimentos`, `pacientes.service.listar_pacientes`
e `laudos.service.listar_laudos` filtram por `usuario.clinica_id` quando `papel == CLINICA`, e
`laudos.service.ver_laudo` (S7) já aplica `authorize()` de verdade num recurso único. Mas não
existe nenhum ponto de entrada dedicado para esse papel: uma clínica que queira ver o detalhe de
um paciente ou de um atendimento específico não tem endpoint — só as listagens genéricas dos
módulos internos (`/pacientes`, `/atendimentos`), que não são pensadas para o consumo externo de
uma clínica. Falta também um jeito de a clínica ver o histórico completo (atendimentos + laudos)
de um paciente seu, que é a User Story 14 do PRD e ainda não existe em nenhum módulo.

## Solution

Um módulo `portal` novo, com um router HTTP próprio em `/portal/*`, restrito ao papel `clinica`
(nenhum outro papel acessa este namespace — é a porta de entrada da clínica, não um atalho
administrativo). O router não duplica lógica de domínio: chama as funções de service que já
existem em `pacientes`, `atendimentos` e `laudos` para as listagens, e adiciona três funções de
recurso único que ainda não existem, seguindo exatamente o padrão já estabelecido por
`laudos.service.ver_laudo` (S7) — `authorize()` real contra a clínica do recurso, não a
liberação trivial de listagem:

- `pacientes.service.buscar_paciente(paciente_id, usuario, repo) -> Paciente`
- `atendimentos.service.buscar_atendimento(atendimento_id, usuario, repo) -> Atendimento`
- `pacientes.service.buscar_historico_paciente(paciente_id, usuario, pacientes_repo, atendimentos_repo, laudos_repo) -> HistoricoPaciente`
  (agrega o paciente + seus atendimentos + os laudos desses atendimentos, todos já escopados)

Como parte dessa spec, `Acao.ATENDIMENTO_VER` entra em `_ACOES_COM_ESCOPO_DE_CLINICA`
(`auth/service.py`) — hoje só `PACIENTE_VER` e `LAUDO_VER` estão lá. Sem isso,
`buscar_atendimento` teria um gap real: `authorize()` liberaria qualquer clínica para ver
qualquer atendimento por id, porque a ação não é reconhecida como "tem escopo de clínica" (ver
nota em `auth/deps.py::exigir_acao`, que já avisa que o gate de listagem não é seguro para
recurso único).

## User Stories

1. Como usuário do tipo clínica, quero acessar apenas os dados (atendimentos, laudos, pacientes)
   dos meus próprios atendimentos, sem ver dados de outras clínicas (PRD #5).
2. Como usuário do tipo clínica, quero ver o detalhe de um paciente específico meu, para consultar
   dados cadastrais sem precisar filtrar a listagem inteira.
3. Como usuário do tipo clínica, quero ver o detalhe de um atendimento específico meu.
4. Como usuário do sistema (aqui, especificamente a clínica), quero ver o histórico completo de
   atendimentos e laudos de um paciente específico, para acompanhar a evolução clínica dele ao
   longo do tempo (PRD #14).
5. Como usuário do tipo clínica, quero acessar e baixar os laudos dos meus próprios atendimentos
   pelo portal, para ter uma segunda via sempre disponível (PRD #30) — via `/portal/laudos` e
   `/portal/laudos/{id}`, que reaproveitam `listar_laudos`/`ver_laudo` de S7; "baixar" no sentido
   de exportar o JSON estruturado do laudo — geração de PDF fica fora desta spec (não pedida pelo
   PRD para o MVP; ver Out of Scope).
6. Como administrador, atendente ou técnico, **não** quero enxergar `/portal/*` como parte do meu
   fluxo — é um namespace exclusivo do papel clínica, para não confundir com as telas internas de
   `/pacientes`, `/atendimentos`, `/laudos`.

## Implementation Decisions

- **Namespace dedicado, sem duplicar domínio**: `apps/api/src/vertere_api/portal/router.py` é o
  único arquivo novo de peso do módulo — sem `domain.py`/`models.py`/`repository.py` próprios,
  porque o portal não introduz nenhuma entidade nova, só uma fachada de leitura sobre entidades
  que já existem (Paciente, Atendimento, Laudo). `HistoricoPaciente` é um dataclass simples de
  agregação (paciente + lista de atendimentos + lista de laudos), definido em
  `pacientes/domain.py` junto de `Paciente`.
- **Restrição de papel no gate do router, não em cada função de service**: uma dependency nova
  `exigir_papel_clinica` (`auth/deps.py`, mesmo padrão de `exigir_admin`) barra qualquer papel
  diferente de `Papel.CLINICA` com 403 antes mesmo de chegar nas funções de service — que
  continuam aceitando qualquer `Usuario` autorizado, do jeito que `ver_laudo` já faz, para não
  ficar acoplado ao portal se outro consumidor precisar delas no futuro.
- **Reaproveitar listagens existentes**: `/portal/pacientes`, `/portal/atendimentos` e
  `/portal/laudos` (GET, lista) chamam diretamente `pacientes.service.listar_pacientes`,
  `atendimentos.service.listar_atendimentos` e `laudos.service.listar_laudos` — nenhuma lógica de
  filtro nova nesses três, eles já escopam por `usuario.clinica_id` quando `papel == CLINICA`.
- **`ATENDIMENTO_VER` passa a ter escopo de clínica**: adicionar à
  `_ACOES_COM_ESCOPO_DE_CLINICA` em `auth/service.py`. Isso não muda o comportamento de
  `/atendimentos` (GET lista, que já filtra no service e sempre libera o gate trivialmente para
  o próprio papel clínica) — só passa a valer para o novo `buscar_atendimento`, que faz o
  `authorize()` de verdade contra a clínica real do atendimento buscado.
- **`buscar_historico_paciente` não é um novo endpoint de baixo nível reusável por outros
  papéis** — é uma composição pensada para o portal (paciente + seus atendimentos + laudos desses
  atendimentos), mas vive em `pacientes/service.py` (não em `portal/`) porque a regra "quais
  atendimentos/laudos pertencem a este paciente" é conhecimento de domínio de Paciente, não do
  portal.
- **Sem geração de PDF/arquivo**: "baixar laudo" no MVP é o mesmo JSON estruturado que
  `ver_laudo` já retorna — o frontend (fora do escopo desta spec, ainda não existe `apps/web`)
  decide como apresentar/exportar isso. Gerar PDF é uma decisão de UI, não de backend, e não está
  no PRD.

## Testing Decisions

Seguir o padrão de seam já estabelecido em S1 (`authenticate`/`authorize`) e replicado em S7
(`laudos.service.ver_laudo`): funções de service puras, testáveis com repositórios fake em
memória, sem HTTP/DB. Os testes centrais desta spec cobrem `buscar_paciente`,
`buscar_atendimento` e `buscar_historico_paciente` com casos de:
- usuário `clinica` vendo recurso da própria clínica → sucesso;
- usuário `clinica` tentando ver recurso de outra clínica → `NaoEncontrado` (mesmo padrão de
  `ver_laudo`: 404, não 403 — não revela existência do recurso a quem não tem acesso);
- usuário `admin`/`atendente`/`tecnico` vendo qualquer recurso → sucesso (sem escopo de clínica).
Testes de router (`/portal/*`) cobrem o gate de papel: qualquer papel ≠ `clinica` recebe 403 antes
de qualquer lógica de negócio rodar.

## Tasks

- [x] T1 — `HistoricoPaciente` (dataclass de agregação) em `pacientes/domain.py` (User Stories: 4)
- [x] T2 — testes de `buscar_paciente` (escopo de clínica, mirror de `ver_laudo`) (User Stories: 1, 2)
- [x] T3 — implementa `buscar_paciente` em `pacientes/service.py` (User Stories: 1, 2)
- [x] T4 — testes de `_ACOES_COM_ESCOPO_DE_CLINICA` incluindo `ATENDIMENTO_VER` (User Stories: 1, 3)
- [x] T5 — adiciona `Acao.ATENDIMENTO_VER` a `_ACOES_COM_ESCOPO_DE_CLINICA` em `auth/service.py` (User Stories: 1, 3)
- [x] T6 — testes de `buscar_atendimento` (escopo de clínica) (User Stories: 1, 3)
- [x] T7 — implementa `buscar_atendimento` em `atendimentos/service.py` (User Stories: 1, 3)
- [x] T8 — testes de `buscar_historico_paciente` (agregação escopada de atendimentos + laudos) (User Stories: 4)
- [x] T9 — implementa `buscar_historico_paciente` em `pacientes/service.py` (User Stories: 4)
- [x] T10 — `exigir_papel_clinica` em `auth/deps.py` (mirror de `exigir_admin`) + testes (User Stories: 6) — o gate é
  coberto pelos testes de `/portal/*` (T11), mesmo padrão de `exigir_admin` no repo (sem teste unitário isolado de
  dependency, só via router)
- [x] T11 — endpoints HTTP `/portal/*` (router novo: pacientes, atendimentos, laudos — listas e recurso único — e histórico do paciente), registrado em `main.py` (User Stories: 1, 2, 3, 4, 5, 6)
- [x] T12 — testes de regressão dos achados do code review: autorização centralizada do portal, histórico resistente a vínculo inconsistente e matriz completa de papéis (User Stories: 1, 4, 6)
- [x] T13 — corrigir autorização do portal via `authorize()` e escopo de clínica na agregação do histórico (User Stories: 1, 4, 6)
- [x] T14 — eliminar conversores duplicados usando validação Pydantic a partir dos objetos de domínio nos módulos proprietários e no portal (User Stories: 1, 2, 3, 4, 5)

## Out of Scope

- Geração de PDF ou qualquer artefato de arquivo para laudo/atendimento — "baixar" é o JSON
  estruturado já existente; renderização fica para quando `apps/web` existir.
- Qualquer dado financeiro agregado (fechamento, faturamento) no portal — `Acao.FINANCEIRO_VER` e
  `Acao.FECHAMENTO_GERENCIAR` continuam fora do conjunto de permissões de `Papel.CLINICA`
  (`auth/service.py`), sem mudança nesta spec.
- Edição de qualquer dado pelo portal — é um namespace só de leitura (`GET`); cadastro/edição de
  paciente, atendimento e laudo continuam exclusivos dos módulos internos com os papéis já
  definidos em S1/S4/S6/S7.
- Autenticação/onboarding de usuário clínica — já resolvido em S1 (`Papel.CLINICA` + `clinica_id`
  no `Usuario`).
- Notificação/e-mail a partir do portal — envio de laudo por e-mail já existe em S7 e não muda.

## Further Notes

Este módulo não introduz nenhuma entidade de banco nova — só um router e duas/três funções de
service sobre entidades já persistidas (S4 Pacientes, S6 Atendimentos, S7 Laudos). Não deve haver
migration Alembic nesta spec; se `/fechar-spec` encontrar uma, é sinal de escopo vazando.

## Descobertas

<!-- Necessidades novas encontradas durante o desenvolvimento, fora do escopo acima. Não implementar sem decisão do PO. -->

## Verificação

<!-- Preenchido por /fechar-spec -->
