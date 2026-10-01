# Verificação — S13

**Veredito**: ✅ APROVADA
**Data**: 2026-10-01. Esta é a 4ª rodada. A 1ª (2026-09-30) e a 3ª (2026-10-01) bloquearam, e a 2ª
travou sem veredito.
**Testes**: `pnpm test` em `apps/web` (vitest run): 24 arquivos, **164 passed, 0 failed**.

Também rodei:

- **Cobertura**: `pnpm exec vitest run --coverage --maxWorkers=2`, restrita a `src/exames/**` e
  `src/api/useColecaoCrud.ts`. Resultado: 164 passed, 0 failed.

  | Métrica | Cobertura |
  |---|---|
  | Statements | 99,44% (180/181) |
  | Branches | 95,14% (98/103) |
  | Functions | 98,85% (86/87) |
  | Lines | 99,39% (163/164) |

  Ficaram sem cobertura `TelaExames.tsx:329` e os ramos não-`ErroHttp` de `useColecaoCrud.ts`
  (linhas 25-44 e 59).
- **Lint**: `pnpm lint` (oxlint) deu 0 erros e 4 warnings, os mesmos da rodada anterior. O único
  em código da S13 é `useColecaoCrud.ts:34` (`set-state-in-effect`), o mesmo padrão de
  `useClinicas.ts`/`useVeterinarios.ts`.
- **Build**: `pnpm build` (`tsc -b && vite build`) terminou limpo.

Spec: `specs/013-exames-precificacao-web/{spec.md,plan.md,tasks.md}`, localizada via
`docs/specs.md` (linha S13). Recebi só o código `S13`, sem nenhuma instrução adicional do autor.

## Tasks

`tasks.md` tem 48 tasks, todas `[X]`. A branch tem um commit `s13` para cada task ou para um grupo
declarado (`T013-T014`, `T037-T040`). A Phase 8 (T041-T048) tem um commit por task, com o teste
falho antes da implementação.

- **T038**, a única pendência da rodada anterior (pendência 6), agora está confirmada:
  - O commit `dfbe3af` adiciona `@vitest/coverage-v8@5.0.2` como devDependency (mesma versão do
    vitest), o script `test:cobertura` e `coverage` no `.gitignore` de `apps/web`. O lockfile só
    ganhou o provider e suas dependências transitivas.
  - O provider está instalado em `node_modules/@vitest/coverage-v8`.
  - Rodei a cobertura de novo. Os números batem exatamente com os registrados na T038.
  - A T038 diz que a dependência entrou "com decisão do usuário". Isso corresponde à saída (a)
    proposta no relatório anterior.
- **T039** (quickstart na UI real) foi confirmada na rodada anterior e repetida nesta. Ver
  "Funcional de ponta a ponta".
- As tasks "já implementadas" (T017/T018, T033/T034, T036) estão confirmadas no código. As props
  `exame?`/`regra?` fazem o prefill, e `LinhaRegraPlantao` tem as ações por linha.
- Nenhuma task está marcada sem evidência.

Nota de processo, sem ação possível nesta branch: o Princípio IV pede cobertura visível antes do
commit de **cada** task. Até `dfbe3af` isso não era possível em `apps/web`. A T038 é o gate formal
de cobertura da spec e agora está satisfeita. A mesma lacuna histórica existe na S12.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| US1 | Listar e cadastrar exames: leitura para admin, atendente e técnico, escrita só admin, filtros por categoria e "apenas ativos" | Atendida | `TelaExames.tsx::CatalogoDeExames`, `FormularioExame.tsx`, `useExames.ts`, `examesApi.ts`. Tasks T004-T012, T041/T042, T045-T048. Exercitada agora na UI real. |
| US2 | Editar, inativar e reativar exame (só admin) | Atendida | `LinhaExame` (só aparece quando `podeGerenciar = papel === 'admin'`), `useExames.editar/inativar/reativar` via `executarAcaoSobreItem`. Tasks T013-T020. Exercitada agora na UI real. |
| US3 | Listar e cadastrar regras de plantão: leitura admin e atendente, escrita só admin, aceita cruzar a meia-noite, filtro "apenas ativas" | Atendida | `TelaExames.tsx::RegrasDePlantao` com abas condicionadas a `podeVerRegrasPlantao`, `FormularioRegraPlantao.tsx`, `useRegrasPlantao.ts`, `regrasPlantaoApi.ts`. Tasks T021-T028, T043/T044. Exercitada agora na UI real. |
| US4 | Editar, inativar e reativar regra de plantão (só admin) | Atendida | `LinhaRegraPlantao`, `useRegrasPlantao.editar/inativar/reativar`. Tasks T029-T036. Exercitada agora na UI real. |

