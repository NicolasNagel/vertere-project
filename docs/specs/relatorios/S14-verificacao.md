# Verificação — S14

**Veredito**: ✅ APROVADA
**Data**: 2026-10-19 (reverificação final após as correções de concorrência em `useColecaoCrud` e de estabilidade da cobertura)
**Testes**:
- Frontend, suíte padrão: `pnpm --dir apps/web test` → **285 passed (285)**, 27 arquivos, 0 falhas.
- Frontend, cobertura: `pnpm --dir apps/web test:cobertura` → **285 passed (285)**, 27 arquivos, 0 falhas; 98,03% de linhas (498/508). Em seguida, bateria de **10/10 execuções** do mesmo comando: todas com 285/285, sem timeout de teste ou worker (15,1–15,9 s cada).
- Backend, seams unitárias seguras do módulo `exames`: `uv run pytest tests/test_exames_exame_service.py tests/test_exames_regra_plantao_service.py` → **38 passed**.
- Qualidade frontend: `pnpm --dir apps/web build` → sucesso; `pnpm --dir apps/web lint` → exit 0, com 2 warnings (um preexistente em `SessaoContext.tsx` e um em `useColecaoCrud.ts` por `setState` disparado pelo efeito de carga).
- **Não rodei `uv run pytest` no `apps/api` inteiro**: confirmado nesta própria verificação que a suíte de router aponta para o banco de dev (`DATABASE_URL` do `.env`, `localhost:5434/vertere`) e apaga `usuarios`/`exames`/`regras_plantao` a cada execução (reproduzi o efeito colateral rodando só os três arquivos do módulo `exames` — zerou as três tabelas de novo). Já registrado em "Descobertas" da spec como achado de harness fora de escopo; rodar a suíte completa teria o mesmo efeito sem agregar sinal novo sobre a S14.

## Tasks

