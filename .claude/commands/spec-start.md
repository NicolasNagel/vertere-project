---
description: "[LEGADO — só para manutenção de S1-S10] Inicia o desenvolvimento de uma spec publicada (S1/S2/...) numa branch dedicada - lê o arquivo, planeja, implementa test-first, um commit por task."
argument-hint: S<N>
---

> **Legado**: a partir de S11, implementação entra por `/speckit-implement` (Spec Kit) sobre o
> `tasks.md` gerado por `/speckit-tasks` — ver `CLAUDE.md` → "Fluxo de trabalho (SDD)". Este comando
> continua existindo só para retomar/ajustar specs S1–S10 no formato de arquivo único.

Você vai começar (ou retomar) a implementação de uma spec já publicada. Este comando não escreve a spec (use `/spec-write`) nem decide se ela está pronta para seguir em frente (use `/fechar-spec`) — só cobre o desenvolvimento. Idealmente esta spec roda numa sessão nova dedicada a ela (convenção do projeto, ver `CLAUDE.md`); se esta sessão já vem de outro trabalho, avise o usuário mas não bloqueie.

Argumento (`$ARGUMENTS`): o código da spec, ex: `S1`. Se vazio, pergunte ao usuário qual spec — nunca escolha sozinho qual módulo desenvolver.

## Processo

1. **Resolva a spec.** Busque `S<N>` em `docs/specs.md` para achar o arquivo (`docs/specs/S<N>-*.md`) e a issue-ponteiro. Se `S<N>` não existir no registro, pare e avise (falta rodar `/spec-write`).

2. **Leia o arquivo da spec inteiro** — é a fonte de verdade, não a issue. Leia também `issues/prd.md` (contexto do módulo) e os ADRs relevantes em `docs/adr/`.

3. **Crie/troque para a branch da spec**: `git checkout -b spec/s<n>-<slug>` a partir de `main` (se a branch já existir de uma sessão anterior, apenas faça checkout nela — não recrie). Confirme com `git status` antes de prosseguir se houver mudanças não commitadas pendentes em outra branch.

4. **Marque em desenvolvimento.** Atualize o frontmatter (`status: em-desenvolvimento`) do arquivo da spec, se ainda não estiver, e a linha correspondente em `docs/specs.md`.

5. **A lista de tasks é a seção "## Tasks" do arquivo da spec, não um TodoWrite solto.** TodoWrite ainda é útil como visão de progresso *desta sessão*, mas a fonte de verdade entre sessões é o checklist no arquivo — é isso que permite a outra pessoa (ou você mesmo, numa sessão nova) retomar a spec sabendo exatamente o que já foi feito, e é isso que `/fechar-spec` audita.
   - **Se a seção "## Tasks" já existe e tem itens**, carregue-a no TodoWrite e continue dali — não reinvente a quebra.
   - **Se a seção está vazia ou não existe** (spec escrita antes desta convenção, ou saída incompleta de `/spec-write`), quebre a spec (User Stories + Implementation Decisions) em tasks agora, seguindo as mesmas regras do `/spec-write` (uma task = um commit, ordenada por dependência, teste antes da implementação que testa), e **escreva a lista no arquivo antes de começar a codar**. Não pule esta etapa mesmo para specs pequenas.
   - **Se algumas tasks já foram implementadas antes desta convenção existir** (código já no repo, sem checklist correspondente), marque-as retroativamente como `[x]` com uma nota do commit que já fez aquilo, em vez de reimplementar ou fingir que não existem.

6. **Antes de cada task, consulte `dev-router`** (invoque via Skill tool) para checar se a fase que
   está prestes a começar bate com uma linha da tabela de roteamento — em especial `codebase-design`
   ao desenhar um módulo/seam novo (a maioria das primeiras tasks de uma spec nova cai aqui) e
   `security-review` antes do `/fechar-spec` de uma spec que toca auth/financeiro/paciente. Não pule
   isso mesmo copiando um padrão já existente no repo — a skill confirma que o padrão continua certo
   para o caso novo, não só que ele existe.

7. **Desenvolva test-first, pela seam definida na spec** (seção "Testing Decisions"), uma task por vez, na ordem do checklist:
   - Escreva o teste que descreve o comportamento esperado antes do código de produção.
   - Implemente o mínimo para o teste passar.
   - Só então marque a task como `[x]` no arquivo e passe pra próxima.
   - Siga os padrões já estabelecidos no código existente (ex: `apps/api/src/vertere_api/auth`); consulte antes de inventar um padrão novo.
   - Não implemente nada listado em "Out of Scope" — isso é escopo de outra spec.

8. **Cada task concluída = um commit** via `/commit` (tipo apropriado, escopo `s<n>`) — não acumule várias tasks num commit só, e não espere terminar a spec inteira para o primeiro commit. **Marcar `[x]` no arquivo da spec faz parte do commit daquela task**, não uma atualização separada depois.

9. **Rode a suíte de testes do módulo a cada task, com cobertura** (`uv run pytest --cov=vertere_api --cov-report=term-missing`, não só `pytest`), não só no final. Cobertura visível a cada task pega linha não exercitada (ex: um branch de erro só testado na seam, não no router) no momento em que ela aparece, em vez de só num `/code-review` manual depois — não substitui julgamento sobre a qualidade do teste, só reduz o ponto cego de "não testei isso ainda". Se algo já existente quebrar, pare e resolva antes de continuar.

10. **Se descobrir uma necessidade nova fora do escopo da spec**, não implemente: anote na seção "Descobertas" do arquivo da spec e pare para decisão do usuário (guardrail do projeto). Se a necessidade implica uma task nova dentro do escopo já aprovado (não uma expansão de escopo), adicione a task ao checklist com uma nota de por que surgiu, em vez de só mencionar em texto solto.

11. **Ao concluir todas as tasks do checklist**, não declare a spec "pronta" sozinho: diga ao usuário que a implementação está completa nesta branch e recomende rodar `/fechar-spec S<N>` — esse comando é a única forma de encerrar uma spec neste projeto. Se restar task não marcada, diga isso explicitamente em vez de sugerir `/fechar-spec` antes da hora.

## Se a spec depender de algo ainda não implementado

Se a spec presume um módulo anterior que ainda não existe no código, pare e avise o usuário em vez de mockar ou assumir a dependência — sinalize o bloqueio explicitamente.

## Ajuste apontado por um dev numa spec já entregue/em desenvolvimento

Quando um desenvolvedor aponta um ajuste necessário numa spec (após as tasks/spec já concluídas, ou durante `/fechar-spec`):

1. **Localize onde foi implementado** via `git log --oneline` (commits referenciam `Spec: docs/specs/S<N>-*.md (T<N>)` — não assumir, confirmar no histórico) e `docs/adr/` quando o ajuste tocar uma decisão arquitetural.
2. **Aplique o fix na branch da spec correspondente** (`spec/s<n>-*`), nunca numa branch solta nova — mesmo que a spec já esteja `entregue`, reabra/continue na mesma branch.
3. **Referencie no commit qual task/etapa continha o erro original** (ex: `fix(s<n>): corrige X (achado na T<N>)`), para manter rastreabilidade de onde o comportamento nasceu.

Vale tanto para achados de `/code-review`/`verificador-de-spec` quanto para qualquer ajuste ad-hoc pedido depois.
