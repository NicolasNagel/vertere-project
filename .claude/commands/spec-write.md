---
description: "[LEGADO — só para manutenção de S1-S10] Escreve uma nova spec como arquivo versionado em docs/specs/, com issue-ponteiro no GitHub, seguindo o template e o processo de seams do projeto."
argument-hint: [módulo ou tema da spec]
---

> **Legado**: a partir de S11, spec nova entra por `/speckit-specify` (Spec Kit), não por aqui —
> ver `CLAUDE.md` → "Fluxo de trabalho (SDD)". Este comando continua existindo só para reabrir ou
> ajustar o formato de arquivo único das specs S1–S10 já existentes. Se o pedido for de uma spec
> nova sem o usuário citar explicitamente `/spec-write`, prefira `/speckit-specify`.

Você vai produzir uma nova spec para este projeto. A spec é um **arquivo**, não a issue — a issue é só um ponteiro de rastreamento. Uma spec só é aceitável se puder alimentar diretamente `/spec-start` sem ambiguidade: outro agente (sessão nova, sem esta conversa) deve conseguir implementá-la lendo só o arquivo da spec, o PRD e os ADRs.

Argumento (`$ARGUMENTS`): módulo/tema da spec (ex: "Clínicas"). Se vazio, infira da conversa qual módulo é o próximo natural, seguindo a ordem de dependência do PRD (`issues/prd.md`).

## Processo

1. **Não faça entrevista.** Sintetize o que já foi discutido e o que está em `issues/prd.md` (Problem Statement, User Stories e Implementation Decisions do módulo). Se faltar uma decisão que o PRD não cobre, pergunte objetivamente — mas não repita perguntas já respondidas.

2. **Leia o contexto de domínio** (`docs/agents/domain.md`): `docs/adr/` na raiz, para não contradizer uma decisão já tomada nem reinventar vocabulário. Contradição com um ADR existente vira nota explícita na spec, nunca sobreposição silenciosa.

3. **Sketch da seam de teste.** Identifique o ponto único (ou o menor número possível) onde o comportamento será testado — prefira uma função/serviço puro, testável sem HTTP/DB/UI, seguindo o padrão já usado em S1 (`authenticate`/`authorize` em `apps/api/src/vertere_api/auth/service.py`). Novas seams só quando a existente não servir.

4. **Confirme a seam com o usuário** antes de escrever a spec inteira.

5. **Quebre a spec em Tasks explícitas** — esta é a lista que `/spec-start` vai seguir e `/fechar-spec` vai auditar, não um TodoWrite efêmero de sessão. Regras:
   - Cada task deve caber em **um commit** (convenção do projeto: task da spec = commit). Se uma task parece grande demais para um commit coerente, quebre em mais tasks.
   - Ordene por dependência real (o que precisa existir antes do quê), não pela ordem das user stories no texto.
   - Cada task referencia as user stories que ela cobre, para o rastreamento em `/fechar-spec` ser direto.
   - A(s) task(s) de teste da seam confirmada no passo 4 vêm antes da task de implementação que ela testa (test-first é convenção do projeto).
   - Não quebre em micro-tasks artificiais só para ter mais itens — o critério é "cabe num commit coerente", não "é pequeno".

6. **Crie o arquivo** `docs/specs/S<N>-<slug-do-modulo>.md` com este frontmatter e template:

```markdown
---
codigo: S<N>
modulo: <Módulo>
issue: <preenchido depois de publicar a issue>
status: rascunho
---

## Problem Statement
## Solution
## User Stories
## Implementation Decisions
## Testing Decisions
## Tasks
<!-- Checklist, uma task = um commit. Formato: - [ ] T<N> — descrição (User Stories: n, n, n) -->
## Out of Scope
## Further Notes
## Descobertas
<!-- Necessidades novas encontradas durante o desenvolvimento, fora do escopo acima. Não implementar sem decisão do PO. -->
## Verificação
<!-- Preenchido por /fechar-spec -->
```

User Stories em lista numerada extensa ("Como \<ator\>, quero \<funcionalidade\>, para \<benefício\>"). Implementation Decisions sem paths de arquivo específicos nem trechos de código (exceto snippet de protótipo que encode uma decisão com mais precisão que prosa). Testing Decisions aponta para os testes de S1 como prior art do padrão do projeto. Tasks no formato `- [ ] T<N> — descrição (User Stories: n, n, n)`, numeradas na ordem de execução.

7. **Publique a issue-ponteiro no GitHub** (`docs/agents/issue-tracker.md`): título `Spec: <Módulo>`, corpo só com o link para o arquivo (issue nunca duplica o conteúdo), label `ready-for-agent` (crie a label se não existir). Confirme com o usuário antes de publicar (issue pública). Depois, edite o frontmatter do arquivo com o link da issue e mude `status` para `pronta`.

8. **Atualize `docs/specs.md`**: adicione a linha `S<N> | <Módulo> | link do arquivo | #issue | pronta`.

9. **Registre com `/commit`** (tipo `spec`, escopo `s<n>`).

## Saída esperada ao final

Informe: caminho do arquivo, código `S<N>`, link da issue, e a seam de teste confirmada — para rodar `/spec-start S<N>` em seguida.
