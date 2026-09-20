---
codigo: S4
modulo: Pacientes
issue: https://github.com/NicolasNagel/vertere-project/issues/8
status: em-desenvolvimento
---

## Problem Statement

Hoje a planilha do Laboratório Vertere não tem um cadastro formal de paciente: cada linha de
atendimento registra nome/espécie/raça soltos, sem vínculo estável ao mesmo animal ao longo do
tempo. Isso impede consultar o histórico clínico de um paciente específico (US14 do PRD) e obriga
a redigitar os mesmos dados a cada novo atendimento, com risco de duplicidade e inconsistência
(o mesmo animal cadastrado de formas diferentes em atendimentos diferentes).

## Solution

Um módulo de cadastro de pacientes, cada um vinculado a exatamente uma `Clinica` (S2), com CRUD
administrado por `admin` (criar, editar, inativar, reativar) e busca por nome — filtrável por
clínica e proprietário — disponível também para `atendente`, para vincular um atendimento ao
paciente correto sem recadastro. Este módulo é pré-requisito direto de Atendimentos (US20 do PRD
referencia paciente na criação de um atendimento) e de Laudos (histórico clínico de US14 depende
de atendimentos e laudos existirem vinculados a um paciente estável).

## User Stories

1. Como atendente, quero cadastrar um paciente (nome, espécie, raça, sexo, idade, proprietário)
   vinculado a uma clínica, para reutilizar esse cadastro em atendimentos futuros do mesmo animal.
2. Como atendente, quero editar os dados de um paciente existente, para corrigir ou atualizar
   informações cadastrais sem perder o histórico de atendimentos associados a ele.
3. Como administrador, quero inativar um paciente, para refletir o fim de um acompanhamento (ex:
   óbito, transferência) sem apagar o histórico de atendimentos associados a ele.
4. Como administrador, quero reativar um paciente previamente inativado, para casos de retomada
   do acompanhamento.
5. Como atendente, quero buscar um paciente já existente (por nome, filtrando por clínica e/ou
   proprietário) ao registrar um novo atendimento, para não duplicar cadastros.
6. Como administrador, quero listar todos os pacientes cadastrados (com filtro opcional por
   clínica), para ter visão geral do cadastro.
7. Como sistema, quero que apenas administrador e atendente possam criar ou editar um paciente,
   apenas administrador possa inativar/reativar, e todos os papéis tenham acesso de leitura
   (busca/listagem) — para não duplicar checagem de papel fora de `authorize()`.

## Implementation Decisions

- **Módulo novo**: `pacientes` (entidade `Paciente`), seguindo a mesma estrutura de pastas dos
  módulos `auth` (S1), `clinicas` (S2) e `veterinarios` (S3): `domain`, `repository`, `service`,
  `router`, `schemas`, mais um modelo SQLAlchemy (`models.py`).
- **Campos de `Paciente`**: `id`, `nome`, `especie`, `raca`, `sexo`, `idade`, `proprietario`,
  `clinica_id`, `ativo` (bool) — exatamente os campos de US12 do PRD, sem identificador único
  adicional (ex: microchip) fora de escopo desta spec.
- **Sem vínculo a veterinário**: paciente referencia apenas `clinica_id` (não um veterinário) —
  o veterinário solicitante é escolhido por atendimento (spec futura de Atendimentos), não fixado
  no cadastro do paciente. Confirmado com o usuário durante `/spec-write`.
- **Vínculo com clínica**: `clinica_id` referencia uma `Clinica` existente (S2), obrigatório na
  criação e não editável depois (mudar o paciente de clínica é fora de escopo desta spec — ver
  "Out of Scope"), mesma decisão já tomada para `clinica_id` de `Veterinario` em S3.
  `cadastrar_paciente` valida que a clínica existe via `ClinicaRepository.buscar_por_id` (mesma
  interface já definida em `clinicas/service.py`); não é exigido que a clínica esteja ativa
  (mesma postura tolerante de S2/S3 quanto a não travar cadastro por status de uma entidade
  relacionada).
