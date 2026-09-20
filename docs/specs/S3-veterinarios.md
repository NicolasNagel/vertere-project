---
codigo: S3
modulo: Veterinários
issue: https://github.com/NicolasNagel/vertere-project/issues/6
status: em-desenvolvimento
---

## Problem Statement

Hoje a planilha do Laboratório Vertere trata cada veterinário solicitante como texto livre
repetido em cada linha de atendimento: não há um cadastro único e confiável do profissional
(nome, CRMV, contato), o que dificulta saber com certeza quem solicitou um atendimento, manter
o e-mail de envio de laudo atualizado, e vincular corretamente um veterinário à sua clínica
quando os módulos seguintes do MVP (Pacientes, Atendimentos, Laudos) forem implementados.

## Solution

Um módulo de cadastro de veterinários, cada um vinculado a exatamente uma `Clinica` (S2), com
CRUD administrado por `admin` (criar, editar, inativar, reativar) e busca por nome — filtrável
por clínica — disponível também para `atendente`, para vincular um atendimento ao veterinário
correto. Este módulo é pré-requisito direto de Atendimentos (US20 do PRD referencia veterinário
na criação de um atendimento) e de Laudos (US29: envio automático de laudo para o e-mail de
laudos do veterinário).

## User Stories

1. Como administrador, quero cadastrar um veterinário vinculado a uma clínica, com nome, CRMV,
   telefone, e-mail para laudos e status, para saber quem solicitou cada atendimento.
2. Como administrador, quero editar os dados de um veterinário existente, para corrigir ou
   atualizar informações cadastrais sem perder o histórico de atendimentos associados a ele.
3. Como administrador, quero inativar um veterinário, para refletir o fim de um vínculo sem
   apagar o histórico de atendimentos associados a ele.
4. Como administrador, quero reativar um veterinário previamente inativado, para casos de
   retomada do vínculo.
5. Como atendente, quero buscar um veterinário já cadastrado, filtrando por clínica, ao
   registrar um atendimento, para evitar recadastro.
6. Como administrador, quero listar todos os veterinários cadastrados (com filtro opcional por
   clínica), para ter visão geral do cadastro.
7. Como sistema, quero que apenas administradores possam criar, editar, inativar ou reativar um
   veterinário — atendente e técnico têm acesso apenas de leitura (busca/listagem) — para não
   duplicar checagem de papel fora de `authorize()`.

## Implementation Decisions

- **Módulo novo**: `veterinarios` (entidade `Veterinario`), seguindo a mesma estrutura de pastas
  dos módulos `auth` (S1) e `clinicas` (S2): `domain`, `repository`, `service`, `router`,
  `schemas`, mais um modelo SQLAlchemy (`models.py`).
- **Campos de `Veterinario`**: `id`, `nome`, `crmv`, `telefone`, `email`, `clinica_id`, `ativo`
  (bool). `email` é o e-mail de envio de laudo (US1, US29 do PRD) — um único campo de e-mail,
  sem campo de e-mail geral separado.
- **CRMV**: identifica o profissional de forma única em todo o cadastro, independente de
  clínica — o mesmo veterinário não pode ter dois registros com o mesmo CRMV, mesmo em clínicas
  diferentes (confirmado com o usuário: CRMV é único por veterinário, não por vínculo). Formato
  validado apenas quanto a não ser vazio e não colidir com outro já cadastrado; validação de
  formato por conselho regional (dígitos + UF) fica fora do MVP, mesmo espírito de "CNPJ sem
  dígito verificador" em S2.
- **Vínculo com clínica**: `clinica_id` referencia uma `Clinica` existente (S2), obrigatório na
  criação e não editável depois (mudar o veterinário de clínica é fora de escopo desta spec —
  ver "Out of Scope"). `criar_veterinario` valida que a clínica existe via
  `ClinicaRepository.buscar_por_id` (mesma interface já definida em `clinicas/service.py`);
  não é exigido que a clínica esteja ativa (mesma postura tolerante de S2 quanto a não travar
  cadastro por status de uma entidade relacionada).
- **Autorização**: reaproveita `authorize()` de S1, sem checagem de papel nova em nenhum módulo.
  - `cadastrar_veterinario`, `editar_veterinario`, `inativar_veterinario`,
    `reativar_veterinario`: exigem `authorize(papel, Acao.VETERINARIO_GERENCIAR)` — só `admin`.
    Nova ação `Acao.VETERINARIO_GERENCIAR` adicionada em `auth/service.py`, seguindo o padrão de
    `Acao.CLINICA_GERENCIAR`.
  - `buscar_veterinarios`, `listar_veterinarios`: exigem `authorize(papel, Acao.VETERINARIO_VER)`,
    concedida aos 4 papéis (mesmo padrão de `Acao.CLINICA_VER` — decisão de S2 corrigida no
    `/code-review`, já que leitura também passa por `authorize()`, nunca por uma dependency que
    só checa autenticação).
- **Inativação preserva histórico**: inativar um veterinário não apaga nem desvincula
  atendimentos já associados a ele (essa entidade ainda não existe nesta spec, mas a decisão de
  não deletar é definida aqui para ser seguida pelas specs seguintes — mesma decisão já tomada
  para Clínicas em S2).
