<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification — first concrete constitution content, replacing template placeholders)
- Modified principles: n/a (template placeholders replaced with 5 concrete principles)
- Added sections: Core Principles (I–V), Stack Tecnológico e Contratos, Fluxo de Desenvolvimento (SDD), Governance
- Removed sections: none (template structure preserved)
- Templates requiring updates: .specify/templates/plan-template.md (⚠ pending manual check against new principles),
  .specify/templates/spec-template.md (⚠ pending manual check — this project's own docs/specs/S-XX template already
  covers most of this; reconcile before relying on speckit-specify output), .specify/templates/tasks-template.md
  (⚠ pending manual check against "task = commit" rule below)
- Follow-up TODOs: TODO(RATIFICATION_DATE) — exact date the SDD process (spec file + issue-ponteiro + /fechar-spec)
  was first adopted in this repo is not recorded; using first spec-related commit history to backfill is a follow-up.
-->

# Vertere Lab Constitution

## Core Principles

### I. Regra de Ouro — Código Decide, IA Só Sugere (NON-NEGOTIABLE)
O código decide O QUE PODE SER FEITO. A IA, quando existir na aplicação (fase futura), decide no
máximo O QUE DIZER — nunca o que fazer, nunca o que é verdade sobre o paciente. Preço, valor
total, desconto e cálculo de fechamento financeiro são SEMPRE resolvidos em código/banco de dados;
uma IA nunca calcula nem persiste esses valores. A IA nunca diagnostica o paciente — só tira
dúvidas. A IA nunca age na aplicação (criar, editar, enviar, cobrar) sem validação humana explícita
antes da execução. A IA nunca expõe dado financeiro, de paciente ou do laboratório a quem não tem
permissão para vê-lo.
Rationale: este é um sistema que lida com dados clínicos e financeiros reais de um laboratório
veterinário; qualquer ambiguidade sobre "quem decide o quê" entre código determinístico e um
componente probabilístico (IA) é inaceitável neste domínio.

### II. Autorização Centralizada em `authorize()`
`authorize()` no módulo `auth` (`apps/api/src/vertere_api/auth/service.py`) é o único ponto de
decisão de permissão por papel em todo o backend. Nenhum outro módulo reimplementa checagem de
acesso por conta própria — nem no service, nem no router, nem numa eventual camada de IA futura.
Toda ação nova que precise de controle de papel declara uma `Acao` e passa pelo `authorize()`
existente (ou por `exigir_acao`/dependencies equivalentes em `auth/deps.py`), em vez de inventar um
`if papel == ...` local.
Rationale: um único ponto de authorization é auditável e testável isoladamente; checagens
duplicadas divergem silenciosamente ao longo do tempo e criam brechas de acesso.

### III. Domínio em Português (Divergência Deliberada)
Identificadores, código, comentários e documentação de produto são escritos em português,
refletindo o domínio 100% PT-BR do projeto (PRD, planilha original de controle, specs). Esta é uma
divergência deliberada do inglês-por-padrão mais comum em projetos de referência, mantida para
preservar consistência com a linguagem real do negócio (laboratório, clínicas, atendimentos,
laudos). Contratos de fronteira HTTP usam Pydantic; tipos do frontend (quando existir) são gerados
a partir do OpenAPI do FastAPI, não escritos à mão.
Rationale: tradução para inglês introduziria uma camada de tradução mental entre o código e o
domínio de negócio real, aumentando risco de erro em um domínio sensível (saúde animal, dinheiro).

### IV. Seam de Teste na Camada Mais Alta Possível (Test-First)
Cada módulo expõe sua lógica de negócio por trás de uma seam de função de serviço pura — o padrão
de referência é `authenticate`/`authorize` em `auth/service.py` — testável sem HTTP nem banco de
dados real, usando repositórios fake em memória. Toda task de spec escreve o teste da seam antes da
implementação (red → green). Ao terminar cada task, a suíte de testes do módulo afetado roda com
cobertura visível antes do commit daquela task; nenhuma spec ou task é considerada concluída só
porque os testes "verdes" existem — a suíte real precisa passar.
Rationale: uma seam pura na camada de service (não no router, não no banco) mantém o teste barato,
rápido e independente de infraestrutura, e é o único jeito de rodar centenas de casos de escopo de
clínica/papel sem subir Postgres a cada teste.