57/57 marcadas `[X]` em `tasks.md`. Conferidas contra `git log origin/main..HEAD`: 72 commits no total; todos os IDs T001–T057 aparecem no histórico. Nenhuma task marcada sem commit correspondente. Os 7 commits posteriores à primeira verificação corrigem recargas concorrentes em `useColecaoCrud` e acrescentam três testes específicos; o único outro delta em `tasks.md` é whitespace. Checklist auditável e consistente com o código.

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| US1 | Formulário não perde o que foi digitado, tem Cancelar | **Atendida** | `apps/web/src/ui/useEnvioFormulario.ts` (só fecha em sucesso, bloqueia reenvio via `useRef`, guarda `erroEnvio`); os 4 formulários (`FormularioClinica.tsx`, `FormularioVeterinario.tsx`, `exames/FormularioExame.tsx`, `exames/FormularioRegraPlantao.tsx`) usam o hook e têm botão "Cancelar" com `disabled={salvando}`. Confirmado também ao vivo (ver "Funcional de ponta a ponta"). Tasks T014–T031. |
| US2 | Erros sempre visíveis e compreensíveis | **Atendida** | `apps/web/src/api/erroApi.ts::mensagemDeErroPadrao` traduz 422 (com rótulo de campo), 5xx e corpo não-JSON; `useClinicas`/`useVeterinarios` migrados para `useColecaoCrud`, que converte `TypeError` de rede em mensagem (antes virava lista vazia silenciosa). Confirmado ao vivo com `curl`: 422 de e-mail inválido em Clínicas devolve estrutura Pydantic crua do servidor, que o front traduziria para "Verifique o campo E-mail: valor inválido." (mapeamento `type: value_error` → caso default "valor inválido" em `motivoDeValidacao`, coberto por `erroApi.test.ts`). Tasks T032–T037. |
| US3 | Servidor rejeita preço/dados inválidos de exames | **Atendida** | `apps/api/.../exames/service.py::_validar_dados_de_exame`/`_validar_valor_adicional` + `ExameInvalido`/`RegraPlantaoInvalida`, convertidas em 422 no router (`except ExameInvalido as erro: raise HTTPException(422, str(erro))`). **Validado ao vivo** nesta verificação (servidor real + Postgres real, não só os testes): `POST /exames` com `preco_base: -10` e `0` → 422 "Preço-base deve ser maior que zero."; categoria só com espaços → 422 "Categoria não pode ficar vazia."; `POST /regras-plantao` com `valor_adicional: 0` → 422 "Valor adicional deve ser maior que zero."; `"  Hematologia  "`/`"  Exame Verificacao S14  "` gravados como `"Hematologia"`/`"Exame Verificacao S14"` (trim confirmado); `GET /exames` e `GET /regras-plantao` depois de cada rejeição confirmam que nada foi gravado. Tasks T038–T043. |
| US4 | Lista coerente com filtros após ação | **Atendida** | `useColecaoCrud.ts::criar`/`salvarItem`/`executarAcaoSobreItem` recarregam a lista do servidor (que já aplica os filtros) depois de toda ação; `aviso` preenchido quando o item criado não volta na recarga, renderizado em `role="status"` nas três telas (`TelaClinicas.tsx`, `TelaVeterinarios.tsx`, `TelaExames.tsx`). Tasks T044–T045. |
| US5 | Valores em reais | **Atendida** | `apps/web/src/ui/formatacao.ts::formatarMoeda` (`Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`), usado em `TelaExames.tsx` nas células de preço-base e valor adicional. Confirmado via teste e, no T056 registrado pelo autor, na UI real ("R$ 42,90" após editar). Tasks T046–T047. |
| US6 | Cada papel vê só o que pode fazer, regra centralizada | **Atendida** | `apps/web/src/autenticacao/permissoesDeTela.ts::podeExecutar`, mapa `PAPEIS_POR_ACAO` conferido nesta verificação contra `apps/api/.../auth/service.py::_PERMISSOES` linha a linha: `CLINICA_GERENCIAR`/`VETERINARIO_GERENCIAR`/`EXAME_GERENCIAR`/`REGRA_PLANTAO_GERENCIAR` só `ADMIN`; `REGRA_PLANTAO_VER` em `ADMIN` e `ATENDENTE` (não em `TECNICO`) — espelho exato. `grep -rn "papel ===" apps/web/src --include=*.tsx --include=*.ts` → vazio (nenhuma comparação de papel sobrevive fora do módulo central). Tasks T048–T052. |
| US7 | Suíte de testes estável | **Atendida** | A suíte padrão passou nesta reverificação (285/285). Após `vite.config.ts` adotar `pool: 'vmThreads'`, a suíte com cobertura passou isoladamente e em uma bateria nova de 10/10 execuções consecutivas, sempre com 27 arquivos e 285 testes, sem timeout de teste ou worker. Não há `.skip`/`.only`/`.todo`, aumento de timeout ou retry escondendo falhas. Tasks T002/T003/T053/T054 e correção posterior `fb4e387`. |

Todas as sete stories estão atendidas e confirmadas nesta rodada.

## Seam de teste

- Backend: validação na seam de service (`cadastrar_exame`/`editar_exame`/`cadastrar_regra_plantao`/`editar_regra_plantao`), com repositório fake — mesmo padrão de `CrmvVazio` (S3), não em `Field(...)` do schema Pydantic (confirmado: `apps/api/src/vertere_api/exames/schemas.py` não mudou nesta spec, `git diff main...HEAD --stat` não lista o arquivo). Mais teste de router (`TestClient`) cobrindo o 422 ponta a ponta e a confirmação de não-gravação. Cumpre Princípio IV.
- Frontend: seam nos hooks (`useColecaoCrud`, `useClinicas`, `useVeterinarios`, `useExames`, `useRegrasPlantao`) com API mockada, e nas funções puras novas (`mensagemDeErroPadrao`, `formatarMoeda`, `podeExecutar`), com teste de componente por cima (`Tela*.test.tsx`, `Formulario*.test.tsx`). Os cenários da spec (preservar dados em erro, recarga pós-ação, 422 vs 500, moeda, visibilidade por papel) têm teste tabela-dirigido correspondente — não é teste de "não quebrou".

