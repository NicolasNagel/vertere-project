# Vertere Lab — Harness do projeto

## O que é este projeto
Sistema de gestão para o **Laboratório Vertere**, laboratório veterinário em Jaraguá do Sul/SC:
substitui o controle hoje feito em planilha Excel por um sistema web com controle de acesso por
papel, cadastro de clínicas/veterinários/pacientes, registro de atendimentos com precificação
automática (incluindo regras de plantão), emissão e envio de laudos por tipo de exame, e
fechamento financeiro mensal por clínica. Uma fase futura (fora do MVP) adiciona IA: assistente
de dúvidas para clientes, suporte a análise, e dashboard analítico — sob os guardrails abaixo.

## Regra de ouro (governa toda decisão de código)
> O código decide O QUE PODE SER FEITO. A IA, quando existir na aplicação, decide no máximo O
> QUE DIZER — nunca o que fazer, nunca o que é verdade sobre o paciente.
- Preço, valor total, desconto, cálculo de fechamento: **sempre** código/banco, nunca uma IA.
- Controle de acesso: `authorize()` (módulo `auth`) é o **único** ponto de decisão de permissão
  por papel; nenhum módulo reimplementa checagem de acesso por conta própria.
- A IA (fase futura) **nunca diagnostica** o paciente — só tira dúvidas.
- A IA **nunca age** na aplicação (criar, editar, enviar, cobrar) sem validação humana explícita.
- A IA **nunca expõe** dado financeiro, de paciente ou do laboratório a quem não tem permissão
  para vê-lo — a checagem é sempre via `authorize()`, nunca uma regra reimplementada no prompt.

## Documentos normativos (ler antes de implementar qualquer spec)
- `handoff.md` (raiz do repo) — **ler primeiro, sempre, antes de qualquer outra coisa nesta seção**:
  estado transitório entre sessões (branches em andamento, o que outra sessão/agente deixou pronto
  ou pendente, decisões de harness ainda não commitadas). Múltiplos agentes de IA trabalham neste
  repo (Claude Code, Codex CLI, outros) sem compartilhar contexto entre si — o estado real do git
  (`git status`, `git branch -a`, `git log --oneline -10`) é sempre a fonte de verdade sobre código,
  mas `handoff.md` é o que evita repetir trabalho ou presumir errado sobre o que já foi decidido.
- `issues/prd.md` — PRD: problema, solução, user stories e decisões do MVP; origem de tudo abaixo
- `docs/adr/` — decisões arquiteturais (ADR-0001 stack, ADR-0002 frameworks/ferramentas, ...)
- A spec em execução é a **fonte de verdade** da sessão (não a issue): `docs/specs/S-XX-*.md` para
  S1–S10 (legado), ou `specs/0NN-slug/{spec.md,plan.md,tasks.md}` para S11+ (Spec Kit)
- `docs/specs.md` — índice único `S<N> → spec → issue → status`, cobrindo os dois formatos
- `docs/agents/issue-tracker.md` — convenções de uso do GitHub Issues via `gh`
- `docs/agents/domain.md` — como e quando ler `CONTEXT.md`/`docs/adr/` antes de explorar o código

## Fluxo de trabalho (SDD)

**Ponto de entrada padrão a partir de S11**: sempre que o usuário der uma instrução ou comando sem
dizer explicitamente qual skill usar, trate como um pedido de spec e entre pelo **Spec Kit**
(`speckit-*`, ver "Spec Kit" abaixo) — não pelos comandos legados (`/spec-write`/`/spec-start`,
mantidos só para manutenção de S1–S10, ver nota no fim desta seção).

1. `/speckit-specify <descrição da feature>` cria `specs/0NN-nome-curto/spec.md` a partir da
   descrição em linguagem natural (User Scenarios, Functional Requirements, Success Criteria).
   **Numeração continua a sequência S<N> já em uso**: o próximo número é sempre `docs/specs.md`
   (linha) + 1 — hoje isso é `011`. Não deixe o Speckit escanear `specs/` sozinho para decidir o
   número na primeira spec nova (ele começaria em `001`, colidindo com a numeração histórica);
   informe o número explicitamente na conversa com a skill se ela perguntar, ou corrija o nome do
   diretório logo após a criação, antes de prosseguir. Diretório `0NN-slug` = spec `S<NN>` (tira os
   zeros à esquerda) — use esse mapeamento ao criar a issue-ponteiro e ao decidir escopo de commit.