Cruzei cada Functional Requirement com os controles contados na tela renderizada, não só com o hook:

- **FR-001**: atendido. `itensDeNavegacao.ts` tem `implementado: true`, `rotas.tsx` mapeia
  `/exames` para `<TelaExames />`, e o placeholder não aparece na tela real.
- **FR-002**: atendido. A tela mostra colunas Categoria, Nome, Preço-base e Status, mais o select
  "Filtrar por categoria" e o checkbox "Apenas ativos", e os dois funcionam na UI real.
- **FR-003, FR-004 e FR-005**: atendidos. O admin cadastra, edita, inativa e reativa. Preço-base
  `-3` é bloqueado com mensagem.
- **FR-006**: atendido. A tela mostra dia, horário, valor e status, e o checkbox "Apenas ativas"
  filtra.
- **FR-007, FR-008 e FR-009**: atendidos. A regra Quinta-feira 23:15–02:45 foi aceita. Valor `0`
  é bloqueado com mensagem.
- **FR-010**: atendido. Com papel `clinica`, o menu não tem Exames e `/exames` mostra "Acesso
  negado". O técnico não vê a aba de regras.
- **FR-011**: atendido. Atendente e técnico não veem "Novo exame", "Nova regra" nem a coluna
  Ações. Os controles são ocultados, não desabilitados.
- **FR-012**: atendido. O 404 tem mensagem específica nos hooks, e valor não positivo tem mensagem
  específica no formulário.

## Seam de teste

A seam do `plan.md` são os hooks `useExames`/`useRegrasPlantao`, construídos sobre
`useColecaoCrud` e testados com a API mockada. Os testes cobrem:

- carregamento inicial;
- criação;
- edição, inativação e reativação com substituição por `id`;
- 404 com mensagem específica;
- fallback com `extrairDetalheErro`;
- nova listagem ao mudar o filtro.

A tela é testada por cima disso em `TelaExames.test.tsx`: controles por papel, abas, filtros e
estado vazio. Os formulários são testados com `0` e com valor negativo, checando a mensagem em
`role="alert"`.

A cobertura agora está visível e quase total no recorte da S13. Os ramos não cobertos são o erro
não-`ErroHttp` em `useColecaoCrud`, que não é cenário da spec, e o clique de volta para a aba
Catálogo. A seam está adequada.

## Out of Scope

Não há scope creep:

- Nenhuma alteração em `apps/api`. O achado de `schemas.py` sem `gt=0` ficou só registrado em
  "Descobertas".
- Nenhuma exclusão definitiva, busca textual ou paginação.
- `calcular_adicional_plantao` não é usado.
- `useClinicas.ts`/`useVeterinarios.ts` não foram tocados.
- `package.json` e o lockfile de `apps/web` agora estão no diff só com o provider de cobertura
  (devDependency). É ferramenta de teste, sem efeito em runtime. Foi aprovada pelo usuário
  conforme registrado na T038 e fecha a pendência 6.

## ADRs

A entrega segue ADR-0001/0002:

- React + Vite + TypeScript e `pnpm`.
- Tipos gerados do OpenAPI (`tipos.gerados.ts`).
- Cliente HTTP interno.

O ADR-0002 não fixa ferramenta de teste para o frontend. `@vitest/coverage-v8` é o provider
oficial do vitest, que já estava em uso, então não é desvio de stack. Identificadores e rótulos
estão em português.

## Descobertas

`spec.md` → "Descobertas" registra que o backend da S5 não valida `preco_base`/`valor_adicional`
positivos nem `categoria`/`nome` vazios. Nada foi implementado no backend sem decisão do PO, o que
está correto. O item continua aberto para decisão do usuário, numa spec ou task separada.

## Funcional de ponta a ponta

Ambiente desta rodada:

