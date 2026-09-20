---
description: Inicia o desenvolvimento de uma spec publicada (S1/S2/...) numa branch dedicada - lê o arquivo, planeja, implementa test-first, um commit por task.
argument-hint: S<N>
---

Você vai começar (ou retomar) a implementação de uma spec já publicada. Este comando não escreve a spec (use `/spec-write`) nem decide se ela está pronta para seguir em frente (use `/fechar-spec`) — só cobre o desenvolvimento. Idealmente esta spec roda numa sessão nova dedicada a ela (convenção do projeto, ver `CLAUDE.md`); se esta sessão já vem de outro trabalho, avise o usuário mas não bloqueie.

Argumento (`$ARGUMENTS`): o código da spec, ex: `S1`. Se vazio, pergunte ao usuário qual spec — nunca escolha sozinho qual módulo desenvolver.

## Processo

1. **Resolva a spec.** Busque `S<N>` em `docs/specs.md` para achar o arquivo (`docs/specs/S<N>-*.md`) e a issue-ponteiro. Se `S<N>` não existir no registro, pare e avise (falta rodar `/spec-write`).

2. **Leia o arquivo da spec inteiro** — é a fonte de verdade, não a issue. Leia também `issues/prd.md` (contexto do módulo) e os ADRs relevantes em `docs/adr/`.

3. **Crie/troque para a branch da spec**: `git checkout -b spec/s<n>-<slug>` a partir de `main` (se a branch já existir de uma sessão anterior, apenas faça checkout nela — não recrie). Confirme com `git status` antes de prosseguir se houver mudanças não commitadas pendentes em outra branch.

4. **Marque em desenvolvimento.** Atualize o frontmatter (`status: em-desenvolvimento`) do arquivo da spec, se ainda não estiver, e a linha correspondente em `docs/specs.md`.

5. **Planeje antes de codar.** Quebre a spec (User Stories + Implementation Decisions) em uma lista de tasks com o TodoWrite, na ordem que respeita dependências internas do módulo. Não pule esta etapa mesmo para specs pequenas.

6. **Desenvolva test-first, pela seam definida na spec** (seção "Testing Decisions"):
   - Escreva o teste que descreve o comportamento esperado antes do código de produção.
   - Implemente o mínimo para o teste passar.
   - Só então trate a próxima task.
   - Siga os padrões já estabelecidos no código existente (ex: `apps/api/src/vertere_api/auth`); consulte antes de inventar um padrão novo.
   - Não implemente nada listado em "Out of Scope" — isso é escopo de outra spec.

7. **Cada task concluída = um commit** via `/commit` (tipo apropriado, escopo `s<n>`) — não acumule várias tasks num commit só, e não espere terminar a spec inteira para o primeiro commit.

8. **Rode a suíte de testes do módulo a cada task**, não só no final. Se algo já existente quebrar, pare e resolva antes de continuar.

9. **Se descobrir uma necessidade nova fora do escopo da spec**, não implemente: anote na seção "Descobertas" do arquivo da spec e pare para decisão do usuário (guardrail do projeto).

10. **Ao concluir todas as tasks**, não declare a spec "pronta" sozinho: diga ao usuário que a implementação está completa nesta branch e recomende rodar `/fechar-spec S<N>` — esse comando é a única forma de encerrar uma spec neste projeto.

## Se a spec depender de algo ainda não implementado

Se a spec presume um módulo anterior que ainda não existe no código, pare e avise o usuário em vez de mockar ou assumir a dependência — sinalize o bloqueio explicitamente.
