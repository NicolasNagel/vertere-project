# Handoff — Vertere Lab

> Arquivo de continuidade entre sessões (múltiplos agentes de IA já trabalharam neste repo —
> Claude Code e Codex CLI, no mínimo). Antes de assumir que o contexto de uma sessão anterior
> ainda é válido, rode `git status`, `git branch -a` e `git log --oneline -10` no branch atual:
> o estado real do repositório é sempre a fonte de verdade, não a memória de uma sessão passada.
> Atualize este arquivo ao final de cada sessão relevante (mudança de escopo, spec fechada,
> decisão de harness) e no início de uma sessão nova que retome trabalho em andamento.

**Última atualização**: 2026-09-28, por sessão Claude Code (Sonnet 5).

## `main` está com tudo mergeado — S1 a S11 entregues

PRs #23 (harness), #26 (S11) e #25 (S10) todos squash-mergeados em `main`, nesta ordem. Issues #20,
#22, #24 fecharam automaticamente. `docs/specs.md` reflete o estado final: S1–S11 `entregue`.

**Nota técnica para quem for mexer com branches empilhadas de novo**: #26 (S11) tinha sido aberto
contra `chore/spec-kit-harness` (não `main`), porque a branch da S11 partiu dali. Depois do squash-
merge de #23, retargetar #26 para `main` deu conflito (`git rebase origin/main` direto também deu
conflito "add/add", porque replaying commits já squashados em `main` confunde o git) — resolvido com
`git rebase --onto origin/main chore/spec-kit-harness spec/s11-frontend-web` (só replay dos commits
exclusivos da S11, não os do harness) + `push --force-with-lease`. Para #25 (S10, que não tinha essa
relação de stack), um `git merge origin/main` simples resolveu o único conflito real
(`docs/specs.md`, ambas as branches editando a mesma tabela) antes do squash-merge funcionar.

Branches remotas `chore/spec-kit-harness`, `spec/s10-importacao-dados-historicos` e
`spec/s11-frontend-web` **não foram deletadas** (merge feito com `--delete-branch=false`) — seguro
deletar quando quiser, ninguém mais devia precisar delas.

## Backend (S1–S10) e frontend (S11) completos, prontos para a próxima spec

- Backend: todos os módulos do MVP (auth, clínicas, veterinários, pacientes, exames, atendimentos,
  laudos, financeiro, portal, importação histórica).
- Frontend (`apps/web`): login + shell autenticado com navegação por papel. **Todas as seções de
  conteúdo são `TelaEmConstrucao`** — nenhuma tela real ainda (Pacientes, Atendimentos, etc.).

**Duas correções de design da S11 encontradas durante a implementação** (ler antes de tocar em
`itensDeNavegacao.ts` ou `SessaoContext.tsx`):
1. `clinica` não espelha `auth/service.py::_PERMISSOES` literalmente — navega `/portal/*` (S9), com
   `ItemDeNavegacao` distintos dos itens de staff mesmo com rótulo igual.
2. Sessão é `SessaoContext` (Context compartilhado), não hook com `useState` local — necessário para
   o handler global de sessão expirada notificar toda a árvore.

**Limitação real, não bloqueante**: nenhuma tela ainda faz fetch próprio, então "sessão expirada
durante navegação" só é testável forçando a chamada manualmente. Resolve quando a primeira tela de
conteúdo real (S12+) existir.

**Bug de infra corrigido durante verificação manual**: `apps/api` não tinha CORS — corrigido em
`fix(s11)`, já em `main`.

## Spec Kit — em vigor, primeira spec real (S11) já validou o processo

A partir de S11, `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` é o
fluxo padrão (`specs/0NN-slug/`), `/fechar-spec`/`/code-review` continuam iguais. Numeração manual
(011, não 001) funcionou na prática. Detalhes: `CLAUDE.md` → "Fluxo de trabalho (SDD)".

## Próximo passo real

A próxima spec (S12) é a primeira tela de conteúdo real do frontend — qual seção vem primeiro
(Pacientes? Atendimentos?) é decisão do usuário, não presumir. Ponto de entrada: `/speckit-specify`,
numeração `012` (confirmar contra `docs/specs.md` antes, o Spec Kit sozinho não sabe da sequência).

## Convenções que uma sessão nova precisa saber antes de mexer em qualquer spec

Ver `CLAUDE.md` na raiz do repo — é a fonte de verdade operacional, não este arquivo. Este handoff
é só o estado transitório entre sessões; `CLAUDE.md` é o que não muda a cada handoff.
