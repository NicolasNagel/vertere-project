---
description: Cria um commit organizado pela spec em desenvolvimento (S1/S2/...), com prefixo conventional commit e corpo detalhado do que mudou.
argument-hint: [S<N>] [mensagem opcional]
---

Você vai criar um commit git seguindo o padrão deste projeto: toda mudança é rastreável à spec (S1, S2, ...) que a motivou, com um prefixo de tipo e um corpo que explica o desenvolvimento em detalhe suficiente para o usuário acompanhar o que foi feito sem reler o diff inteiro.

Argumentos recebidos (`$ARGUMENTS`): opcionalmente o código da spec (ex: `S1`) e/ou uma descrição do que fazer. Se vazio, infira tudo a partir do estado do repositório e da conversa.

## Processo

1. **Ver o que mudou.** Rode `git status` e `git diff` (staged e unstaged) para entender o que será commitado. Nunca rode `git add -A`/`git add .` — liste os arquivos relevantes explicitamente.

2. **Identificar a spec.** Leia `docs/specs.md` (tabela `S<N> → módulo → issue`).
   - Se `$ARGUMENTS` já indica a spec (ex: `S1`), use-a.
   - Senão, infira pelos arquivos alterados (ex: mudanças em `apps/api/src/vertere_api/auth/` → S1) e pelo que foi discutido na conversa até aqui.
   - Se a mudança não corresponde a nenhuma spec listada (ex: tooling, setup de projeto, algo cross-cutting), use `S0` para "sem spec específica" — não invente um novo código de spec sem confirmar com o usuário.
   - Se a mudança pertence a uma spec nova que ainda não está em `docs/specs.md`, pergunte ao usuário o código e a issue antes de prosseguir, e adicione a linha na tabela como parte deste commit.

3. **Escolher o tipo (conventional commit).** Baseado na natureza da mudança predominante:
   - `feat`: nova funcionalidade ou comportamento observável novo
   - `fix`: correção de bug/comportamento incorreto
   - `docs`: documentação (PRD, specs, ADRs, comentários, READMEs)
   - `test`: só testes, sem mudança de comportamento
   - `refactor`: mudança interna sem alterar comportamento externo
   - `chore`: tooling, dependências, configuração
   Se a mudança misturar tipos de forma que não cabe em um só commit coerente, sugira ao usuário dividir em commits separados em vez de forçar um prefixo genérico.

4. **Montar a mensagem.**
   - **Título**: `[S<N>] <tipo>: <resumo curto, no imperativo, em português>` — ex: `[S1] feat: implementa authenticate/authorize com testes`.
   - **Corpo**: lista com o que foi feito e por quê (não apenas o quê — o diff já mostra o quê). Cada item deve ajudar o usuário a entender a decisão, não só a mudança de código. Referencie a issue da spec (`Refs #<issue>`) quando houver uma.
   - Termine com as linhas de atribuição indicadas pelo system-reminder da conversa (Co-Authored-By / Claude-Session), exatamente como especificado ali.

5. **Confirmar escopo.** Mostre ao usuário o título e o corpo propostos, e quais arquivos serão staged, antes de commitar — a menos que o usuário já tenha aprovado explicitamente um commit automático nesta conversa.

6. **Commitar.** Stage apenas os arquivos relevantes, crie o commit com a mensagem via heredoc, e rode `git status` depois para confirmar.

## Exemplo de mensagem final

```
[S1] feat: implementa authenticate/authorize com testes

- Adiciona domínio Papel/Usuario e a seam authenticate()/authorize() em
  apps/api/src/vertere_api/auth, conforme a spec (issue #2).
- authorize() aplica escopo de clínica: papel CLINICA só acessa recursos
  da própria clínica (clinica_usuario == clinica_recurso).
- Hash de senha com bcrypt direto (não passlib — incompatível com bcrypt
  5.x, ver ADR-0002).
- 11 testes cobrindo login válido/inválido, conta inativa e autorização
  por papel, sem HTTP/DB (repositório fake em memória).

Refs #2

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XaJssLyTRq5S28Qy6F9tru
```
