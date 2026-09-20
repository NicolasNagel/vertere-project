# Registro de Specs

Índice rápido `S<N> → arquivo → issue`. A **fonte de verdade de cada spec é o arquivo** em `docs/specs/S<N>-*.md` (frontmatter `status:`); a issue do GitHub é só um ponteiro de rastreamento. Consultado por `/spec-write`, `/spec-start`, `/fechar-spec` e `/commit`.

**Ciclo de vida**: `/spec-write` cria o arquivo (`status: rascunho` → `pronta`) e a issue-ponteiro → `/spec-start` cria a branch `spec/s-XX-nome`, implementa, muda para `em-desenvolvimento` → `/fechar-spec` roda o `verificador-de-spec`; se aprovado, `entregue`; se bloqueado, permanece `em-desenvolvimento` com pendências na seção "Verificação" do arquivo.

| Código | Módulo | Spec | Issue | Status |
|--------|--------|------|-------|--------|
| S1 | Auth/Usuários | [docs/specs/S1-auth-usuarios.md](specs/S1-auth-usuarios.md) | [#2](https://github.com/NicolasNagel/vertere-project/issues/2) | entregue |
| S2 | Clínicas | [docs/specs/S2-clinicas.md](specs/S2-clinicas.md) | [#4](https://github.com/NicolasNagel/vertere-project/issues/4) | entregue |
| S3 | Veterinários | [docs/specs/S3-veterinarios.md](specs/S3-veterinarios.md) | [#6](https://github.com/NicolasNagel/vertere-project/issues/6) | entregue |
| S4 | Pacientes | [docs/specs/S4-pacientes.md](specs/S4-pacientes.md) | [#8](https://github.com/NicolasNagel/vertere-project/issues/8) | entregue |
| S5 | Exames & Precificação | [docs/specs/S5-exames-precificacao.md](specs/S5-exames-precificacao.md) | [#10](https://github.com/NicolasNagel/vertere-project/issues/10) | entregue |
| S6 | Atendimentos | [docs/specs/S6-atendimentos.md](specs/S6-atendimentos.md) | [#12](https://github.com/NicolasNagel/vertere-project/issues/12) | entregue |
| S7 | Laudos | [docs/specs/S7-laudos.md](specs/S7-laudos.md) | [#15](https://github.com/NicolasNagel/vertere-project/issues/15) | em-desenvolvimento |

<!-- Adicionar uma linha por spec nova, na ordem em que forem publicadas (S2, S3, ...). -->
