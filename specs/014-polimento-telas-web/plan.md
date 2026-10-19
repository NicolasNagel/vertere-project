# Implementation Plan: Polimento das Telas Web de Cadastro (S12/S13) e Validação de Valores de Exames

**Branch**: `spec/s14-polimento-telas-web` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-polimento-telas-web/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Polir as quatro telas de cadastro (Clínicas e Veterinários da S12, Exames e Regras de Plantão da
S13) e fechar o achado de backend da S13.

**Backend (`apps/api`, módulo `exames` de S5)**: `cadastrar_exame`/`editar_exame` e
`cadastrar_regra_plantao`/`editar_regra_plantao` passam a validar preço-base e valor adicional > 0,
e categoria/nome não vazios, gravando categoria/nome sem espaços nas pontas. Recusam com exceções de
domínio que o router converte em 422 com `detail` em português. É o mesmo padrão de `CrmvVazio`
(S3), na seam de service (Princípio IV).

**Frontend (`apps/web`)**, cinco movimentos:
1. **Formulários**:
   - `useColecaoCrud` passa a devolver `ResultadoAcao` nas ações de formulário;
   - um hook novo, `useEnvioFormulario`, controla "salvando", erro do envio e fechamento só em
     sucesso;
   - os quatro formulários ganham "Cancelar".
2. **Retrofit de S12**: `useClinicas`/`useVeterinarios` passam a ser construídos sobre
   `useColecaoCrud`. Isso resolve de uma vez o erro de rede silencioso (FR-005), o resultado de
   formulário (FR-001/FR-002) e a coerência com filtros (FR-013). É a migração que o handoff da S13
   deixou condicionada a "uma spec futura tocar esses arquivos por outro motivo", e esta spec toca.
3. **Lista coerente**: toda ação bem-sucedida recarrega a lista do servidor, que já aplica os
   filtros. Se o item criado não volta na recarga, aparece um aviso.
4. **Mensagens**: `mensagemDeErroPadrao` traduz 422 do Pydantic (com rótulo do campo), 5xx e corpo
   não-JSON. Os hooks só usam mensagem específica de 422 quando reconhecem o `detail`.
5. **Apresentação e regras de tela**:
   - `formatarMoeda` para R$;
   - `permissoesDeTela.ts` espelha `_PERMISSOES` e substitui todo `papel === …` das telas, o que
     também esconde a escrita de Clínicas/Veterinários para quem não é admin (decisão do usuário,
     ver "Descobertas");
   - `colSpan` correto na S12.

**Testes**: para estabilizar a suíte (research.md, Decisão 7, com experimento: a suíte padrão
falhou em 2 de 5 execuções), duas mudanças:
- `maxWorkers: '50%'` na config do vitest;
- um helper `tests/usuario.ts` com `userEvent.setup({ delay: null })` nos testes que digitam.

## Technical Context

**Language/Version**: Python 3.13 (backend), TypeScript 6.0 + React 19.2 (frontend)

**Primary Dependencies**:
- Backend: FastAPI + Pydantic v2, SQLAlchemy 2.x, sem mudança.
- Frontend: React Router 8, cliente HTTP interno (`api/clienteHttp.ts`), tipos gerados do OpenAPI
  (`api/tipos.gerados.ts`), `Intl.NumberFormat` nativo para moeda.
- **Nenhuma dependência nova.**

**Storage**: PostgreSQL (S5), sem migração. Só regras de validação novas antes de gravar.

**Testing**:
- Backend: `pytest`, na seam de service com repositório fake (padrão de
  `test_exames_exame_service.py`), mais teste de router para o 422.
- Frontend: Vitest + Testing Library, nas seams dos hooks (`useColecaoCrud`, hooks de domínio) e
  nas funções puras (`mensagemDeErroPadrao`, `formatarMoeda`, `podeExecutar`), com testes de
  componente por cima.
- Cobertura: `pnpm test:cobertura` (S13).

**Target Platform**: SPA no navegador (`apps/web`) e API HTTP (`apps/api`)

**Project Type**: Web application. Monorepo `apps/api` + `apps/web` (ADR-0001/0002).

**Performance Goals**: sem meta nova. A recarga da lista depois de cada ação adiciona um `GET` por
ação, irrelevante para o volume do laboratório (dezenas a poucas centenas de itens por tela, sem
paginação; ver Assumptions da S13).

**Constraints**:
- Princípio I: o frontend nunca calcula valor, só formata.
- Princípio II: nenhuma checagem de permissão nova no backend; o espelho no frontend só oculta.
- Princípio III: identificadores, mensagens e rótulos em PT-BR.
- FR-018: estabilidade da suíte sem pular nem afrouxar teste.

**Scale/Scope**:
- 7 user stories, 19 FRs.
- Backend: 1 módulo (`exames`), 2 exceções novas, 4 funções de service validadas.
- Frontend: 4 telas, 4 formulários e 4 hooks de domínio tocados, 1 hook compartilhado estendido, e
  4 arquivos novos pequenos (`useEnvioFormulario`, `permissoesDeTela`, `formatacao`, e a extensão
  de `erroApi`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Regra de Ouro)**: o backend passa a **garantir** a positividade do preço (antes era
  só o formulário), o que reforça o princípio: preço é decidido e validado no código/banco.
  `formatarMoeda` só formata para exibição, sem arredondar valor gravado nem calcular. PASS.
