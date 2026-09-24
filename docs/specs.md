# Registro de Specs

Índice único `S<N> → spec → issue → status`, cobrindo os dois formatos de spec que coexistem neste
repo (ver `CLAUDE.md` → "Fluxo de trabalho (SDD)"):

- **S1–S10 (legado)**: arquivo único em `docs/specs/S<N>-*.md` (frontmatter `status:`) — a **fonte
  de verdade é o arquivo**; a issue do GitHub é só ponteiro de rastreamento. Fluxo: `/spec-write` +
  `/spec-start`.
- **S11+ (Spec Kit)**: diretório `specs/0NN-slug/` com `spec.md` + `plan.md` + `tasks.md` — a
  **fonte de verdade é o conjunto dos três arquivos**; a issue continua sendo criada manualmente
  como ponteiro. Diretório `0NN-slug` = spec `S<NN>` (número sem os zeros à esquerda). Fluxo:
  `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.

Em ambos os formatos, este arquivo (`docs/specs.md`) é o índice consultado por `/fechar-spec` (via
`verificador-de-spec`) e por `/commit` para resolver escopo.

**Ciclo de vida**: spec criada (`rascunho` → `pronta`) → implementação muda para
`em-desenvolvimento` → `/fechar-spec` roda o `verificador-de-spec`; se aprovado, `entregue`; se
bloqueado, permanece `em-desenvolvimento` com pendências registradas (seção "Verificação" no
arquivo único, para legado; ou anotadas em `tasks.md`/relatório, para Spec Kit).

| Código | Módulo | Spec | Issue | Status |
|--------|--------|------|-------|--------|
| S1 | Auth/Usuários | [docs/specs/S1-auth-usuarios.md](specs/S1-auth-usuarios.md) | [#2](https://github.com/NicolasNagel/vertere-project/issues/2) | entregue |
| S2 | Clínicas | [docs/specs/S2-clinicas.md](specs/S2-clinicas.md) | [#4](https://github.com/NicolasNagel/vertere-project/issues/4) | entregue |
| S3 | Veterinários | [docs/specs/S3-veterinarios.md](specs/S3-veterinarios.md) | [#6](https://github.com/NicolasNagel/vertere-project/issues/6) | entregue |
| S4 | Pacientes | [docs/specs/S4-pacientes.md](specs/S4-pacientes.md) | [#8](https://github.com/NicolasNagel/vertere-project/issues/8) | entregue |
| S5 | Exames & Precificação | [docs/specs/S5-exames-precificacao.md](specs/S5-exames-precificacao.md) | [#10](https://github.com/NicolasNagel/vertere-project/issues/10) | entregue |
| S6 | Atendimentos | [docs/specs/S6-atendimentos.md](specs/S6-atendimentos.md) | [#12](https://github.com/NicolasNagel/vertere-project/issues/12) | entregue |
| S7 | Laudos | [docs/specs/S7-laudos.md](specs/S7-laudos.md) | [#15](https://github.com/NicolasNagel/vertere-project/issues/15) | entregue |
| S8 | Fechamento Financeiro | [docs/specs/S8-fechamento-financeiro.md](specs/S8-fechamento-financeiro.md) | [#18](https://github.com/NicolasNagel/vertere-project/issues/18) | entregue |
| S9 | Portal da Clínica | [docs/specs/S9-portal-clinica.md](specs/S9-portal-clinica.md) | [#20](https://github.com/NicolasNagel/vertere-project/issues/20) | entregue |
| S10 | Importação de Dados Históricos | [docs/specs/S10-importacao-dados-historicos.md](specs/S10-importacao-dados-historicos.md) | [#22](https://github.com/NicolasNagel/vertere-project/issues/22) | pronta |

<!-- Adicionar uma linha por spec nova, na ordem em que forem publicadas (S2, S3, ...). -->
