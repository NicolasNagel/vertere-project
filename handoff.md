# Handoff — Vertere Lab

> Arquivo de continuidade entre sessões (múltiplos agentes de IA já trabalharam neste repo —
> Claude Code e Codex CLI, no mínimo). Antes de assumir que o contexto de uma sessão anterior
> ainda é válido, rode `git status`, `git branch -a` e `git log --oneline -10` no branch atual:
> o estado real do repositório é sempre a fonte de verdade, não a memória de uma sessão passada.
> Atualize este arquivo ao final de cada sessão relevante (mudança de escopo, spec fechada,
> decisão de harness) e no início de uma sessão nova que retome trabalho em andamento.

**Última atualização**: 2026-09-30, por sessão Claude Code (Opus 5.5).

## S13 — `/fechar-spec` rodou: ❌ BLOQUEADA; pendências 1-4 já corrigidas, falta só a 5 (T039)

Relatório: `docs/specs/relatorios/S13-verificacao.md`. Pendências copiadas para `spec.md` →
"Verificação" e viraram a Phase 8 de `tasks.md` (T041-T048, todas `[X]`, um commit cada):
filtros de categoria/"apenas ativos" ligados à tela (FR-002), "apenas ativas" nas regras (FR-006),
estado vazio distinto de erro, e validação explícita de valor > 0 com mensagem `role="alert"` nos
dois formulários (troca do `min="0.01"` nativo, que barrava o submit antes do handler). O filtro de
categoria é `<select>` porque o backend compara categoria por igualdade exata. Suíte: 164/164
verdes, lint sem achado novo, build limpo.

**Bloqueio restante — T039 desmarcada**: os 6 cenários de `quickstart.md` nunca foram percorridos
na UI real. A extensão Claude in Chrome seguia desconectada nesta sessão. Caminhos: (a) sessão com
navegador conectado executa o quickstart e marca T039; (b) o usuário decide explicitamente aceitar
a validação só por API e a redação de T039 é ajustada para isso. Depois, rodar `/fechar-spec S13`
de novo → `/code-review` → PR. **Não abrir PR antes.** Observações não bloqueantes do relatório
(colSpan 4/5 na linha de edição, sem "Cancelar" nos formulários, formulário fecha antes da
resposta da API, valores sem formatação BRL, 422 do FastAPI exibido cru) ficam para o
`/code-review` decidir.

Efeitos colaterais no banco de dev (`vertere_postgres_dev`, porta 5434, deixado rodando pelo
verificador): exame "VerifS13" e uma regra de sexta 18:00-06:00, ambos inativos.

### Contexto da implementação original da S13 (sessão anterior)