- **Princípio II (`authorize()` centralizado)**: nenhuma checagem de permissão nova ou alterada no
  backend. `permissoesDeTela.ts` é espelho de leitura de `_PERMISSOES`, usado só para ocultar
  controles, no mesmo papel que `itensDeNavegacao.ts` (S11) já cumpre para rotas. Ele substitui
  comparações `papel === …` espalhadas nas telas por um ponto único. A decisão real continua em
  `exigir_acao`/`authorize()`. PASS.
- **Princípio III (Domínio em Português)**: exceções (`ExameInvalido`, `RegraPlantaoInvalida`),
  mensagens, hooks e arquivos novos em PT-BR. As chaves de `AcaoDeTela` repetem os nomes do enum
  `Acao` do backend, que já são PT. PASS.
- **Princípio IV (Seam de teste na camada mais alta)**:
  - Backend: a validação fica no service (seam pura com repositório fake), não em `Field(...)` do
    schema, nem só no router.
  - Frontend: a seam é `useColecaoCrud` e os hooks de domínio (API mockada), mais as funções puras
    novas.
  - Toda task segue test-first, com cobertura antes do commit (`pnpm test:cobertura` / `pytest
    --cov`).

  PASS.
- **Princípio V (Spec como fonte de verdade)**: as duas mudanças de escopo achadas neste plano
  (visibilidade de escrita na S12 e `colSpan` na S12) foram levadas ao usuário, decididas e
  registradas em "Descobertas" da spec antes de entrar no plano. O fechamento continua sendo por
  `/fechar-spec` e depois `/code-review`. PASS.

**Re-check pós-design (Phase 1)**: data-model e contratos não introduzem violação. O contrato HTTP
muda só em casos de rejeição nova (422) e na limpeza de espaços, sem rota, schema ou permissão nova.
Nenhuma entrada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/014-polimento-telas-web/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── api-exames-validacao.md   # 422 novos em POST/PATCH de exames e regras de plantão
│   └── frontend-interfaces.md    # assinaturas compartilhadas entre as quatro telas
├── checklists/requirements.md    # /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/api/
├── src/vertere_api/exames/
│   ├── service.py         # ExameInvalido, RegraPlantaoInvalida; validação + strip em
│   │                      # cadastrar_/editar_exame e cadastrar_/editar_regra_plantao
│   └── router.py          # except ExameInvalido/RegraPlantaoInvalida -> 422 com detail string
└── tests/
    ├── test_exames_exame_service.py          # casos novos na seam de service
    ├── test_exames_regra_plantao_service.py  # idem
    └── test_exames_router.py                 # 422 ponta a ponta via TestClient

apps/web/
├── vite.config.ts                    # test.maxWorkers: '50%' (Decisão 7)
├── package.json                      # test:cobertura passa a herdar maxWorkers da config
├── tests/usuario.ts                  # novo: userEvent.setup({ delay: null }) (Decisão 7)
└── src/
    ├── api/
    │   ├── useColecaoCrud.ts         # ResultadoAcao, salvarItem, aviso, recarga pós-ação
    │   └── erroApi.ts                # mensagemDeErroPadrao
    ├── ui/
    │   ├── useEnvioFormulario.ts     # novo
    │   └── formatacao.ts             # novo: formatarMoeda
    ├── autenticacao/
    │   └── permissoesDeTela.ts       # novo: AcaoDeTela, podeExecutar
    ├── clinicas/        useClinicas.ts (retrofit), TelaClinicas.tsx, FormularioClinica.tsx
    ├── veterinarios/    useVeterinarios.ts (retrofit), TelaVeterinarios.tsx, FormularioVeterinario.tsx
    └── exames/          useExames.ts, useRegrasPlantao.ts, TelaExames.tsx,
                         FormularioExame.tsx, FormularioRegraPlantao.tsx
```

Cada arquivo de código tocado tem seu `*.test.ts(x)` ao lado, atualizado ou criado.

**Structure Decision**: a mesma estrutura de monorepo das specs anteriores (`apps/api` +
`apps/web`), sem pasta nova de domínio. As peças compartilhadas novas vão para onde as do mesmo tipo
já vivem:
- hooks/HTTP em `api/` (junto de `useColecaoCrud` e `erroApi`);
- primitivas de interface em `ui/` (junto de `Botao`/`CampoTexto`);
- regra de papel em `autenticacao/` (junto de `SessaoContext`).

## Ordem de implementação sugerida (insumo para `/speckit-tasks`)

1. **Fundação** (bloqueia o resto):
   - `ResultadoAcao`/`salvarItem`/`aviso`/recarga em `useColecaoCrud`;
   - `mensagemDeErroPadrao`;
   - `useEnvioFormulario`;
   - `permissoesDeTela`;
   - `formatarMoeda`;
   - `maxWorkers` e o helper `usuario`, primeiro, para as tasks seguintes já rodarem numa suíte
     estável.
2. **US3 backend**, independente do frontend e pode correr em paralelo com a fundação.
3. **US1 + US2**: retrofit de `useClinicas`/`useVeterinarios` e os quatro formulários com
   "Cancelar"/"salvando"/erro inline, mais o `colSpan`.
4. **US4** (aviso de filtro nas telas) e **US5** (moeda em `TelaExames`).
5. **US6**: trocar as comparações de papel por `podeExecutar` e esconder a escrita de S12.
6. **US7**: rodar o cenário 7 do quickstart (10 execuções) como verificação final.

## Complexity Tracking

*Sem violações da Constitution Check; seção não aplicável.*
