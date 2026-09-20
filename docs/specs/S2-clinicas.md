---
codigo: S2
modulo: Clínicas
issue: https://github.com/NicolasNagel/vertere-project/issues/4
status: em-desenvolvimento
---

## Problem Statement

Hoje a planilha do Laboratório Vertere trata cada clínica parceira como texto livre repetido em cada linha de atendimento: não há um cadastro único e confiável de clínica, o que dificulta corrigir dados (nome, CNPJ, endereço) de forma consistente, saber quais clínicas estão realmente ativas, e vincular corretamente atendimentos, veterinários e pacientes a uma clínica quando os módulos seguintes do MVP forem implementados.

## Solution

Um módulo de cadastro de clínicas parceiras, com CRUD administrado por `admin` (criar, editar, inativar, reativar) e busca por nome disponível também para `atendente` (para vincular um atendimento à clínica correta). Este módulo é pré-requisito direto de Veterinários, Pacientes e Atendimentos — todos referenciam uma `Clinica` pelo seu identificador.

## User Stories

1. Como administrador, quero cadastrar uma clínica com nome, CNPJ, endereço, telefone, e-mail e status (ativo/inativo), para manter o cadastro de parceiros atualizado.
2. Como administrador, quero editar os dados de uma clínica existente, para corrigir ou atualizar informações cadastrais sem perder o histórico de atendimentos associados a ela.
3. Como administrador, quero inativar uma clínica, para refletir o fim de uma parceria sem apagar o histórico de atendimentos associados a ela.
4. Como administrador, quero reativar uma clínica previamente inativada, para casos de retomada de parceria.
5. Como atendente, quero buscar uma clínica pelo nome ao registrar um atendimento, para vincular o atendimento à clínica correta rapidamente.
6. Como administrador, quero listar todas as clínicas cadastradas, para ter visão geral do cadastro de parceiros.
7. Como sistema, quero que apenas administradores possam criar, editar, inativar ou reativar uma clínica — atendente e técnico têm acesso apenas de leitura (busca/listagem) — para não duplicar checagem de papel fora de `authorize()`.

## Implementation Decisions

- **Módulo novo**: `clinicas` (entidade `Clinica`), seguindo a mesma estrutura de pastas do módulo `auth` de S1 (`domain`, `repository`, `service`, `router`, `schemas`).
- **Campos de `Clinica`**: `id`, `nome`, `cnpj`, `endereco`, `telefone`, `email`, `ativo` (bool). CNPJ é único no cadastro (mesma clínica não pode ser cadastrada duas vezes).
- **CNPJ**: armazenado só com dígitos (sem máscara), validado apenas quanto a formato (14 dígitos) — validação de dígito verificador fica fora do MVP.
- **Autorização**: reaproveita `authorize()` de S1, sem checagem de papel nova em nenhum módulo.
  - `criar_clinica`, `editar_clinica`, `inativar_clinica`, `reativar_clinica`: exigem `authorize(papel, "gerenciar_clinica")` — só `admin`.
  - `buscar_por_nome`, `listar_clinicas`: exigem apenas usuário autenticado (qualquer papel, incluindo `atendente` e `tecnico`); papel `clinica` fica fora de escopo aqui — instrumento de acesso restrito ao próprio registro será tratado quando o Portal da Clínica for implementado (spec futura), reaproveitando o mesmo `authorize()`.
- **Inativação preserva histórico**: inativar uma clínica não apaga nem desvincula atendimentos/veterinários/pacientes já associados a ela (essas entidades ainda não existem nesta spec, mas a decisão de não deletar é definida aqui para ser seguida pelas specs seguintes).
- **Busca por nome**: case-insensitive, substring (não exige nome exato), retorna apenas clínicas — o filtro de "somente ativas" fica a critério do chamador (endpoint HTTP decide se aplica ou não, a função de serviço aceita o parâmetro).

## Testing Decisions

- Segue o padrão de `apps/api/src/vertere_api/auth/service.py` / `usuarios_service.py`: `clinicas/service.py` são funções puras que recebem um repositório (`ClinicaRepository`) como parâmetro, testadas com uma implementação fake em memória — sem HTTP/DB.
- Módulo testado: `clinicas` (funções `criar_clinica`, `editar_clinica`, `inativar_clinica`, `reativar_clinica`, `buscar_por_nome`, `listar_clinicas`), cobrindo: criação válida, rejeição de CNPJ duplicado, edição de clínica existente e inexistente, inativação/reativação, busca por substring case-insensitive, listagem com e sem filtro de ativas.
- Autorização é testada reutilizando `authorize()` de S1 diretamente (sem reimplementar teste de papel): um teste de integração leve na camada de serviço ou router confirma que `authorize(papel, "gerenciar_clinica")` é chamado antes de qualquer escrita.

