---
description: Cria um commit no padrão Conventional Commits do projeto (tipo(escopo): mensagem), escopo obrigatório, corpo detalhado do que mudou.
argument-hint: [escopo] [mensagem opcional]
---

Você vai criar um commit git seguindo o padrão deste projeto (ver `CLAUDE.md` → Convenções): `tipo(escopo): mensagem`, mensagem em português (código/identificadores continuam em português, ver ADR de convenções), corpo explicando o porquê de cada mudança.

Argumentos recebidos (`$ARGUMENTS`): opcionalmente o escopo (ex: `s1`, `adr`, `harness`) e/ou uma descrição do que fazer. Se vazio, infira tudo a partir do estado do repositório e da conversa.

## Processo

1. **Ver o que mudou.** Rode `git status` e `git diff` (staged e unstaged). Nunca rode `git add -A`/`git add .` — liste os arquivos relevantes explicitamente. Cuidado ao adicionar diretórios inteiros: `git add <dir>` também staga deleções dentro dele — prefira listar arquivo por arquivo quando o diretório tiver mudanças mistas.

2. **Escolha o tipo.** Um de: `feat` (funcionalidade/comportamento novo), `fix` (correção de bug), `test` (só testes), `docs` (documentação: PRD, specs, ADRs, READMEs), `spec` (criação/edição de arquivo de spec em `docs/specs/`), `adr` (novo ADR ou mudança de decisão registrada), `chore` (tooling, dependências, configuração), `refactor` (mudança interna sem alterar comportamento externo), `ci` (pipeline/hooks). Se a mudança misturar tipos que não cabem num commit coerente, sugira dividir em vez de forçar um tipo genérico.

3. **Escolha o escopo (obrigatório).**
   - Mudança que implementa/testa uma spec: o código da spec em minúsculo (`s1`, `s2`, ...) — consulte `docs/specs.md` para confirmar qual.
   - Mudança sem spec associada (tooling, ADR, setup): um nome de área curto (`adr`, `harness`, `commands`, `agents`, `deploy`).
   - Nunca invente um escopo novo sem que ele apareça de forma óbvia no diff — se não tiver certeza, pergunte.

4. **Monte a mensagem.**
   - **Título**: `tipo(escopo): resumo curto no imperativo` — ex: `feat(s1): implementa authenticate/authorize com testes`.
   - **Corpo**: lista do que foi feito e por quê — a decisão, não só o diff. Referencie a spec e a issue-ponteiro (`Refs #<issue>`) quando houver: `Spec: docs/specs/S<N>-*.md` para specs legadas (S1–S10), ou `Spec: specs/0NN-slug/spec.md` para specs criadas pelo Spec Kit (S11+) — confira `docs/specs.md` para saber qual formato a spec ativa usa.
   - Termine com as linhas de atribuição indicadas pelo system-reminder da conversa (Co-Authored-By / Claude-Session).

5. **Confirme escopo e arquivos staged** com o usuário antes de commitar, a menos que ele já tenha aprovado explicitamente um commit automático nesta conversa.

6. **Commite.** Stage só os arquivos relevantes, crie o commit via heredoc, rode `git status` depois para confirmar.

## Exemplo

```
feat(s1): implementa authenticate/authorize com testes

- Adiciona domínio Papel/Usuario e a seam authenticate()/authorize() em
  apps/api/src/vertere_api/auth, conforme a spec.
- authorize() aplica escopo de clínica: papel CLINICA só acessa recursos
  da própria clínica.
- 11 testes cobrindo login válido/inválido, conta inativa e autorização
  por papel, sem HTTP/DB (repositório fake em memória).

Spec: docs/specs/S1-auth-usuarios.md
Refs #2

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XaJssLyTRq5S28Qy6F9tru
```
