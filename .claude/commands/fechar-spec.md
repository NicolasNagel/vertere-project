---
description: Único jeito de encerrar uma spec. Dispara o subagente verificador-de-spec (sessão independente) passando só o código da spec, e nada além disso.
argument-hint: S<N>
---

Este comando é deliberadamente fino. Sua única função é acionar o subagente **`verificador-de-spec`** (definido em `.claude/agents/verificador-de-spec.md`, versionado) passando **apenas o código da spec** — nenhuma instrução adicional, nenhum resumo do que você fez, nenhum "está tudo certo, só confirme". Quem implementou já sabe que está certo: é esse saber que faz o revisor não olhar direito. Passar mais que o id anula a independência que este comando existe para garantir.

Argumento (`$ARGUMENTS`): o código da spec, ex: `S1`. Se vazio, pergunte qual spec fechar.

## Processo

1. **Confirme que a spec existe** em `docs/specs.md` (só para resolver o código — não leia o conteúdo da spec agora, isso é trabalho do verificador).

2. **Invoque o subagente** via Agent tool com `subagent_type` apontando para o agente `verificador-de-spec`, passando como prompt só: o código da spec (ex: `S1`) e a instrução de seguir exatamente o processo do seu arquivo de definição. Não inclua no prompt nada sobre o que foi implementado, decisões tomadas, ou qualquer contexto desta sessão.

3. **Aguarde o relatório.** O subagente escreve `docs/specs/relatorios/S<N>-verificacao.md` e retorna o veredito.

4. **Leia o relatório gerado** e aja sobre o veredito:
   - **✅ APROVADA**: atualize `docs/specs.md` e o frontmatter do arquivo da spec para `status: entregue`; comente na issue-ponteiro com o link do relatório (`gh issue comment`). **Não feche a issue aqui** — pelo fluxo do projeto (`CLAUDE.md`), ela fecha via squash-merge do PR (`Closes #N` no corpo do PR), não manualmente antes do PR existir. Registre com `/commit` (tipo `docs`, escopo `s<n>`), depois rode `/code-review` na branch antes de abrir o PR.
   - **❌ BLOQUEADA**: não altere `docs/specs.md` além de manter `em-desenvolvimento`; não feche a issue. Copie a lista de pendências do relatório para a seção "Verificação" do arquivo da spec. Diga explicitamente ao usuário: **não seguir para a próxima spec, nem abrir PR, até resolver isto** — e volte para `/spec-start S<N>` na mesma branch para corrigir.

5. **Nunca contorne o veredito.** Se você (a sessão que chamou este comando) discordar do relatório, isso é uma conversa com o usuário, não uma reescrita do relatório ou uma segunda tentativa de convencer o verificador com mais contexto.