- Postgres `vertere_postgres_dev` (porta 5434), que já estava rodando.
- `uvicorn` em `:8000` e `vite dev` em `:5173`, os dois iniciados e encerrados nesta sessão.
- Chrome real, via extensão Claude in Chrome.
- Sessões dos 4 usuários de teste do banco de dev: token obtido com `POST /auth/login` e
  `GET /auth/me` contra o backend local, depois injetado em `sessionStorage['vertere:sessao']`. O
  formulário de login não foi percorrido, porque já é coberto pela S11.

Resultado por cenário de `quickstart.md`:

1. **Cenário 1 (admin)**:
   - Com preço-base `-3`, aparece "Preço-base deve ser maior que zero." e nenhum `POST` é enviado.
   - Com `72.30`, sai `POST /exames` e o exame "VerifS13d / Exame verif 4a" aparece na lista sem
     recarregar. A categoria nova entra no select.
2. **Cenário 2**:
   - A edição inline para `74.90` gera `PATCH` 200, e a linha é atualizada.
   - Inativar mostra "Inativo", e o exame continua listado. Reativar volta para "Ativo". Os
     `POST .../inativar` e `.../reativar` retornaram 200 no log.
   - Filtros:
     - "Apenas ativos" deixou 4 exames ativos na lista.
     - O select de categoria em Hematologia mostrou só "Hemograma completo".
     - A troca direta para Bioquímica mostrou só "Glicose QS13".
3. **Cenário 3**:
   - Com valor `0`, aparece "Valor adicional deve ser maior que zero.".
   - Quinta-feira 23:15–02:45 com `33.40` foi aceita e aparece sem recarregar. O índice 3
     corresponde a Quinta-feira.
   - O atendente vê a aba com as 6 regras, sem "Nova regra" e sem a coluna Ações.
   - O técnico só vê a aba "Catálogo de Exames", com a lista e sem controles de escrita.
4. **Cenário 4**:
   - Editar para `36.70` reflete na linha.
   - Inativar mostra "Inativa", e reativar volta para "Ativa".
   - "Apenas ativas" mostra só as 3 regras ativas.
5. **Cenário 5**, com a tela já carregada como admin:
   - Invalidei o token no `sessionStorage` e cliquei em "Inativar".
   - O `POST .../inativar` voltou 401, e a tela foi para `/login` com "Sua sessão expirou. Faça
     login novamente.".
   - O mesmo comportamento ocorreu com o token inválido já no carregamento: o `GET /exames` voltou
     401 e a tela foi para `/login`.
6. **Papéis não autorizados**: com `clinica`, o menu mostra só Pacientes, Atendimentos e Laudos, e
   `/exames` por URL mostra "Acesso negado. Você não tem permissão para ver esta seção.".

O estado vazio não foi reproduzido no navegador, porque nenhuma combinação de filtro gera lista
vazia com os dados atuais. Ele está confirmado no código (`CatalogoDeExames`/`RegrasDePlantao`) e
nos testes da T045.

**Efeitos colaterais no banco de dev**: o exame "VerifS13d / Exame verif 4a" (74.90) e a regra
Quinta-feira 23:15–02:45 (36.70) foram criados nesta rodada e deixados **inativos** via API no
final. Os servidores foram encerrados, e o container do Postgres continua rodando. O exame
"Teste / Exame Negativo" (`-10.00`, ativo), criado em sessão anterior, continua no banco de dev.
Vale inativá-lo, mas não é defeito da S13.

## Pendências (se bloqueada)

Nenhuma. As pendências 1-5 da 1ª rodada e a 6 da 3ª foram confirmadas como resolvidas agora.

Observações que não bloqueiam, para o `/code-review` decidir (já registradas antes e ainda
presentes):

- A linha de edição usa `colSpan={4}` numa tabela de 5 colunas quando `podeGerenciar`.
- Os formulários não têm botão "Cancelar".
- `aoSalvar` fecha o formulário antes da resposta da API. Em erro, o usuário perde o que digitou.
- Valores aparecem sem formatação BRL.
- `categoria`/`nome` só com espaços passam pelo `required`.
- O estado local não reaplica o filtro ativo depois de criar ou inativar um item.
- `CatalogoDeExames` chama `setCategoriasConhecidas` durante o render. Com "Apenas ativos"
  marcado, o select de categoria passa a listar só as categorias que têm algum exame ativo.
- `useColecaoCrud` engole erros que não são `ErroHttp` (por exemplo, erro de rede) sem mostrar
  mensagem.