### V. Especificação Como Fonte de Verdade, Fechada Só por Verificação Independente
Cada funcionalidade nasce como um arquivo de spec versionado em `docs/specs/S-XX-nome.md`
(frontmatter `codigo`/`modulo`/`issue`/`status`), com uma issue do GitHub como ponteiro de
rastreamento — nunca cópia do conteúdo. Se arquivo e issue divergirem, o arquivo vence. Cada spec
vive numa branch `spec/s-XX-nome` a partir de `main`, com uma seção "## Tasks" (checklist
`- [ ] T<N> — descrição`) que é a fonte de verdade de progresso entre sessões, não uma lista
efêmera. Cada task concluída é um commit próprio (nunca várias tasks acumuladas num commit).
Nenhuma spec se encerra por autoavaliação de quem implementou: o encerramento exige um subagente de
verificação independente, acionado só com o código da spec (sem contexto adicional do autor), que
audita cada task marcada contra o código real, roda a suíte de testes de verdade, confere a seam de
teste e a aderência ao "Out of Scope" da própria spec, e produz um veredito binário (aprovada ou
bloqueada) em relatório versionado. Sem veredito aprovado, não existe PR. Uma revisão de padrão de
código e aderência à spec roda em seguida (dois eixos: Standards e Spec), e todo achado bloqueante é
corrigido na mesma branch antes de abrir o PR — nunca depois.
Rationale: quem implementou uma funcionalidade já "sabe" que está certo, e esse saber tende a fazer
a própria revisão relaxar; separar a verificação numa sessão sem esse contexto prévio é o único jeito
real de pegar o que a sessão de implementação não vê em si mesma.

## Stack Tecnológico e Contratos

Backend: Python 3.13, gerenciado por `uv`; FastAPI; SQLAlchemy 2.x + Alembic para persistência;
PostgreSQL como banco; `pytest` para testes. Frontend (fase futura, ainda não iniciada nesta
constituição): React + Vite, TypeScript, `pnpm`. Camada de IA (fase futura, fora do MVP atual):
LangChain + Langfuse, sempre subordinada ao Princípio I.

Toda rota HTTP declara contrato Pydantic de entrada e saída — sem dicionários soltos ou `dict`
genérico cruzando a fronteira HTTP. Decisões arquiteturais formais (escolha de stack, frameworks,
ferramentas) vivem em `docs/adr/` como ADRs numerados (ADR-0001, ADR-0002, ...); qualquer proposta
que contradiga uma ADR existente deve sinalizar isso explicitamente ("Contradiz ADR-000N, mas vale
reabrir porque...") em vez de silenciosamente divergir.

## Fluxo de Desenvolvimento (SDD)

O processo de Spec-Driven Development deste projeto já existia antes da adoção do Spec Kit
(`specify-cli`) e continua sendo operado pelos comandos próprios do repositório: `/spec-write`
(escreve a spec + issue-ponteiro), `/spec-start` (implementa test-first, task por task),
`/fechar-spec` (aciona a verificação independente descrita no Princípio V), e `/code-review`
(auditoria de padrão de código e aderência à spec, dois sub-agentes em paralelo). O Spec Kit é
adotado como camada complementar de harness — convive com esse fluxo, não o substitui; comandos
`speckit.*` não reescrevem nem contornam `/spec-write`, `/spec-start` ou `/fechar-spec`.

Antes de cada task de implementação, consulta-se `dev-router` (`.claude/skills/dev-router/SKILL.md`)
para verificar se a fase de trabalho bate com uma skill especializada já instalada (design de
módulo, TDD, debug, revisão de segurança antes de `/fechar-spec` numa spec sensível). Necessidade
nova descoberta durante o desenvolvimento, fora do escopo já aprovado da spec ativa, vira nota na
seção "Descobertas" do arquivo da spec — nunca implementação por conta própria da sessão.

Commits seguem Conventional Commits (`tipo(escopo): mensagem`) com escopo obrigatório: o código da
spec em minúsculo (`s1`, `s2`, ...) quando a mudança implementa ou testa uma spec, ou um nome de
área curto (`adr`, `harness`, `commands`, `agents`) quando não há spec associada. Nunca commitar
secrets, credenciais, ou dados reais de paciente/clínica fora do que já está na planilha de
referência.

## Governance

Esta constituição é uma camada complementar ao `CLAUDE.md` do repositório, que permanece a fonte de
verdade operacional do dia a dia deste projeto — em caso de conflito de leitura entre os dois, o
`CLAUDE.md` prevalece para decisões de processo já em vigor, e esta constituição é atualizada para
refletir a mudança real, não o contrário. Emendas a esta constituição exigem: (1) descrever a
mudança e sua motivação, (2) incrementar a versão segundo semver (MAJOR para remoção/redefinição
incompatível de princípio, MINOR para princípio novo ou expansão material, PATCH para redação/
clarificação), (3) atualizar a data de última emenda, e (4) quando a mudança afetar o fluxo real de
trabalho, refletir a mudança de volta no `CLAUDE.md`. Toda spec e todo `/code-review` devem ser
compatíveis com os princípios aqui declarados; uma violação encontrada é tratada como achado
bloqueante do eixo Standards, não como nota informativa.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): data exata de adoção do processo SDD
anterior ao Spec Kit não está registrada no histórico consultado | **Last Amended**: 2026-09-24