2. Como o Spec Kit não abre issue automaticamente: **crie a issue-ponteiro no GitHub manualmente**
   (`gh issue create`, ver `docs/agents/issue-tracker.md`) logo depois do `/speckit-specify`, e
   **registre a linha em `docs/specs.md`** (`S<N> → specs/0NN-slug/spec.md → issue → rascunho`) —
   esse arquivo continua sendo o índice único de todas as specs, história (`docs/specs/S-XX-*.md`)
   e novas (`specs/0NN-slug/`).
3. `/speckit-plan` gera `specs/0NN-slug/plan.md` (decisões de implementação/arquitetura — o
   equivalente à antiga seção "Implementation Decisions"). `/speckit-clarify` (opcional, antes do
   plan) resolve ambiguidades reais antes de planejar.
4. `/speckit-tasks` gera `specs/0NN-slug/tasks.md` — o checklist de tasks, equivalente à antiga
   seção "## Tasks", e continua sendo a fonte de verdade de progresso entre sessões (não um
   TodoWrite efêmero). `/speckit-analyze`/`/speckit-checklist` (opcionais, antes do implement)
   auditam consistência entre spec/plan/tasks antes de codar.
5. **Antes de `/speckit-implement` (ou de qualquer task manual dentro dele), consultar
   `dev-router`** (`.claude/skills/dev-router/SKILL.md`) para identificar se a fase bate com uma
   skill especializada já instalada (`codebase-design` ao desenhar módulo/seam novo,
   `security-review` antes de `/fechar-spec` numa spec sensível, `tdd`, `diagnosing-bugs`, etc.).
   Não é opcional: pular esse passo é a forma mais comum de repetir um erro de design que a skill
   já preveniria.
6. `/speckit-implement` executa `tasks.md` task por task. Cada task concluída = um commit próprio
   (`tipo(escopo): mensagem`, ver Convenções — escopo `s<n>`, ex: `s11`); marcar `[x]` em
   `tasks.md` faz parte do commit da task, não uma atualização separada. Rodar a suíte de testes do
   módulo afetado, com cobertura, antes de cada commit de task.
7. **Verificação independente ANTES do PR, não antes do merge — isso não muda.** Terminada a
   implementação, a sessão autora para e roda **`/fechar-spec S<N>`**, que dispara o subagente
   **`verificador-de-spec`** passando só o código da spec — nada além disso. Ele lê
   `specs/0NN-slug/{spec.md,plan.md,tasks.md}` (via `docs/specs.md`) e gera
   `docs/specs/relatorios/S<N>-verificacao.md` (relatórios continuam centralizados aqui,
   independente do formato da spec). Quem implementou já sabe que está certo: é esse saber que faz
   o revisor não olhar direito. O relatório é **arquivo, não comentário de PR** — o PR ainda não
   existe. Sem veredito ✅, não existe PR.
   > O prompt do revisor vive em `.claude/agents/verificador-de-spec.md`, **versionado**. Quem
   > chama passa o id da spec e mais nada: instrução escrita à mão pelo autor não é verificação
   > independente, é o autor se avaliando com outra voz. Enviesar a revisão passa a exigir um
   > commit naquele arquivo — no diff, onde fica visível depois.
8. Corrigir o que a verificação apontou **na mesma branch, antes do PR** — o PR nasce já com a
   correção dentro.
9. **Rodar `/code-review` na branch antes de abrir o PR** — gate independente do `verificador-de-spec`:
   este audita aderência à spec e roda a suíte real; `/code-review` audita padrão de código
   (Standards) e aderência à issue/spec (Spec) via dois sub-agentes em paralelo, pegando o que um
   revisor de PR pegaria e o `verificador-de-spec` não foi desenhado para cobrir (duplicação,
   simplificação, convenções de estilo). Achado bloqueante: corrigir na mesma branch antes do PR,
   igual ao passo anterior — não abrir o PR com um achado bloqueante pendente.
10. Só então: PR para `main` com `Closes #N`, o relatório de verificação (`/fechar-spec`) e o
    resultado do `/code-review` anexados/linkados.
11. Merge por squash. O squash fecha a issue-ponteiro.

> **Specs legadas (S1–S10)**: vivem em `docs/specs/S-XX-nome.md` (arquivo único, frontmatter
> `codigo`/`modulo`/`issue`/`status`), criadas pelo fluxo anterior (`/spec-write` + `/spec-start`,
> ambos ainda instalados). Esse formato não é reescrito retroativamente — se uma dessas specs
> precisar reabrir para ajuste, use `/spec-start S<N>` normalmente, no mesmo arquivo/branch de
> sempre. `/spec-write`/`/spec-start` só voltam a ser o fluxo de entrada se o usuário pedir
> explicitamente; por padrão, spec nova = Spec Kit.

