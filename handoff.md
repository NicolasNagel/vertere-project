# Handoff — Vertere Lab

> Arquivo de continuidade entre sessões (múltiplos agentes de IA já trabalharam neste repo —
> Claude Code e Codex CLI, no mínimo). Antes de assumir que o contexto de uma sessão anterior
> ainda é válido, rode `git status`, `git branch -a` e `git log --oneline -10` no branch atual:
> o estado real do repositório é sempre a fonte de verdade, não a memória de uma sessão passada.
> Atualize este arquivo ao final de cada sessão relevante (mudança de escopo, spec fechada,
> decisão de harness) e no início de uma sessão nova que retome trabalho em andamento.

**Última atualização**: 2026-09-29, por sessão Claude Code (Sonnet 5).

## S12 (Clínicas + Veterinários no web) — `/fechar-spec` aprovado, `/code-review` corrigido, pronta para PR

Branch `spec/s12-clinicas-veterinarios-web` (ainda não mergeada, não há PR aberto). Issue-ponteiro:
[#27](https://github.com/NicolasNagel/vertere-project/issues/27). `docs/specs.md` já mostra
`S12 → entregue`.

**Sequência real desta sessão, na ordem**: implementação (41 tasks) → `/fechar-spec` (veredito
✅ APROVADA, relatório em `docs/specs/relatorios/S12-verificacao.md`) → `/code-review` (achou 3
achados **bloqueantes** no eixo Spec que o `/fechar-spec` não pegou) → correção na mesma branch →
suíte verde de novo. **Achado de processo importante para quem operar `/fechar-spec` numa spec
futura**: o `verificador-de-spec` validou funcionalmente via API/quickstart (backend real,
Postgres real) mas não cruzou cada Functional Requirement da spec contra a UI renderizada — passou
por alto que `FormularioClinica`/`veterinariosApi` tinham busca por nome (FR-003/FR-009) e filtro
"apenas ativas/ativos" (parte de FR-002/FR-008) implementados só na camada de API, nunca ligados a
nenhum campo/checkbox na tela. O `/code-review` (eixo Spec, sub-agente com o diff completo) é que
pegou isso. Lição: **para telas com FR de listagem/filtro, o `/fechar-spec` devia abrir a tela e
contar os controles visíveis contra cada FR, não só validar as chamadas HTTP.** Vale revisitar o
prompt do `verificador-de-spec` (`.claude/agents/verificador-de-spec.md`) se isso se repetir.

**Nota de harness**: `subagent_type: verificador-de-spec` não está registrado neste ambiente (só
`claude`, `claude-code-guide`, `Explore`, `general-purpose`, `Plan`, `statusline-setup` disponíveis
via Agent tool, apesar do arquivo `.claude/agents/verificador-de-spec.md` existir versionado). Esta
sessão contornou isso invocando `general-purpose` com o conteúdo do arquivo colado verbatim como
instrução (preserva a independência — zero contexto da sessão implementadora). Mesma situação para
as duas sub-agentes do `/code-review`. Se isso persistir, vale investigar por que o registro do
agente de projeto não está chegando ao harness.

**O que existe agora**: `apps/web/src/clinicas/` e `apps/web/src/veterinarios/` — cada um com
`*Api.ts` (wrapper HTTP tipado), `use*.ts` (hook de estado, a seam de teste principal, agora com
`termoBusca`/`definirTermoBusca` e `apenasAtivas`/`apenasAtivos`+setters), `Tela*.tsx` (lista +
busca + filtro de status + ações por linha) e `Formulario*.tsx` (criar/editar, com mensagem de
orientação quando não há clínica ativa para o formulário de veterinário). Rotas `/clinicas` e
`/veterinarios` ligadas de verdade (`itensDeNavegacao.ts` com `implementado: true`, `rotas.tsx` com
o mapa `componentePorRota`). Suíte: 94 testes verdes, `pnpm build` limpo.

**Duas decisões de nomenclatura/design que a próxima sessão precisa saber antes de tocar nesses
módulos ou replicar o padrão em S13+**:
1. Hooks de domínio usam prefixo `use` (`useClinicas`, `useVeterinarios`), não `usar` —
   `oxlint` (`react-hooks/rules-of-hooks`) rejeita hook sem prefixo `use` em inglês, e o próprio
   S11 já usava `useSessao`. Ao escrever uma spec nova com hook, já nomear como `use*` desde o
   plan.md — não repetir a correção feita aqui a meio da implementação.
2. `rotas.tsx` ganhou `componentePorRota: Partial<Record<string, ReactNode>>` (Foundational da
   S12) — toda seção nova (S13+: Pacientes, Exames, Atendimentos, ...) só precisa adicionar sua
   entrada nesse mapa + marcar `implementado: true` no item de `itensDeNavegacao.ts`
   correspondente. Não recriar esse mecanismo.

**Duplicação conhecida, não corrigida (achado não-bloqueante do `/code-review`, eixo Standards)**:
`useClinicas.ts`/`useVeterinarios.ts` repetem quase char-a-char o esqueleto de `mensagemDeErro`,
`substituirNoEstado`+`executarAcaoSobre*` e o padrão `recarregar`/`criar` (try/catch/`ErroHttp`/
`setErro`). Se uma S13 repetir esse padrão para uma 3ª entidade, é o momento de extrair um hook de
suporte compartilhado — não antes disso (Speculative Generality na direção contrária com só 2
entidades).

**T040 (quickstart.md) foi executada de fato pelo `/fechar-spec`**, cobrindo a lacuna que a sessão
implementadora tinha deixado pendente (sem Postgres/backend disponível na hora de implementar).

## Próximo passo real

`/code-review` já rodou e os achados bloqueantes já foram corrigidos nesta branch. Falta: PR para
`main` com `Closes #27`, linkando o relatório de `/fechar-spec` e o resultado do `/code-review`.

## `main` está com tudo mergeado até S11 (histórico, não muda com a S12 ainda em branch)

PRs #23 (harness), #26 (S11) e #25 (S10) todos squash-mergeados em `main`, nesta ordem. Issues #20,
#22, #24 fecharam automaticamente. `docs/specs.md` reflete S1–S12 `entregue`.

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
