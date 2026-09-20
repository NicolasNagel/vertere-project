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
- `issues/prd.md` — PRD: problema, solução, user stories e decisões do MVP; origem de tudo abaixo
- `docs/adr/` — decisões arquiteturais (ADR-0001 stack, ADR-0002 frameworks/ferramentas, ...)
- `docs/specs/S-XX-*.md` — a spec em execução é a **fonte de verdade** da sessão (não a issue)
- `docs/specs.md` — índice `S<N> → arquivo → issue → status`
- `docs/agents/issue-tracker.md` — convenções de uso do GitHub Issues via `gh`
- `docs/agents/domain.md` — como e quando ler `CONTEXT.md`/`docs/adr/` antes de explorar o código

## Fluxo de trabalho (SDD)
1. Cada spec é um **arquivo** em `docs/specs/S-XX-nome.md` (frontmatter `codigo`, `modulo`,
   `issue`, `status`). A issue do GitHub linkada no frontmatter é **ponteiro**, nunca cópia:
   requisito e task vivem só no arquivo. Se as duas discordarem, o arquivo vence.
2. Cada spec = uma branch `spec/s-XX-nome` a partir da `main`, idealmente numa sessão nova do
   Claude Code (o subagente de verificação já cobre a independência de contexto; a sessão nova
   por spec evita que a sessão de implementação vire a mesma que decide se terminou).
3. Cada task da spec = um commit (`tipo(escopo): mensagem`, ver Convenções).
4. **Verificação independente ANTES do PR, não antes do merge.** Terminada a implementação, a
   sessão autora para e roda **`/fechar-spec S-XX`**, que dispara o subagente
   **`verificador-de-spec`** passando só o código da spec — nada além disso. Ele gera
   `docs/specs/relatorios/S-XX-verificacao.md`. Quem implementou já sabe que está certo: é esse
   saber que faz o revisor não olhar direito. O relatório é **arquivo, não comentário de PR** —
   o PR ainda não existe. Sem veredito ✅, não existe PR.
   > O prompt do revisor vive em `.claude/agents/verificador-de-spec.md`, **versionado**. Quem
   > chama passa o id da spec e mais nada: instrução escrita à mão pelo autor não é verificação
   > independente, é o autor se avaliando com outra voz. Enviesar a revisão passa a exigir um
   > commit naquele arquivo — no diff, onde fica visível depois.
5. Corrigir o que a verificação apontou **na mesma branch, antes do PR** — o PR nasce já com a
   correção dentro. Só então: PR para `main` com `Closes #N` e o relatório de verificação
   anexado/linkado.
6. Merge por squash. O squash fecha a issue-ponteiro.

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

## Agent skills

### Issue tracker

Issues e specs deste repo vivem como GitHub Issues em `NicolasNagel/vertere-project`, via CLI `gh`; a issue de cada spec é ponteiro para o arquivo em `docs/specs/`, nunca cópia do conteúdo. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` (ainda não criado) + `docs/adr/` na raiz do repo. See `docs/agents/domain.md`.