## Spec Kit (`specify-cli`)

Instalado e inicializado neste repo (`specify init --here --integration claude`) como o fluxo de
entrada padrão de toda spec nova a partir de S11 (ver "Fluxo de trabalho (SDD)" acima). Skills em
`.claude/skills/speckit-*/`, namespace próprio, convivendo com os comandos do projeto — não os
substitui além do que está descrito acima (spec/plan/tasks/implement trocam de mãos; verificação
independente, code-review, e o formato de PR continuam exatamente iguais). Contexto do projeto
(Regra de Ouro, `authorize()`, domínio PT-BR, seam de teste, fluxo de verificação) está registrado
em `.specify/memory/constitution.md` — mantenha os dois sincronizados: mudança de processo real
sempre volta para este `CLAUDE.md` primeiro, constitution é atualizada em seguida.

## Convenções
- Backend: Python 3.13, `uv`, FastAPI, SQLAlchemy 2.x + Alembic, PostgreSQL, `pytest`.
- Frontend: React + Vite, TypeScript, `pnpm`.
- IA (fase futura): LangChain + Langfuse.
- Código, identificadores e comentários em **português** (domínio 100% em PT-BR — PRD, planilha
  original, specs); documentação de produto também em PT-BR. Isso é uma divergência deliberada
  do inglês-por-padrão mais comum em projetos de referência — mantém consistência com o domínio.
- Contratos Pydantic em toda fronteira (rotas, tools de IA na fase futura). Tipos do frontend
  gerados a partir do OpenAPI do FastAPI.
- Seams de teste: função de serviço pura (ex: `authenticate`/`authorize` em
  `apps/api/src/vertere_api/auth/service.py`), testável sem HTTP/DB — o padrão a repetir em
  cada novo módulo, preferindo a seam mais alta possível.
- Commits: `feat|fix|test|docs|spec|adr|chore|refactor|ci(escopo): mensagem`. Escopo obrigatório:
  o código da spec em minúsculo (`s1`, `s2`, ...) quando a mudança implementa/testa uma spec, ou
  um nome de área curto (`adr`, `harness`, `commands`, `agents`) quando não há spec associada.
  Use `/commit` — ele resolve o escopo consultando `docs/specs.md`.

## Guardrails da sessão
- NUNCA commitar secrets, credenciais ou dados reais de paciente/clínica fora do que já está na
  planilha de referência (que também não deve ser tratada como exemplo de dado a expor).
- NUNCA implementar fora do escopo da spec ativa. Necessidade nova descoberta durante o
  desenvolvimento: anotar na seção "Descobertas" do arquivo da spec e parar para decisão do
  usuário — não implementar por conta própria.
- Ao terminar cada task: rodar a suíte de testes do módulo afetado antes do commit.
- Atualizar o status da spec (frontmatter do arquivo + `docs/specs.md`) a cada transição.
- Toda spec é encerrada **exclusivamente** por `/fechar-spec` — nunca por autoavaliação da sessão
  que implementou.
- **Atualizar `handoff.md` ao final de qualquer sessão que mude estado relevante**: spec fechada,
  branch trocada/criada, decisão de harness tomada, ou trabalho deixado pendente para outra sessão
  continuar. Não é um resumo de conversa — é o que a próxima sessão (deste ou de outro agente de IA
  no mesmo repo) precisa saber antes de agir, sem precisar reconstruir isso lendo `git log` inteiro.

## Agent skills

### Issue tracker

Issues e specs deste repo vivem como GitHub Issues em `NicolasNagel/vertere-project`, via CLI `gh`; a issue de cada spec é ponteiro para o arquivo em `docs/specs/`, nunca cópia do conteúdo. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` (ainda não criado) + `docs/adr/` na raiz do repo. See `docs/agents/domain.md`.

### Dev router

Antes de cada fase de implementação — `/speckit-implement` (S11+) ou `/spec-start` (S1–S10 legado) —
(design de módulo novo, TDD, debug, UI, merge conflict, IA), consultar `dev-router`
(`.claude/skills/dev-router/SKILL.md`) para disparar a skill especializada certa no momento certo,
em vez de confiar em lembrar sozinho.
