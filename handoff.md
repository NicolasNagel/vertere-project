# Handoff — Vertere Lab

> Arquivo de continuidade entre sessões (múltiplos agentes de IA já trabalharam neste repo —
> Claude Code e Codex CLI, no mínimo). Antes de assumir que o contexto de uma sessão anterior
> ainda é válido, rode `git status`, `git branch -a` e `git log --oneline -10` no branch atual:
> o estado real do repositório é sempre a fonte de verdade, não a memória de uma sessão passada.
> Atualize este arquivo ao final de cada sessão relevante (mudança de escopo, spec fechada,
> decisão de harness) e no início de uma sessão nova que retome trabalho em andamento.

**Última atualização**: 2026-09-24, por sessão Claude Code (Sonnet 5).

## Estado atual dos branches de spec

| Branch | Spec | Status | Observação |
|---|---|---|---|
| `main` | — | — | Contém até S9 mergeado (Portal da Clínica, entregue) |
| `spec/s9-portal-clinica` | S9 | entregue, mergeado | `/fechar-spec` aprovado; PR já deve ter sido aberto/mergeado — confirmar com `gh pr list --state all` |
| `spec/s10-importacao-dados-historicos` | S10 | entregue, verificado, `/code-review` feito | Ver "S10 — pendências" abaixo |
| `chore/spec-kit-harness` | — (harness, sem spec) | em andamento | Branch desta sessão — ver "Spec Kit" abaixo |

## S10 — Importação de Dados Históricos (pronta para PR)

- 14/14 tasks implementadas, `/fechar-spec S10` aprovado na segunda rodada (a primeira bloqueou por
  `openpyxl` retornar `datetime.timedelta` numa célula de Hora da planilha real — corrigido em
  `xlsx.py::_normalizar_hora_excel`, com teste dedicado).
- `/code-review` (Standards + Spec) rodou sem achados bloqueantes. Achado de Standards já aplicado:
  extração do helper `_exigir` em `importacao/service.py` para colapsar ~15 repetições do padrão
  "checar condição → registrar erro → `valido = False`" (commit `refactor(s10): extrai _exigir...`).
- **Pendente, não bloqueante** (achados de Standards ainda não aplicados, ficam a critério de quem
  retomar): extrair `planejar_importacao` (~520 linhas) em sub-funções por entidade
  (`_planejar_clinicas`, `_planejar_veterinarios`, ...); considerar tipo nomeado para o "clump" de
  4 campos financeiros (`preco`/`desconto`/`adicional`/`total`).
- **Próximo passo real**: abrir o PR para `main` (`Closes #22`), linkando o relatório de verificação
  (`docs/specs/relatorios/S10-verificacao.md`) e o resumo do `/code-review`. Não requer mais nenhum
  fix antes disso.

## Spec Kit (`specify-cli`) — adoção como harness complementar

Nesta sessão, a pedido do usuário: instalado `specify-cli` (já estava instalado globalmente por uma
sessão anterior) e rodado `specify init --here --force --non-interactive --integration claude` na
raiz do repo, na branch `chore/spec-kit-harness` (não em cima de S9/S10, para não misturar harness
com spec). Isso criou:

- `.specify/` — templates, scripts PowerShell (`--script ps`, ambiente Windows), constitution.
- `.claude/skills/speckit-*/` — skills namespaced (`speckit-specify`, `speckit-plan`, `speckit-tasks`,
  `speckit-implement`, `speckit-analyze`, `speckit-clarify`, `speckit-checklist`, `speckit-constitution`,
  `speckit-converge`, `speckit-taskstoissues`). Não colidem com os comandos próprios do projeto
  (`/spec-write`, `/spec-start`, `/fechar-spec`, `/code-review`).

`.specify/memory/constitution.md` foi preenchido (v1.0.0) com o contexto real do projeto — Regra de
Ouro, `authorize()` centralizado, domínio em PT-BR, seam de teste na camada de service, e o próprio
fluxo de SDD com verificação independente já documentado no `CLAUDE.md`. A constitution declara
explicitamente que o Spec Kit **não substitui** os comandos do projeto — convive com eles.

**Decisão explícita registrada na constitution (seção Governance)**: em caso de conflito de leitura
entre `CLAUDE.md` e a constitution do Spec Kit, `CLAUDE.md` prevalece para processo já em vigor; a
constitution é o que deve ser atualizado para acompanhar, não o inverso.

**TODO em aberto na constitution**: `RATIFICATION_DATE` ficou como `TODO(RATIFICATION_DATE)` — a
data exata em que o processo de SDD (spec + issue-ponteiro + `/fechar-spec`) foi adotado pela
primeira vez neste repo não foi levantada nesta sessão (dá para inferir olhando o primeiro commit
`spec(...)` do histórico, se algum dia isso importar).

**Ainda não decidido / não feito**: se e quando usar de fato os comandos `speckit-*` (ex:
`speckit-specify`/`speckit-plan`/`speckit-tasks`) para uma spec nova, em paralelo ou em vez de
`/spec-write` + `/spec-start` — isso não foi pedido nem decidido nesta sessão, só a infraestrutura
foi instalada e contextualizada. Não presumir que uma spec futura deva usar o fluxo Spec Kit sem
confirmar com o usuário primeiro.

**Próximo passo real**: decidir se esta branch (`chore/spec-kit-harness`) vira um commit
`chore(harness): adota Spec Kit como camada complementar de harness` + PR direto, ou se o usuário
quer revisar a constitution antes. Ainda não commitado nesta sessão até este handoff ser escrito.

## Convenções que uma sessão nova precisa saber antes de mexer em qualquer spec

Ver `CLAUDE.md` na raiz do repo — é a fonte de verdade operacional, não este arquivo. Este handoff
é só o estado transitório entre sessões; `CLAUDE.md` é o que não muda a cada handoff.