- **Sem identificador único**: diferente de `Veterinario` (CRMV único), `Paciente` não tem um
  campo de identificação única — dois pacientes podem ter o mesmo nome, inclusive na mesma
  clínica (ex: dois cães chamados "Rex" de proprietários diferentes). A prevenção de duplicidade
  é responsabilidade do fluxo de busca (US5/US13 do PRD: buscar por nome + clínica + proprietário
  antes de cadastrar), não de uma constraint de unicidade no banco.
- **Autorização**: reaproveita `authorize()` de S1, sem checagem de papel nova em nenhum módulo.
  - `cadastrar_paciente`, `editar_paciente`: exigem
    `authorize(papel, Acao.PACIENTE_GERENCIAR)`, concedida a `admin` e `atendente` (diferente de
    `Acao.VETERINARIO_GERENCIAR` em S3, que é só `admin` — aqui o PRD dá essa ação explicitamente
    ao atendente em US12/US13, quem registra o atendimento no dia a dia).
  - `inativar_paciente`, `reativar_paciente`: exigem
    `authorize(papel, Acao.PACIENTE_INATIVAR)`, só `admin` — inativação é decisão administrativa
    (US3/US4), separada de cadastro/edição do dia a dia.
  - `buscar_pacientes`, `listar_pacientes`: exigem `authorize(papel, Acao.PACIENTE_VER)`.
    **`Acao.PACIENTE_VER` já existe** em `auth/service.py` desde S1 — antecipada com escopo de
    clínica (`_ACOES_COM_ESCOPO_DE_CLINICA`) e já concedida aos 4 papéis, com testes próprios em
    `test_auth_service.py`. Esta spec reaproveita a ação existente, sem redefini-la; o endpoint
    HTTP usa `exigir_acao(Acao.PACIENTE_VER)` no mesmo padrão simples de S3 (sem passar
    `clinica_usuario`/`clinica_recurso` — enforcement de escopo por clínica no papel `CLINICA`
    fica para quando o Portal da Clínica for especificado, ver "Out of Scope").
  - Novas ações desta spec: só `Acao.PACIENTE_GERENCIAR` e `Acao.PACIENTE_INATIVAR`, adicionadas
    em `auth/service.py` seguindo o padrão de `Acao.VETERINARIO_GERENCIAR`.
- **Inativação preserva histórico**: inativar um paciente não apaga nem desvincula atendimentos
  já associados a ele (essa entidade ainda não existe nesta spec, mas a decisão de não deletar é
  definida aqui para ser seguida pelas specs seguintes — mesma decisão já tomada para Clínicas em
  S2 e Veterinários em S3).
- **Busca por nome**: case-insensitive, substring (não exige nome exato) — mesmo comportamento de
  `clinicas/service.py::buscar_por_nome` e `veterinarios/service.py::buscar_veterinarios`. Aceita
  filtro opcional por `clinica_id`, por `proprietario` (substring, case-insensitive, para
  US5/US13 do PRD) e por `apenas_ativos`; todos os parâmetros são decisão do chamador (a função
  de serviço aceita os parâmetros, o endpoint HTTP decide se aplica).

## Testing Decisions

- Segue o padrão de `apps/api/src/vertere_api/veterinarios/service.py` (S3):
  `pacientes/service.py` são funções puras que recebem um `PacienteRepository` (Protocol) como
  parâmetro, testadas com uma implementação fake em memória — sem HTTP/DB. A validação de
  existência da clínica usa um `ClinicaRepository` fake (mesma interface de S2/S3), sem subir a
  implementação real.
- Módulo testado: `pacientes` (funções `cadastrar_paciente`, `editar_paciente`,
  `inativar_paciente`, `reativar_paciente`, `buscar_pacientes`, `listar_pacientes`), cobrindo:
  criação válida, rejeição de `clinica_id` inexistente, edição de paciente existente e
  inexistente, inativação/reativação, busca por nome (substring case-insensitive, com filtro de
  clínica e de proprietário, isolados e combinados), listagem com e sem filtro de
  ativos/clínica.