- **Busca por nome**: case-insensitive, substring (não exige nome exato) — mesmo comportamento
  de `clinicas/service.py::buscar_por_nome`. Aceita filtro opcional por `clinica_id` e por
  `apenas_ativos`; ambos os parâmetros são decisão do chamador (a função de serviço aceita os
  parâmetros, o endpoint HTTP decide se aplica).

## Testing Decisions

- Segue o padrão de `apps/api/src/vertere_api/clinicas/service.py` (S2): `veterinarios/service.py`
  são funções puras que recebem um `VeterinarioRepository` (Protocol) como parâmetro, testadas
  com uma implementação fake em memória — sem HTTP/DB. A validação de existência da clínica usa
  um `ClinicaRepository` fake (mesma interface de S2), sem subir a implementação real.
- Módulo testado: `veterinarios` (funções `cadastrar_veterinario`, `editar_veterinario`,
  `inativar_veterinario`, `reativar_veterinario`, `buscar_veterinarios`, `listar_veterinarios`),
  cobrindo: criação válida, rejeição de CRMV duplicado, rejeição de `clinica_id` inexistente,
  edição de veterinário existente e inexistente, inativação/reativação, busca por substring
  case-insensitive (com e sem filtro de clínica), listagem com e sem filtro de ativos/clínica.
- Autorização é testada reutilizando `authorize()` de S1 diretamente (sem reimplementar teste de
  papel): um teste de integração leve na camada de router confirma que
  `authorize(papel, Acao.VETERINARIO_GERENCIAR)` e `authorize(papel, Acao.VETERINARIO_VER)` são
  os pontos de decisão usados (mesmo padrão de verificação de S2, incluindo o achado do
  `/code-review` de S2 sobre leitura passar por `authorize()` desde o início nesta spec).

## Tasks

- [x] T1 — Domínio (`Veterinario`) e `VeterinarioRepository` (interface) com implementação fake
      em memória para os testes (User Stories: base para todas)
- [ ] T2 — Testes da seam (`veterinarios/service.py`) cobrindo criação, validação de clínica
      existente, CRMV duplicado, edição, inativação/reativação, busca por nome (com filtro de
      clínica) e listagem (User Stories: 1, 2, 3, 4, 5, 6)
- [ ] T3 — Implementação de `cadastrar_veterinario` (validando `clinica_id` via
      `ClinicaRepository` e CRMV único), `editar_veterinario`, `inativar_veterinario`,
      `reativar_veterinario`, `buscar_veterinarios`, `listar_veterinarios` em
      `veterinarios/service.py`, fazendo os testes de T2 passarem (User Stories: 1, 2, 3, 4, 5, 6)
- [ ] T4 — Persistência real: modelo SQLAlchemy + migração Alembic (com FK para `clinicas` e
      índice único em `crmv`) implementando `VeterinarioRepository` contra PostgreSQL
      (User Stories: 1, 2, 3, 4, 5, 6)
- [ ] T5 — Novas ações `Acao.VETERINARIO_GERENCIAR` e `Acao.VETERINARIO_VER` em
      `auth/service.py` (`_PERMISSOES`: `VETERINARIO_GERENCIAR` só `admin`; `VETERINARIO_VER`
      todos os papéis) (User Stories: 7)
- [ ] T6 — Endpoints HTTP (`veterinarios/router.py` + `schemas.py`): criar, editar, inativar,
      reativar (via `Depends(exigir_acao(Acao.VETERINARIO_GERENCIAR))`) e buscar/listar (via
      `Depends(exigir_acao(Acao.VETERINARIO_VER))`), incluindo mapeamento de erros de domínio
      (clínica inexistente → 422, CRMV duplicado → 409, veterinário inexistente → 404)
      (User Stories: 1, 2, 3, 4, 5, 6, 7)

## Out of Scope

- Vínculo de Pacientes e Atendimentos ao veterinário — specs separadas que dependem desta.
- Trocar a clínica de um veterinário já cadastrado (mudança de vínculo) — hoje o `clinica_id` é
  fixado na criação; se a operação real do laboratório precisar disso, é uma necessidade nova a
  registrar em "Descobertas", não a implementar aqui.
- Validação de formato de CRMV por conselho regional (dígitos + UF).
- Portal da Clínica (papel `clinica` vendo apenas veterinários da própria clínica) — mecanismo de
  `authorize()` com escopo por clínica já existe (ver S1/S2), mas a demonstração de ponta a ponta
  fica para quando o Portal da Clínica for especificado.

## Further Notes

- Esta spec depende de S1 (Auth/Usuários, para `authorize()`/`exigir_acao`) e S2 (Clínicas, para
  `Clinica`/`ClinicaRepository` e o padrão de módulo a replicar).
- Ordem de specs sugerida a partir daqui (mesma de S2): Veterinários (esta) → Pacientes → Exames
  & Precificação → Atendimentos → Laudos → Fechamento Financeiro → Portal da Clínica →
  Importação de Dados Históricos.

## Descobertas

## Verificação
