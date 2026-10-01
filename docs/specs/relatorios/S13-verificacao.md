# Verificação — S13

**Veredito**: ❌ BLOQUEADA
**Data**: 2026-09-30
**Testes**: `pnpm test` em `apps/web` (vitest run) — 24 arquivos, **154 passed, 0 failed**.
Também rodados: `pnpm lint` (oxlint, 0 erros, 4 warnings; o novo, `useColecaoCrud.ts:34`
`set-state-in-effect`, é o mesmo padrão já presente em `useClinicas.ts`/`useVeterinarios.ts`) e
`pnpm build` (`tsc -b && vite build`, limpo).

Spec: `specs/013-exames-precificacao-web/{spec.md,plan.md,tasks.md}` (via `docs/specs.md`, linha S13).
Nenhuma instrução adicional do autor foi passada nesta invocação (só o código `S13`).

## Tasks

- 40 tasks em `tasks.md`, todas `[X]`. Há commit `s13` para cada uma (ou grupo declarado, ex.
  `T013-T014`, `T037-T040`) em `git log main..HEAD`, e o código correspondente existe em
  `apps/web/src/exames/`, `apps/web/src/api/useColecaoCrud.ts`, `rotas.tsx`, `itensDeNavegacao.ts`.
- T017/T018, T033/T034 e T036 estão marcadas `[X]` com a observação "já implementado em T009/T026/
  T028, nenhum código novo". Confirmado no código (`exame?`/`regra?` com prefill e testes de modo
  edição em `FormularioExame.test.tsx`/`FormularioRegraPlantao.test.tsx`; ações por linha em
  `LinhaRegraPlantao`).
- **T039 marcada `[X]` sem estar concluída.** O próprio texto da task diz "**parcial**" e "**Não
  executado**: percurso clique-a-clique pela UI real". A task pedia a execução manual dos 6
  cenários do `quickstart.md`. Marcar como feita uma task que o autor declara não ter feito é o
  checklist dizendo o contrário do que aconteceu.
