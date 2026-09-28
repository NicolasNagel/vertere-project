# Handoff — Vertere Lab

> Arquivo de continuidade entre sessões (múltiplos agentes de IA já trabalharam neste repo —
> Claude Code e Codex CLI, no mínimo). Antes de assumir que o contexto de uma sessão anterior
> ainda é válido, rode `git status`, `git branch -a` e `git log --oneline -10` no branch atual:
> o estado real do repositório é sempre a fonte de verdade, não a memória de uma sessão passada.
> Atualize este arquivo ao final de cada sessão relevante (mudança de escopo, spec fechada,
> decisão de harness) e no início de uma sessão nova que retome trabalho em andamento.

**Última atualização**: 2026-09-28, por sessão Claude Code (Sonnet 5).

## Estado atual: 3 PRs abertos, ordem de merge importa

| PR | Branch | Base | Status | Observação |
|---|---|---|---|---|
| [#23](https://github.com/NicolasNagel/vertere-project/pull/23) | `chore/spec-kit-harness` | `main` | Aberto, não mergeado | Adoção do Spec Kit — **mergear primeiro** |
| [#25](https://github.com/NicolasNagel/vertere-project/pull/25) | `spec/s10-importacao-dados-historicos` | `main` | Aberto, não mergeado | S10 — independente das outras duas, pode mergear a qualquer momento |
| [#26](https://github.com/NicolasNagel/vertere-project/pull/26) | `spec/s11-frontend-web` | `chore/spec-kit-harness` | Aberto, não mergeado | S11 — **empilhado sobre #23**, mergear depois dele |

**Ordem recomendada**: #23 primeiro (harness), depois #26 (S11, que é baseado nele — o GitHub vai
re-basear a comparação automaticamente contra `main` assim que #23 mergear), #25 (S10) a qualquer
momento, independente das outras duas.

## S9, S10, S11 — todas `/fechar-spec` aprovadas, `/code-review` sem achados bloqueantes

Nenhuma tem trabalho de código pendente. S9 já está em `main` (mergeada). S10 e S11 só esperam
review/merge dos PRs acima.

## S11 — Autenticação e Shell Autenticado do Frontend (detalhes para quem continuar o frontend)

Primeira spec de frontend do projeto. `apps/web` existe agora com: tela de login, shell autenticado
com navegação por papel, tratamento de sessão expirada. Todas as seções do menu (Clínicas,
Pacientes, Atendimentos, Laudos, etc.) são `TelaEmConstrucao` — **nenhuma tela de conteúdo real
existe ainda**. Isso é o que vem depois (S12+).

**Duas correções de design encontradas durante a implementação** (não durante o planejamento —
ler antes de tocar em `itensDeNavegacao.ts` ou `SessaoContext.tsx`):
1. `clinica` não espelha `auth/service.py::_PERMISSOES` literalmente — navega o namespace
   `/portal/*` próprio (S9), com `ItemDeNavegacao` distintos dos itens de staff mesmo quando o
   rótulo é igual (ex: "Pacientes" aparece duas vezes na lista, uma para staff em `/pacientes`,
   outra para `clinica` em `/portal/pacientes`).
2. Sessão é um Context (`SessaoContext.tsx`), não um hook com `useState` local — necessário para o
   handler global de sessão expirada notificar toda a árvore, não só o componente que disparou.

**Limitação real, não bloqueante, documentada no relatório de verificação**: nenhuma tela ainda faz
fetch de dados próprio, então o cenário de "sessão expirada durante navegação" só é testável
forçando a chamada manualmente (`clienteHttp.requisitar`), não organicamente pela UI. Resolve
sozinho quando a primeira tela de conteúdo real (S12+) existir.

**Bug de infra encontrado e corrigido durante verificação manual com navegador real**: `apps/api`
não tinha CORS configurado — nenhuma chamada do frontend funcionava (bloqueada pelo navegador,
preflight `OPTIONS` retornava 405). Os testes automatizados não pegam isso (`TestClient` não aplica
política de CORS). Corrigido em `apps/api/src/vertere_api/main.py` + `settings.py`
(`fix(s11): adiciona CORS ao backend`).

## Spec Kit — decisão em vigor, primeira spec real já validou o processo

A partir de S11, `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` é o
fluxo padrão (`specs/0NN-slug/`), `/fechar-spec`/`/code-review` continuam iguais. Numeração manual
(011, não 001) funcionou. Detalhes completos: `CLAUDE.md` → "Fluxo de trabalho (SDD)" e PR #23.

## Próximo passo real para quem continuar

1. Revisar e mergear os 3 PRs (ordem: #23 → #26, #25 quando quiser).
2. Depois disso, a próxima spec (S12) é a primeira tela de conteúdo real do frontend — qual seção
   vem primeiro (Pacientes? Atendimentos?) é decisão do usuário, não presumir.

## Convenções que uma sessão nova precisa saber antes de mexer em qualquer spec

Ver `CLAUDE.md` na raiz do repo — é a fonte de verdade operacional, não este arquivo. Este handoff
é só o estado transitório entre sessões; `CLAUDE.md` é o que não muda a cada handoff.