Issue-ponteiro [#29](https://github.com/NicolasNagel/vertere-project/issues/29) criada,
`docs/specs.md` mostra `S13 → em-desenvolvimento`. As 40 tasks de
`specs/013-exames-precificacao-web/tasks.md` estão marcadas `[X]`, um commit por task, convenção
`feat(s13): T0NN ...` / `test(s13): T0NN ...`.

**O que existe agora**: `apps/web/src/exames/` com `examesApi.ts`/`regrasPlantaoApi.ts` (wrappers
HTTP tipados), `useExames.ts`/`useRegrasPlantao.ts` (hooks de estado, construídos sobre o novo
`useColecaoCrud`), `TelaExames.tsx` (uma tela com abas "Catálogo de Exames"/"Regras de Plantão",
a segunda oculta para `tecnico`) e `FormularioExame.tsx`/`FormularioRegraPlantao.tsx`. Rota
`/exames` ligada de verdade (`itensDeNavegacao.ts` com `implementado: true`, `rotas.tsx` com o mapa
`componentePorRota`, mesmo mecanismo da S12 — reaproveitado, não recriado). Suíte: 154 testes
verdes (era 94 em S12), `pnpm build` (`tsc -b && vite build`) limpo, lint sem achado novo.

**Extração de `useColecaoCrud` (`apps/web/src/api/useColecaoCrud.ts`)**: o handoff da S12 já tinha
marcado o gatilho ("se uma S13 repetir o esqueleto de `useClinicas`/`useVeterinarios` para uma 3ª
entidade, é o momento de extrair um hook compartilhado — não antes disso"). Esta spec introduziu a
3ª e a 4ª entidade repetindo exatamente esse esqueleto (`recarregar`/`criar`/
`executarAcaoSobreItem` com try/catch/`ErroHttp`/`setErro`), então o hook foi extraído e adotado
por `useExames`/`useRegrasPlantao`. **Retrofit de `useClinicas.ts`/`useVeterinarios.ts` (S12) para
usar o hook novo foi deliberadamente NÃO feito** — mudar um módulo já `entregue`/verificado sem
necessidade nova documentada nesta spec seria escopo fora do combinado (guardrail do `CLAUDE.md`).
Se uma spec futura tocar esses dois arquivos por outro motivo, vale revisitar essa migração.

**Achado de backend não corrigido (fora de escopo desta spec, frontend puro)**: os schemas de S5
(`apps/api/src/vertere_api/exames/schemas.py` — `CriarExameRequest`, `EditarExameRequest`,
`CriarRegraPlantaoRequest`, `EditarRegraPlantaoRequest`) não têm nenhuma constraint Pydantic sobre
`preco_base`/`valor_adicional` (sem `gt=0`) nem sobre `categoria`/`nome` vazios — confirmado via
`curl` direto contra o backend real nesta sessão (`POST /exames` com `preco_base: -10` retornou
`201`, sem erro). A validação de preço/valor positivo nesta spec existe **só no frontend**
(`FormularioExame.tsx`/`FormularioRegraPlantao.tsx`, `type="number" min="0.01"`), sem segunda
camada de defesa no backend. Registrado em `spec.md` → "Descobertas" e em `tasks.md` (T039) — fica
para o usuário decidir se abre uma spec/task de correção do schema.

**Verificação manual do quickstart — parcial, gap conhecido para quem rodar `/fechar-spec`**: o
backend real foi validado via `curl` direto (login com 3 usuários de teste criados nesta sessão —
`teste.admin@vertere.com.br`, `teste.atendente@vertere.com.br`, `teste.tecnico@vertere.com.br`,
senha `Senha123!`, ainda no banco de dev), confirmando: preço negativo aceito (achado acima), regra
de plantão cruzando meia-noite aceita, `atendente` lê `/regras-plantao` mas `tecnico` não (403),
`atendente` não pode `POST /exames` (403), `tecnico` lê `/exames` normalmente. **O percurso
clique-a-clique pela UI real no navegador (os 6 Cenários de
`specs/013-exames-precificacao-web/quickstart.md`) não foi executado** — a extensão Claude in
Chrome não estava conectada nesta sessão. Se `/fechar-spec` (ou quem revisar) tiver navegador
disponível, vale repetir os cenários do quickstart na UI de verdade antes de considerar a
verificação completa; a validação por API já cobre a lógica, mas não a renderização/interação real
das abas e formulários.

**Backend/frontend de dev usados na validação**: container `vertere_postgres_dev` (Docker, porta
`5434`) já estava rodando; `uvicorn`/`vite` foram iniciados e finalizados dentro desta sessão —
nenhum processo de servidor ficou pendurado ao final.

## S12 (Clínicas + Veterinários no web) — mergeada em `main`

PR [#28](https://github.com/NicolasNagel/vertere-project/pull/28) squash-mergeado em `main`
(2026-09-29), issue-ponteiro [#27](https://github.com/NicolasNagel/vertere-project/issues/27)
fechada automaticamente. `docs/specs.md` mostra `S12 → entregue`. Branch remota
`spec/s12-clinicas-veterinarios-web` não foi deletada (`--delete-branch=false`, mesmo padrão de
S10/S11) — segura deletar quando quiser.

**Sequência real desta sessão, na ordem**: implementação (41 tasks) → `/fechar-spec` (veredito
✅ APROVADA, relatório em `docs/specs/relatorios/S12-verificacao.md`) → `/code-review` (achou 3
achados **bloqueantes** no eixo Spec que o `/fechar-spec` não pegou) → correção na mesma branch →
suíte verde de novo. **Achado de processo importante para quem operar `/fechar-spec` numa spec
futura**: o `verificador-de-spec` validou funcionalmente via API/quickstart (backend real,
Postgres real) mas não cruzou cada Functional Requirement da spec contra a UI renderizada — passou
por alto que `FormularioClinica`/`veterinariosApi` tinham busca por nome (FR-003/FR-009) e filtro
"apenas ativas/ativos" (parte de FR-002/FR-008) implementados só na camada de API, nunca ligados a
nenhum campo/checkbox na tela. O `/code-review` (eixo Spec, sub-agente com o diff completo) é que
pegou isso. Lição: **para telas com FR de listagem/filtro, o `/fechar-spec` devia abrir a tela e
contar os controles visíveis contra cada FR, não só validar as chamadas HTTP.** Vale revisitar o
prompt do `verificador-de-spec` (`.claude/agents/verificador-de-spec.md`) se isso se repetir — e a
nota acima sobre S13 (quickstart não executado na UI) é o mesmo tipo de lacuna.

**Nota de harness**: `subagent_type: verificador-de-spec` não está registrado neste ambiente (só
`claude`, `claude-code-guide`, `Explore`, `general-purpose`, `Plan`, `statusline-setup` disponíveis
via Agent tool, apesar do arquivo `.claude/agents/verificador-de-spec.md` existir versionado). Esta
sessão contornou isso invocando `general-purpose` com o conteúdo do arquivo colado verbatim como
instrução (preserva a independência — zero contexto da sessão implementadora). Mesma situação para
as duas sub-agentes do `/code-review`. Se isso persistir, vale investigar por que o registro do
agente de projeto não está chegando ao harness.

**O que existe (S12)**: `apps/web/src/clinicas/` e `apps/web/src/veterinarios/` — cada um com
`*Api.ts` (wrapper HTTP tipado), `use*.ts` (hook de estado, a seam de teste principal, agora com
`termoBusca`/`definirTermoBusca` e `apenasAtivas`/`apenasAtivos`+setters), `Tela*.tsx` (lista +
busca + filtro de status + ações por linha) e `Formulario*.tsx` (criar/editar, com mensagem de
orientação quando não há clínica ativa para o formulário de veterinário). Rotas `/clinicas` e
`/veterinarios` ligadas de verdade (`itensDeNavegacao.ts` com `implementado: true`, `rotas.tsx` com
o mapa `componentePorRota`).

**Duas decisões de nomenclatura/design que toda spec nova de tela precisa saber**:
1. Hooks de domínio usam prefixo `use` (`useClinicas`, `useVeterinarios`, `useExames`,
   `useRegrasPlantao`), não `usar` — `oxlint` (`react-hooks/rules-of-hooks`) rejeita hook sem
   prefixo `use` em inglês.
2. `rotas.tsx` tem `componentePorRota: Partial<Record<string, ReactNode>>` (Foundational da S12) —
   toda seção nova (S14+: Pacientes, Atendimentos, ...) só precisa adicionar sua entrada nesse mapa
   + marcar `implementado: true` no item de `itensDeNavegacao.ts` correspondente. Não recriar esse
   mecanismo.

**Duplicação `useClinicas.ts`/`useVeterinarios.ts` — decisão tomada na S13**: ver seção S13 acima
(`useColecaoCrud` extraído, retrofit de S12 deliberadamente não feito).

## Próximo passo real

Resolver a T039 da S13 (ver seção S13 acima), rodar `/fechar-spec S13` de novo, depois
`/code-review`, depois o PR.

A próxima spec depois de S13 (Pacientes? Atendimentos? Laudos?) é decisão do usuário, não presumir
(mesma regra aplicada antes de S12/S13). Ponto de entrada: `/speckit-specify`, numeração `014`
(confirmar contra `docs/specs.md` antes).

## `main` está com tudo mergeado até S12; S13 ainda não tem PR

PRs #23 (harness), #26 (S11), #25 (S10) e #28 (S12) todos squash-mergeados em `main`, nesta ordem.
Issues #20, #22, #24, #27 fecharam automaticamente. `docs/specs.md` reflete S1–S12 `entregue`, S13
`em-desenvolvimento` na branch `spec/s13-exames-precificacao-web` (não mergeada ainda).

Branches remotas `chore/spec-kit-harness`, `spec/s10-importacao-dados-historicos`,
`spec/s11-frontend-web` e `spec/s12-clinicas-veterinarios-web` continuam não deletadas (mesmo
padrão de merge, `--delete-branch=false`) — seguro deletar quando quiser, ninguém mais devia
precisar delas.

## Spec Kit — em vigor, terceira spec real (S13) confirmou o processo de novo

`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` seguiu sem
surpresas de harness nesta spec. Único ajuste manual necessário: `/speckit-specify` não cria a
issue-ponteiro nem atualiza `docs/specs.md` automaticamente (nunca criou, isso é esperado — ver
`CLAUDE.md` passo 2 do fluxo) — feito manualmente no início do `/speckit-implement` desta sessão,
junto com a criação da branch `spec/s13-*` (que também não é automática sem
`.specify/extensions.yml` configurado com hook `before_specify`/`before_implement` — este repo não
tem esse arquivo). Cada task = 1 commit, convenção `feat(s13): T0NN ...` / `test(s13): T0NN ...`.
Detalhes do fluxo: `CLAUDE.md` → "Fluxo de trabalho (SDD)".

## Convenções que uma sessão nova precisa saber antes de mexer em qualquer spec

Ver `CLAUDE.md` na raiz do repo — é a fonte de verdade operacional, não este arquivo. Este handoff
é só o estado transitório entre sessões; `CLAUDE.md` é o que não muda a cada handoff.