## Out of Scope

Nenhuma funcionalidade nova de negócio. Confirmado pelo diffstat (`git diff main...spec/s14-polimento-telas-web --stat`, 53 arquivos): nenhuma rota, tabela, migração ou entidade nova; `tipos.gerados.ts` intocado; `apps/web/package.json` só muda um script (`test:cobertura` sem `--maxWorkers=2`), zero dependências novas. Os dois itens registrados em "Descobertas" como explicitamente fora de escopo desta spec (validação de faixa de `dia_semana`, banco de teste separado para a suíte do backend) **não foram implementados** — confirmado (`dia_semana: int` sem constraint em `schemas.py`/`service.py`; nenhum `conftest.py` com banco de teste separado em `apps/api/tests/`). Correto: ficaram só registrados, sem decisão unilateral da sessão.

## ADRs

Stack sem desvio: backend Python 3.13/FastAPI/SQLAlchemy/pytest (sem mudança); frontend React+Vite+TS+pnpm, `Intl.NumberFormat` nativo (sem lib de formatação nova). Nenhuma dependência nova em `apps/web/package.json` nem `apps/api/pyproject.toml`. Compatível com ADR-0001/0002.

## Funcional de ponta a ponta

O percurso HTTP abaixo foi validado na primeira rodada, em 2026-10-02, com servidor real (`uvicorn` na porta 8010) e o mesmo Postgres de dev (`vertere_postgres_dev`, 5434):
- Criado usuário admin temporário via SQL direto (a suíte de testes já tinha zerado `usuarios` antes desta verificação começar, achado de harness já conhecido — ver acima). Login via `POST /auth/login` funcionou.
- `POST /exames` com `preco_base: -10` e `0` → 422 com a mensagem exata esperada pela spec; `POST /regras-plantao` com `valor_adicional: 0` → 422 idem; categoria só com espaços → 422; `"  Hematologia  "`/nome com espaços → gravados sem espaço nas pontas (`GET /exames` confirma). Toda rejeição confirmada como **não gravada** via `GET` logo depois.
- `POST /clinicas` com e-mail inválido devolve a estrutura 422 do Pydantic que `mensagemDeErroPadrao` (coberta por teste próprio) traduz para "Verifique o campo E-mail: valor inválido." — o bug da S12 ("todo 422 vira CNPJ inválido") não se repete nesta rejeição, porque `useClinicas.ts::mensagemDeErro` só usa a mensagem de CNPJ quando o `detail` contém "CNPJ".
- Limpeza: usuário e exame de teste criados nesta verificação foram apagados via SQL ao final; servidor `uvicorn` encerrado. Estado das tabelas depois: `clinicas=1`, `veterinarios=1` (dados pré-existentes, intocados), `usuarios=0`, `exames=0`, `regras_plantao=0` (já zeradas pela suíte de testes antes mesmo desta verificação rodar qualquer coisa — mesmo achado de harness da "Descobertas", não uma regressão desta spec).
- Na reverificação de 2026-10-19, o caminho funcional não foi repetido: o delta desde a primeira rodada toca apenas a arbitragem de respostas concorrentes do hook compartilhado e seus testes, não os controles ou contratos HTTP. A integração renderizada desse delta foi exercitada pela suíte de componentes, mas esta rodada não declara uma nova validação manual de navegador.

## Pendências

Nenhuma. A falha de estabilidade registrada na rodada anterior foi corrigida e o gate de 10 execuções consecutivas passou integralmente.

**Achados de harness que não bloqueiam a S14** (já registrados em "Descobertas" do `spec.md` e no `handoff.md` pelo autor, reconfirmados por esta verificação, ficam para decisão separada do usuário):
- A suíte `test_*_router.py` do backend roda contra o banco de dev e apaga `usuarios`/`exames`/`regras_plantao` a cada execução — reproduzido de novo nesta verificação.
- `dia_semana` sem validação de faixa 0–6 no backend (só a tela limita).