- Autorização é testada reutilizando `authorize()` de S1 diretamente (sem reimplementar teste de
  papel): um teste de integração leve na camada de router confirma que
  `authorize(papel, Acao.PACIENTE_GERENCIAR)`, `authorize(papel, Acao.PACIENTE_INATIVAR)` e
  `authorize(papel, Acao.PACIENTE_VER)` são os pontos de decisão usados — incluindo o caso novo
  desta spec de `atendente` autorizado em `PACIENTE_GERENCIAR` mas bloqueado em
  `PACIENTE_INATIVAR` (mesmo padrão de verificação de S3).

## Tasks

- [x] T1 — Domínio (`Paciente`) e `PacienteRepository` (interface) com implementação fake em
      memória para os testes (User Stories: base para todas)
- [x] T2 — Testes da seam (`pacientes/service.py`) cobrindo criação, validação de clínica
      existente, edição, inativação/reativação, busca por nome (com filtro de clínica e de
      proprietário) e listagem (User Stories: 1, 2, 3, 4, 5, 6)
- [x] T3 — Implementação de `cadastrar_paciente` (validando `clinica_id` via `ClinicaRepository`),
      `editar_paciente`, `inativar_paciente`, `reativar_paciente`, `buscar_pacientes`,
      `listar_pacientes` em `pacientes/service.py`, fazendo os testes de T2 passarem
      (User Stories: 1, 2, 3, 4, 5, 6)
- [ ] T4 — Persistência real: modelo SQLAlchemy + migração Alembic (com FK para `clinicas`)
      implementando `PacienteRepository` contra PostgreSQL (User Stories: 1, 2, 3, 4, 5, 6)
- [ ] T5 — Novas ações `Acao.PACIENTE_GERENCIAR` e `Acao.PACIENTE_INATIVAR` em `auth/service.py`
      (`_PERMISSOES`: `PACIENTE_GERENCIAR` admin+atendente; `PACIENTE_INATIVAR` só admin);
      `Acao.PACIENTE_VER` já existe desde S1 e não é alterada (User Stories: 7)
- [ ] T6 — Endpoints HTTP (`pacientes/router.py` + `schemas.py`): criar/editar (via
      `Depends(exigir_acao(Acao.PACIENTE_GERENCIAR))`), inativar/reativar (via
      `Depends(exigir_acao(Acao.PACIENTE_INATIVAR))`) e buscar/listar (via
      `Depends(exigir_acao(Acao.PACIENTE_VER))`), incluindo mapeamento de erros de domínio
      (clínica inexistente → 422, paciente inexistente → 404) (User Stories: 1, 2, 3, 4, 5, 6, 7)

## Out of Scope

- Vínculo de Atendimentos e Laudos ao paciente, e histórico clínico completo (US14 do PRD) —
  specs separadas que dependem desta.
- Trocar a clínica de um paciente já cadastrado (mudança de vínculo) — hoje o `clinica_id` é
  fixado na criação; se a operação real do laboratório precisar disso, é uma necessidade nova a
  registrar em "Descobertas", não a implementar aqui.
- Identificador único de paciente (ex: microchip, RGA) — não previsto no PRD para o MVP.
- Vínculo fixo entre paciente e veterinário — o veterinário é escolhido por atendimento, não por
  paciente (confirmado com o usuário durante `/spec-write`).
- Portal da Clínica (papel `clinica` vendo apenas pacientes da própria clínica) — mecanismo de
  `authorize()` com escopo por clínica já existe (ver S1/S2/S3), mas a demonstração de ponta a
  ponta fica para quando o Portal da Clínica for especificado.

## Further Notes

- Esta spec depende de S1 (Auth/Usuários, para `authorize()`/`exigir_acao`) e S2 (Clínicas, para
  `Clinica`/`ClinicaRepository` e o padrão de módulo a replicar). Segue o mesmo padrão estrutural
  de S3 (Veterinários), inclusive com uma diferença deliberada de permissão: `atendente` tem
  `PACIENTE_GERENCIAR` (não tinha `VETERINARIO_GERENCIAR`), por ser quem cadastra pacientes no
  dia a dia (US12/US13 do PRD), enquanto inativação continua restrita a `admin`.
- Ordem de specs sugerida a partir daqui (mesma de S3): Pacientes (esta) → Exames & Precificação →
  Atendimentos → Laudos → Fechamento Financeiro → Portal da Clínica → Importação de Dados
  Históricos.

## Descobertas

## Verificação
