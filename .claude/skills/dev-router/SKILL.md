---
name: dev-router
description: Use this skill automatically whenever doing spec development work in the Vertere Lab repo — implementing a spec (/spec-start), debugging a failing test or unexpected behavior, touching frontend/UI code in apps/web, building the future LangChain/LangGraph AI layer, resolving a merge conflict, or writing/editing a .claude/ command, agent or skill. It detects which phase of development you're in and dispatches (via the Skill tool) to the right specialized skill already installed in .claude/skills — codebase-design, tdd, diagnosing-bugs, frontend-design, ui-ux-pro-max, ecosystem-primer, the langchain-*/langgraph-* skills, resolving-merge-conflicts, writing-for-agents, security-review, dataviz — so the right practice applies without the user having to invoke each one by name. Trigger this before starting substantial spec implementation or debugging work, not for trivial one-off questions or pure discussion.
---

Este projeto já tem muitas skills instaladas em `.claude/skills` que cobrem partes específicas do desenvolvimento — mas elas só ajudam se alguém lembrar de chamá-las no momento certo. Este roteador existe para que você não precise se lembrar: ele mapeia "o que estou prestes a fazer" para "qual skill instalada sabe fazer isso melhor do que eu sozinho", e te instrui a chamá-la via Skill tool antes de seguir.

Isso não substitui o fluxo de specs do projeto (`/spec-write`, `/spec-start`, `/fechar-spec`, ver `CLAUDE.md`) — ele entra **dentro** desse fluxo, no momento certo de cada fase.

## Como usar

1. **Identifique a fase do trabalho que está prestes a começar** — não a que já terminou. O valor deste roteador está em disparar a skill certa *antes* de escrever código ou tomar uma decisão de design, não depois de já ter feito do jeito errado.
2. **Consulte a tabela abaixo** e ache a linha que corresponde à fase atual.
3. **Invoque a(s) skill(s) indicada(s) via Skill tool** antes de prosseguir com o trabalho daquela fase.
4. **Mais de uma linha pode bater ao mesmo tempo** (ex: uma spec que envolve tanto uma seam de teste nova quanto uma tela em `apps/web`) — invoque todas as que se aplicam, seguindo a ordem sugerida na coluna "quando" quando houver dependência entre elas (design antes de implementação, por exemplo).
5. **Se nada da tabela bater, não force uma skill que não se aplica.** O objetivo é rotear certo, não rotear sempre.

## Tabela de roteamento

| Sinal / fase | Skill(s) a invocar | Por quê |
|---|---|---|
| Desenhando um módulo novo, decidindo onde fica uma seam de teste, avaliando se uma interface está "rasa" demais (muitos parâmetros, muito acoplamento) | `codebase-design` | Dá o vocabulário e a checklist para módulos profundos e testáveis — é o padrão que já usamos em S1 (`authenticate`/`authorize`) e que toda spec nova deveria repetir |
| Prestes a escrever código de produção para uma task de spec (dentro de `/spec-start`) | `tdd` | O projeto é test-first por convenção (`CLAUDE.md`); esta skill cobre o ciclo red-green-refactor e como mockar (ou não mockar) corretamente |
| Um teste está falhando, um comportamento não bate com o esperado, algo que funcionava parou de funcionar | `diagnosing-bugs` | Dá um loop de diagnóstico estruturado em vez de tentativa-e-erro às cegas |
| Mexendo em `apps/web` — criando ou ajustando componente, tela, layout | `frontend-design`, depois `ui-ux-pro-max` se envolver decisão visual/de design system (cores, tipografia, ícones, gráficos) | `frontend-design` cobre direção estética geral; `ui-ux-pro-max` tem a base de dados de padrões de UI/UX mais específica |
| Construindo a camada de IA (fase futura — LangChain/LangGraph: agente, tool, RAG, human-in-the-loop) | `ecosystem-primer` primeiro (decide a abordagem: LangChain puro vs LangGraph vs Deep Agents), depois a skill específica pertinente (`langchain-fundamentals`, `langchain-middleware`, `langgraph-fundamentals`, `langgraph-human-in-the-loop`, `langchain-rag`, conforme o que estiver sendo construído) | Evita escolher o padrão errado de agente antes de entender as opções; essencial dado o guardrail de HITL do PRD para qualquer ação de IA |
| Resolvendo um conflito de merge ou rebase | `resolving-merge-conflicts` | Processo específico para não perder mudanças de nenhum lado |
| Escrevendo ou editando um command, agent ou skill dentro de `.claude/` | `writing-for-agents` | Convenções de como escrever instruções que um agente (inclusive você mesmo, sem este contexto) consegue seguir |
| Antes de `/fechar-spec` numa spec que toca dado sensível (auth, financeiro, dados de paciente/clínica) | `security-review` | Verificação de segurança dedicada, complementar (não substitui) ao `verificador-de-spec` |
| Construindo gráfico, dashboard ou qualquer visualização de dado (ex: dashboard analítico da fase de IA) | `dataviz` | Padrões de cor, forma e acessibilidade para visualização — evita reinventar isso a cada tela |

## O que este roteador não faz

Ele não implementa nada sozinho, não decide por você qual spec trabalhar, e não substitui o julgamento de quando uma skill genuinamente não se aplica. Ele só reduz o custo de lembrar que a skill certa existe.