- **T008 só parcialmente coberta.** O texto da task exige que o bloqueio de preço-base zero ou
  negativo venha "com mensagem de erro visível". O teste (`FormularioExame.test.tsx`, "bloqueia
  submissão com preço-base zero ou negativo") só confere que `aoSalvar` não é chamado. Não confere
  mensagem nenhuma e não testa valor negativo, só `0`. A implementação depende só da validação
  nativa do navegador (`min="0.01"`). O mesmo vale para T025 (`valor_adicional`).

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| US1 | Listar e cadastrar exames (leitura para 3 papéis, escrita só admin) | **Parcialmente atendida** | `TelaExames.tsx::CatalogoDeExames`, `FormularioExame.tsx`, `useExames.ts`, `examesApi.ts`; T004–T012; testes em `TelaExames.test.tsx` (linhas 83–117). **Falta**: FR-002 pede "opção de filtrar por categoria e para mostrar apenas os ativos". A tela não tem nenhum controle de filtro. `useExames` expõe `definirCategoria`/`definirApenasAtivos`, mas `CatalogoDeExames` não usa nenhum dos dois. Falta também o estado vazio pedido nos Edge Cases (ver Pendências). |
| US2 | Editar, inativar, reativar exame (só admin) | Atendida | `LinhaExame` (ações gated por `podeGerenciar = papel === 'admin'`), `useExames.editar/inativar/reativar` sobre `executarAcaoSobreItem`, `examesApi.editarExame/inativarExame/reativarExame`; T013–T020; testes em `TelaExames.test.tsx` (121–171) e `useExames.test.ts` (23–88). Fluxo backend confirmado por HTTP real (ver abaixo). |
| US3 | Listar e cadastrar regras de plantão (leitura admin/atendente, escrita só admin, aceita cruzar meia-noite) | **Parcialmente atendida** | `TelaExames.tsx::RegrasDePlantao` + abas (`podeVerRegrasPlantao`), `FormularioRegraPlantao.tsx`, `useRegrasPlantao.ts`, `regrasPlantaoApi.ts`; T021–T028. **Falta**: FR-006 pede "opção de filtrar para mostrar apenas as ativas". A sub-seção não tem esse controle; `definirApenasAtivos` existe no hook, mas a tela não o usa. |
| US4 | Editar, inativar, reativar regra de plantão (só admin) | Atendida | `LinhaRegraPlantao`, `useRegrasPlantao.editar/inativar/reativar`, `regrasPlantaoApi.*`; T029–T036; testes em `TelaExames.test.tsx` (227–288) e `useRegrasPlantao.test.ts` (24–92). |

Cruzamento com os Functional Requirements:

- **FR-001**: atendido (`itensDeNavegacao.ts` `implementado: true`, `rotas.tsx` → `TelaExames`).
- **FR-002**: **não atendido na UI** (faltam o filtro de categoria e o de "apenas ativos").
- **FR-003, FR-004, FR-005**: atendidos.
- **FR-006**: **não atendido na UI** (falta o filtro "apenas ativas").
- **FR-007, FR-008, FR-009**: atendidos. O mapeamento de dia da semana `0 = Segunda` bate com
  `datetime.weekday()` usado em `apps/api/.../exames/service.py:23`.
- **FR-010**: atendido. O nível de rota é feito por `RotaProtegida`/`itensDeNavegacao`. A aba de
  regras fica oculta para `tecnico`, e o backend devolve 403, confirmado por HTTP real.
- **FR-011**: atendido (controles ocultos, não só desabilitados).
- **FR-012**: atendido para 404 (mensagens específicas em `useExames`/`useRegrasPlantao`). Há uma
  observação, que não bloqueia por si: um 422 de lista de validação do FastAPI cai em
  `extrairDetalheErro`, que devolve o corpo JSON bruto (`detail` não é string) e expõe detalhe
  técnico. Hoje isso fica mascarado pela validação nativa do formulário.

## Seam de teste

A seam declarada no plan (Princípio IV) são os hooks `useExames`/`useRegrasPlantao` sobre
`useColecaoCrud`, testados com a API mockada. Ela existe e cobre carregamento, criação, edição,
inativação, reativação, o 404 específico, o fallback de erro e a re-listagem ao mudar o filtro.
`useColecaoCrud.test.ts` cobre o esqueleto compartilhado (7 casos). Componentes de tela e formulários
são testados por cima, com Testing Library.

O ponto fraco é justamente o que faltou na UI: os testes de filtro existem só no hook
(`useExames.test.ts:138,153`, `useRegrasPlantao.test.ts:145`). Nenhum teste de `TelaExames` exercita
filtro nem estado vazio. Com isso a suíte fica verde mesmo sem os controles exigidos por FR-002 e
FR-006. É a mesma lacuna que o `/code-review` pegou na S12 (filtro implementado só na camada de
API/hook, nunca ligado à tela).

## Out of Scope

Não encontrei scope creep:
- Nenhuma mudança em `apps/api`. O achado de `schemas.py` sem `gt=0` ficou só registrado.
- Nenhuma exclusão definitiva, nenhuma busca textual, nenhuma paginação.
- Nenhum uso de `calcular_adicional_plantao`.
- `useClinicas.ts`/`useVeterinarios.ts` não foram tocados, conforme T003. O
  `useColecaoCrud.ts` extraído está previsto no tasks.md (Phase 2, research.md Decisão 3).

## ADRs

O stack está aderente a ADR-0001/0002: React + Vite + TypeScript, `pnpm`, vitest/Testing Library,
cliente HTTP interno e tipos gerados do OpenAPI (`tipos.gerados.ts`). Nenhuma dependência nova
(`package.json` fora do diff). Identificadores e rótulos estão em português.

## Descobertas

`spec.md` → "Descobertas" registra que o backend S5 não valida `preco_base`/`valor_adicional`
positivos nem `categoria`/`nome` vazios. Confirmei que nada foi implementado no backend sem decisão
do PO, o que está correto. O item continua aberto para decisão do usuário. Reconfirmado nesta
verificação: o backend aceita e persiste qualquer valor decimal. A única defesa é o
`min="0.01"`/`required` do HTML, e o `required` também aceita string só com espaços.

## Funcional de ponta a ponta

Subi o ambiente agora. O Docker Desktop foi iniciado e o container `vertere_postgres_dev` estava
`Exited` e foi religado. Migrations em `head` (`d4a8f137c9b2`). Rodei `uvicorn` em `:8000` e
`pnpm dev` em `:5173`.

Exercitado via HTTP real, com os usuários de teste admin/atendente/tecnico já existentes no banco
de dev:
- **Exames**: `POST /exames` (admin) → 201, depois `PATCH` (preço 42.50 → 55.00), `inativar`
  (`ativo:false`) e `reativar` (`ativo:true`), todos OK. Filtro `?apenas_ativos=true&categoria=...`
  respondeu corretamente (lista vazia com o exame inativo). `inativar` de id inexistente → 404.
- **Regras de plantão**: `POST /regras-plantao` com sexta 18:00–06:00 → 201 (cruzar a meia-noite
  é aceito). `PATCH` (50 → 60) e `inativar` OK.
- **Permissões**: `tecnico` `GET /exames` → 200, `tecnico` `GET /regras-plantao` → 403,
  `atendente` `GET /regras-plantao` → 200, `atendente` `POST /exames` → 403.
- **Frontend**: a Vite serve `/exames` (200) e transforma `src/exames/TelaExames.tsx` sem erro
  (200). CORS de `:5173` para `:8000` está OK (preflight 200).

**Limitação declarada**: não foi possível percorrer a UI renderizada no navegador. A extensão
Claude in Chrome não está conectada neste ambiente. Os cenários do `quickstart.md` foram
confirmados só no nível de API e de componente (jsdom). A ausência dos controles de filtro e do
estado vazio foi constatada por leitura direta de `TelaExames.tsx` e independe do navegador.

Efeito colateral no banco de dev: criei o exame "VerifS13 / Exame verificacao" e uma regra de
plantão de sexta 18:00–06:00, e deixei os dois **inativos** ao final. Servidores encerrados. O
Docker Desktop e o container Postgres continuam rodando.

## Pendências (se bloqueada)

1. **FR-002: filtros do catálogo de exames ausentes na tela.**
   - Onde: `apps/web/src/exames/TelaExames.tsx` → `CatalogoDeExames`.
   - O que fazer: adicionar um controle de categoria (campo ou select) ligado a
     `useExames().definirCategoria` e um checkbox "Apenas ativos" ligado a `definirApenasAtivos`.
     Cobrir em `TelaExames.test.tsx`: alterar o controle chama o setter do hook.
2. **FR-006: filtro "apenas ativas" das regras de plantão ausente na tela.**
   - Onde: `TelaExames.tsx` → `RegrasDePlantao`.
   - O que fazer: checkbox "Apenas ativas" ligado a `useRegrasPlantao().definirApenasAtivos`, com
     teste em `TelaExames.test.tsx`.
3. **Edge Case "estado vazio" não implementado.** A spec pede que a lista mostre "um estado vazio
   claro, distinto de erro de carregamento". Hoje, com `exames`/`regras` vazios, a tela renderiza
   uma tabela só com o cabeçalho.
   - Onde: `CatalogoDeExames` e `RegrasDePlantao`.
   - O que fazer: mensagem do tipo "Nenhum exame encontrado"/"Nenhuma regra de plantão
     encontrada" quando `!carregando && !erro && lista.length === 0`, com teste.
4. **T008/T025: "mensagem de erro visível" na validação de valor não positivo sem cobertura.**
   - Onde: `FormularioExame.tsx`/`FormularioRegraPlantao.tsx` e os testes correspondentes.
   - O que fazer: escolher uma das duas saídas e registrar a escolha em `tasks.md`.
     - (a) Adicionar validação explícita no `aoSubmeter` (`Number(valor) <= 0` → mensagem em
       `role="alert"`) e testar que a mensagem aparece, com `0` e com valor negativo.
     - (b) Declarar que a mensagem nativa do navegador é o comportamento aceito.
   - Como o próprio tasks.md diz que esta é "a única camada que rejeita preço não positivo", a
     cobertura precisa ser real. Testar valor negativo também.
5. **T039 marcada `[X]` sem estar concluída.**
   - O que fazer: desmarcar até os cenários 1–6 do `quickstart.md` serem executados na UI real,
     ou ajustar a redação da task para o que foi de fato feito, com decisão explícita do usuário de
     aceitar a validação só por API. O checklist não pode afirmar conclusão que o próprio texto da
     task nega.

Observações que não bloqueiam (registradas para o `/code-review`):
- A linha de edição usa `colSpan={4}` numa tabela de 5 colunas quando `podeGerenciar`.
- Os formulários de criar e editar não têm "Cancelar". Uma vez aberto, o formulário só fecha
  salvando.
- `aoSalvar` fecha o formulário antes do resultado da API. Em erro, o usuário perde o que digitou.
- Valores monetários aparecem crus (`55.00`), sem formatação BRL.
- Para o 422 em FR-012, ver "Cruzamento com os Functional Requirements" acima.
