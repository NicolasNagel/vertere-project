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

## Spec Kit (`specify-cli`) — é o ponto de entrada padrão a partir de S11 (decisão tomada, não mais provisória)

Nesta sessão, a pedido explícito do usuário: instalado `specify-cli` e rodado `specify init --here
--force --non-interactive --integration claude` na raiz do repo, na branch `chore/spec-kit-harness`
(não em cima de S9/S10, para não misturar harness com spec). Isso criou `.specify/` (templates,
scripts PowerShell, constitution) e `.claude/skills/speckit-*/` (namespace próprio, sem colidir com
`/spec-write`, `/spec-start`, `/fechar-spec`, `/code-review`).

**Decisão final (perguntada e confirmada com o usuário nesta sessão, não presumida)**: a partir de
S11, `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` é o fluxo
**padrão** de qualquer spec nova — substitui `/spec-write` + `/spec-start` como ponto de entrada.
`/spec-write`/`/spec-start` continuam instalados só para manutenção de S1–S10 (formato de arquivo
único). `/fechar-spec` e `/code-review` **não mudam** — o Spec Kit não tem gate equivalente a
nenhum dos dois, então ambos continuam sendo acionados manualmente antes do PR, exatamente como
antes.

**Formato de spec escolhido para S11+ (segunda pergunta feita e respondida nesta sessão)**: o
formato **nativo** do Spec Kit — `specs/0NN-slug/{spec.md,plan.md,tasks.md}` — não uma customização
dos templates para imitar `docs/specs/S-XX-nome.md`. Consequência prática: `docs/specs.md` agora
documenta os dois formatos coexistindo; `.claude/agents/verificador-de-spec.md` foi atualizado para
ler os três arquivos (S11+) ou o arquivo único (S1–S10), conforme o que `docs/specs.md` indicar;
`/commit` foi atualizado para referenciar `specs/0NN-slug/spec.md` como "Spec:" quando aplicável.

**Numeração — ponto de atenção real para quem criar S11**: o Spec Kit, por conta própria, numeraria
a primeira spec nova como `specs/001-slug` (ele só escaneia o diretório `specs/`, que ainda não
existe). Isso colidiria com a sequência `S<N>` já em uso (S1–S10 existem). `CLAUDE.md` documenta que
o próximo número é `011`, mas **isso depende de quem rodar `/speckit-specify` prestar atenção nisso
na hora** — o Spec Kit não sabe da numeração histórica do projeto sozinho. Se uma sessão futura rodar
`/speckit-specify` sem essa atenção, o diretório sairia como `specs/001-slug` e precisaria ser
renomeado manualmente para `specs/011-slug` antes de registrar em `docs/specs.md`.

`.specify/memory/constitution.md` está em **v1.1.0** (Principle V reescrito para descrever o Spec
Kit como ponto de entrada padrão, não mais como camada opcional). `RATIFICATION_DATE` continua como
`TODO(RATIFICATION_DATE)` — não levantado nesta sessão.

**Arquivos tocados por essa decisão nesta sessão** (todos no commit de harness desta branch):
`CLAUDE.md` (seção "Fluxo de trabalho (SDD)" reescrita + nova seção "Spec Kit"), `docs/specs.md`
(header explica os dois formatos), `.claude/agents/verificador-de-spec.md` (lê os dois formatos),
`.claude/commands/spec-write.md` e `.claude/commands/spec-start.md` (nota de legado no topo),
`.claude/commands/commit.md` (linha "Spec:" ciente dos dois formatos), `.specify/memory/constitution.md`.

**Próximo passo real**: nenhuma spec S11 foi criada ainda nesta sessão — só a decisão de harness foi
tomada e documentada. Quando alguém for criar a primeira spec via `/speckit-specify`, prestar atenção
na numeração (parágrafo acima) antes de prosseguir.

## Convenções que uma sessão nova precisa saber antes de mexer em qualquer spec

Ver `CLAUDE.md` na raiz do repo — é a fonte de verdade operacional, não este arquivo. Este handoff
é só o estado transitório entre sessões; `CLAUDE.md` é o que não muda a cada handoff.
