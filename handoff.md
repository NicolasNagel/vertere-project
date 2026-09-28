# Handoff — Vertere Lab

> Arquivo de continuidade entre sessões (múltiplos agentes de IA já trabalharam neste repo —
> Claude Code e Codex CLI, no mínimo). Antes de assumir que o contexto de uma sessão anterior
> ainda é válido, rode `git status`, `git branch -a` e `git log --oneline -10` no branch atual:
> o estado real do repositório é sempre a fonte de verdade, não a memória de uma sessão passada.
> Atualize este arquivo ao final de cada sessão relevante (mudança de escopo, spec fechada,
> decisão de harness) e no início de uma sessão nova que retome trabalho em andamento.

**Última atualização**: 2026-09-28, por sessão Claude Code (Sonnet 5).

## Estado atual dos branches

| Branch | Spec | Status | Observação |
|---|---|---|---|
| `main` | — | — | Até S9 mergeado (Portal da Clínica, entregue) |
| `chore/spec-kit-harness` | — (harness) | PR #23 aberto, não mergeado | Adoção do Spec Kit como ponto de entrada padrão a partir de S11 — ver seção própria abaixo |
| `spec/s10-importacao-dados-historicos` | S10 | entregue, verificado, `/code-review` feito — **PR ainda não aberto** | Ver "S10" abaixo |
| `spec/s11-frontend-web` | S11 | em desenvolvimento (specify→plan→tasks→implement completos; `/fechar-spec` ainda não rodado) | Ver "S11" abaixo — branch atual desta sessão |

## S10 — Importação de Dados Históricos (pronta para PR, PR ainda não aberto)

- 14/14 tasks implementadas, `/fechar-spec S10` aprovado, `/code-review` sem achados bloqueantes
  (um achado de Standards já aplicado: helper `_exigir` em `importacao/service.py`).
- **Próximo passo real**: abrir o PR para `main` (`Closes #22`). Nenhum fix pendente.

## S11 — Autenticação e Shell Autenticado do Frontend (specs/011-autenticacao-web/)

Primeira spec de frontend do projeto (`apps/web` criado do zero nesta sessão). Fluxo completo do
Spec Kit executado: `spec.md` → `plan.md`/`research.md`/`data-model.md`/`quickstart.md` →
`tasks.md` (39 tasks) → implementação de T001 a T037+T039 (T038 pendente, ver abaixo). Issue
ponteiro: #24.

**Design system**: a pedido do usuário, herdado de `github.com/NicolasNagel/vertere-lab` (versão
anterior deste mesmo produto) — paleta (`--color-brand-ink` #2c4768, `--color-surface-cream`
#eeeae0, etc.), tipografia (Big Shoulders Display/Cormorant Garamond/Manrope/JetBrains Mono),
layout de login em painel duplo, sidebar fixa 220px. Sem Tailwind/Radix — CSS custom properties +
um arquivo `.css` por componente, mesma técnica da referência. Melhorias de UI/UX aplicadas sobre o
mock estático original: `<label>`+`<input>` semânticos de verdade, alternância de senha acessível,
erro anunciado via `role="alert"`, `:focus-visible` global, contraste calculado (não estimado) —
todos os pares texto/fundo passam WCAG AA, a maioria AAA. Ver `research.md` para o raciocínio
completo.

**Duas correções de design feitas durante a implementação** (não durante o planejamento — vale ler
antes de continuar esta spec ou usar `itensDeNavegacao`/`SessaoContext` como referência):

1. **`itensDeNavegacao` para o papel `clinica`**: o plano inicial (data-model.md) mandava espelhar
   literalmente `auth/service.py::_PERMISSOES` para todos os papéis. Isso estava errado — a S9
   (Portal da Clínica) já estabeleceu que `clinica` navega um namespace próprio e mais restrito
   (`/portal/*`: só Pacientes/Atendimentos/Laudos, escopados por clínica), não as mesmas telas
   administrativas que staff usa, mesmo que o backend conceda a `clinica` algumas `Acao` de leitura
   para fluxos internos. Corrigido usando o próprio Acceptance Scenario 3 de `spec.md` (que já
   estava certo) como fonte de verdade. `itensDeNavegacao.ts` agora tem `ItemDeNavegacao` distintos
   para `clinica` (rota `/portal/*`), não os mesmos itens de staff com `clinica` adicionado à lista
   de papéis permitidos.
2. **`useSessao` virou `SessaoContext` (Provider)**: o plano original tratava sessão como um hook
   comum (`useState` por componente). Ao implementar "sessão expirada" (US3), ficou claro que um
   handler global de 401 não conseguiria notificar componentes já montados com seu próprio estado
   local desatualizado. Virou um Context único (`SessaoProvider`, montado em `App.tsx`) — estado
   compartilhado por toda a árvore. Qualquer código futuro que precise de sessão usa
   `useSessao()` de `autenticacao/SessaoContext.tsx`, não existe mais `autenticacao/useSessao.ts`.

**Testes**: 25 testes (Vitest + Testing Library) cobrindo as 3 user stories, todos passando. Build
(`tsc -b && vite build`) OK.

**T038 pendente — real, não cosmético**: rodar os 9 cenários de `quickstart.md` manualmente contra
o backend real não foi possível nesta sessão porque a extensão Claude in Chrome não estava
conectada neste ambiente (sem acesso a navegador). O que foi verificado sem navegador: build limpo,
servidor dev responde HTTP 200 com HTML/fontes corretos, suíte automatizada cobre cada cenário
isoladamente. **Isso não é o mesmo que verificação visual/E2E real** — uma sessão com navegador
disponível precisa rodar isso antes de `/fechar-spec S11` declarar a spec funcional de ponta a
ponta (é exatamente o que o `verificador-de-spec` vai exigir, ver seu passo "Funcional de ponta a
ponta").

**Próximo passo real**: rodar T038 (precisa de navegador), depois `/fechar-spec S11`, depois
`/code-review` na branch, depois abrir o PR — mesmo fluxo de sempre a partir daqui (Spec Kit só
mudou specify/plan/tasks/implement, o resto do pipeline é idêntico).

## Spec Kit (`specify-cli`) — ponto de entrada padrão a partir de S11 (decisão já tomada, PR aberto)

Decisão confirmada explicitamente com o usuário (não presumida): a partir de S11,
`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` é o fluxo padrão de
spec nova, no formato **nativo** do Spec Kit (`specs/0NN-slug/{spec.md,plan.md,tasks.md}`, não uma
customização para imitar `docs/specs/S-XX-nome.md`). `/fechar-spec`/`/code-review` não mudam.
`/spec-write`/`/spec-start` continuam instalados só para manutenção de S1–S10.

Detalhes completos (arquivos tocados, `constitution.md` v1.1.0, nota de numeração) estão na branch
`chore/spec-kit-harness` (PR #23, ainda não mergeado) e em `CLAUDE.md` → "Fluxo de trabalho (SDD)".
**Numeração confirmada funcionando na prática**: S11 usou `specs/011-autenticacao-web/` corretamente
(número escolhido manualmente, não pelo Speckit sozinho) — o processo documentado em `CLAUDE.md`
funcionou.

## Convenções que uma sessão nova precisa saber antes de mexer em qualquer spec

Ver `CLAUDE.md` na raiz do repo — é a fonte de verdade operacional, não este arquivo. Este handoff
é só o estado transitório entre sessões; `CLAUDE.md` é o que não muda a cada handoff.
