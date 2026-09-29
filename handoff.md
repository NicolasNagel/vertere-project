# Handoff — Vertere Lab

> Arquivo de continuidade entre sessões (múltiplos agentes de IA já trabalharam neste repo —
> Claude Code e Codex CLI, no mínimo). Antes de assumir que o contexto de uma sessão anterior
> ainda é válido, rode `git status`, `git branch -a` e `git log --oneline -10` no branch atual:
> o estado real do repositório é sempre a fonte de verdade, não a memória de uma sessão passada.
> Atualize este arquivo ao final de cada sessão relevante (mudança de escopo, spec fechada,
> decisão de harness) e no início de uma sessão nova que retome trabalho em andamento.

**Última atualização**: 2026-09-29, por sessão Claude Code (Sonnet 5).

## S12 (Clínicas + Veterinários no web) implementada, pronta para `/fechar-spec`

Branch `spec/s12-clinicas-veterinarios-web` (ainda não mergeada, não há PR aberto). Todas as 41
tasks de `specs/012-clinicas-veterinarios-web/tasks.md` estão `[X]`, cada uma em commit próprio,
teste-primeiro (Princípio IV da constituição). Issue-ponteiro: [#27](https://github.com/NicolasNagel/vertere-project/issues/27).
`docs/specs.md` ainda mostra `S12 → em-desenvolvimento` — só `/fechar-spec` muda isso para
`entregue` (ou mantém bloqueado com pendência).

**O que existe agora**: `apps/web/src/clinicas/` e `apps/web/src/veterinarios/` — cada um com
`*Api.ts` (wrapper HTTP tipado), `use*.ts` (hook de estado, a seam de teste principal), `Tela*.tsx`
(lista + ações por linha) e `Formulario*.tsx` (criar/editar), todos com teste próprio. Rotas
`/clinicas` e `/veterinarios` ligadas de verdade (`itensDeNavegacao.ts` com `implementado: true`
para essas duas seções, `rotas.tsx` com o novo mapa `componentePorRota`). Suíte: 83 testes verdes,
`pnpm build` (type-check + bundle) limpo.

**Duas decisões de nomenclatura/design que a próxima sessão precisa saber antes de tocar nesses
módulos ou replicar o padrão em S13+**:
1. Hooks de domínio usam prefixo `use` (`useClinicas`, `useVeterinarios`), não `usar` — a spec
   original (`tasks.md`/`plan.md`) tinha sido escrita com `usarClinicas` antes da implementação;
   `oxlint` (`react-hooks/rules-of-hooks`) rejeita hook sem prefixo `use` em inglês, e o próprio
   S11 já usava `useSessao`. Todos os documentos da spec foram corrigidos para `use*` durante a
   implementação — ao seguir esse padrão em specs futuras, já nomear como `use*` desde o plan.md.
2. `rotas.tsx` ganhou `componentePorRota: Partial<Record<string, ReactNode>>` (Foundational da
   S12, tasks T002/T003) — toda seção nova (S13+: Pacientes, Exames, Atendimentos, ...) só precisa
   adicionar sua entrada nesse mapa + marcar `implementado: true` no item de
   `itensDeNavegacao.ts` correspondente. Não recriar esse mecanismo.

**Pendência real antes do PR — T040 do tasks.md não foi executada de ponta a ponta**: os 5
cenários de `specs/012-clinicas-veterinarios-web/quickstart.md` exigem Postgres + backend rodando
com um usuário `admin` já cadastrado; esta sessão não tinha esse ambiente disponível. O que foi
validado automaticamente (suíte completa + `pnpm build`) cobre a lógica, mas não a experiência
visual real no navegador. **Antes do PR**, alguém com o ambiente completo de pé precisa rodar o
quickstart manualmente (ou isso vira achado do `/fechar-spec`/`/code-review`).

## Próximo passo real

1. `/fechar-spec S12` (dispara `verificador-de-spec` numa sessão independente).
2. Corrigir o que for apontado na mesma branch.
3. `/code-review` (Standards + Spec) antes do PR.
4. PR para `main` com `Closes #27`.

## `main` está com tudo mergeado até S11 (histórico, não muda com a S12 ainda em branch)

PRs #23 (harness), #26 (S11) e #25 (S10) todos squash-mergeados em `main`, nesta ordem. Issues #20,
#22, #24 fecharam automaticamente. `docs/specs.md` reflete S1–S11 `entregue`, S12
`em-desenvolvimento`.

Branches remotas `chore/spec-kit-harness`, `spec/s10-importacao-dados-historicos` e
`spec/s11-frontend-web` continuam não deletadas (irrelevante para a S12, mas ainda vale saber que
existem antes de rodar qualquer limpeza de branches).

## Spec Kit — em vigor, segunda spec real (S12) confirmou o processo de novo

`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` seguiu sem
surpresas de harness nesta spec (diferente da S11, que teve o problema de branch empilhada). Cada
task = 1 commit, convenção `feat(s12): T0NN ...` / `fix(s12): T0NN ...`. Detalhes do fluxo:
`CLAUDE.md` → "Fluxo de trabalho (SDD)".

## Convenções que uma sessão nova precisa saber antes de mexer em qualquer spec

Ver `CLAUDE.md` na raiz do repo — é a fonte de verdade operacional, não este arquivo. Este handoff
é só o estado transitório entre sessões; `CLAUDE.md` é o que não muda a cada handoff.