## Tasks

- [x] T1 — Domínio (`Clinica`) e `ClinicaRepository` (interface) com implementação fake em memória para os testes (User Stories: base para todas)
- [x] T2 — Testes da seam (`clinicas/service.py`) cobrindo criação, edição, inativação/reativação, CNPJ duplicado, busca por nome e listagem (User Stories: 1, 2, 3, 4, 5, 6)
- [x] T3 — Implementação de `criar_clinica`, `editar_clinica`, `inativar_clinica`, `reativar_clinica`, `buscar_por_nome`, `listar_clinicas` em `clinicas/service.py`, fazendo os testes de T2 passarem (User Stories: 1, 2, 3, 4, 5, 6). Nota: autorização (story 7) fica na camada HTTP em T5, reusando `exigir_admin` já estabelecido em S1 (`auth/deps.py`) para as rotas admin-only — mesmo padrão de `usuarios_router.py`, não uma checagem nova por conta própria.
- [x] T4 — Persistência real: modelo SQLAlchemy + migração Alembic implementando `ClinicaRepository` contra PostgreSQL (User Stories: 1, 2, 3, 4, 5, 6)
- [x] T5 — Endpoints HTTP (`clinicas/router.py` + `schemas.py`): criar, editar, inativar, reativar (admin-only, reusando a dependency de autorização de S1) e buscar/listar (qualquer usuário autenticado) (User Stories: 1, 2, 3, 4, 5, 6, 7)

## Out of Scope

- Vínculo de Veterinários, Pacientes e Atendimentos à clínica — specs separadas que dependem desta.
- Validação de dígito verificador de CNPJ.
- Portal da Clínica (papel `clinica` acessando apenas o próprio registro) — mecanismo de `authorize()` já suporta escopo por clínica (ver S1), mas a demonstração de ponta a ponta fica para quando o Portal da Clínica for especificado.
- Upload de documentos/contrato da clínica.

## Further Notes

- Esta spec depende de S1 (Auth/Usuários) para `authorize()` e para a dependency HTTP de autorização já usada nos endpoints admin-only de usuários.
- Ordem de specs sugerida a partir daqui: Clínicas (esta) → Veterinários → Pacientes → Exames & Precificação → Atendimentos → Laudos → Fechamento Financeiro → Portal da Clínica → Importação de Dados Históricos.

## Descobertas

## Verificação

Resultado do último `/fechar-spec S2` (2026-09-19): ❌ BLOQUEADA. Relatório completo em
`docs/specs/relatorios/S2-verificacao.md`. 81/81 testes passam e o fluxo HTTP foi validado
de ponta a ponta (admin e atendente reais contra Postgres de dev); as 5 tasks marcadas `[x]`
têm evidência real. Bloqueio por duas divergências entre "Implementation Decisions" (texto
da própria spec) e o código:

1. **Autorização de escrita não usa `authorize()`**: os endpoints de criar/editar/inativar/
   reativar clínica usam `exigir_admin` (checagem direta de papel em `auth/deps.py`) em vez
   de `authorize(papel, "gerenciar_clinica")` como a spec decide textualmente — a ação
   `gerenciar_clinica` nem existe em `Acao` (`auth/service.py`). Comportamento observável
   (403/201) está correto, mas o mecanismo contradiz o guardrail "authorize() é o único
   ponto de decisão de permissão" (CLAUDE.md). Corrigir: adicionar `Acao.CLINICA_GERENCIAR`
   (ou nome equivalente) em `_PERMISSOES` (admin apenas) e trocar `exigir_admin` por
   `Depends(exigir_acao(Acao.CLINICA_GERENCIAR))` nas rotas de escrita de `clinicas/router.py`.
2. **Falta validação de formato de CNPJ (14 dígitos)**: a spec decide que isso está dentro do
   escopo do MVP (só o dígito verificador é out of scope). Confirmado ao vivo:
   `POST /clinicas` com `cnpj: "123"` retornou 201. Corrigir: validar 14 dígitos em
   `criar_clinica` (rejeitar com uma exceção de domínio, testada na seam).

Pendente resolver na mesma branch (`spec/s2-clinicas`) antes de reabrir `/fechar-spec S2`.
