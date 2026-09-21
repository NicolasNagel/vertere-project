---
codigo: S8
modulo: Fechamento Financeiro
issue: https://github.com/NicolasNagel/vertere-project/issues/18
status: em-desenvolvimento
---

## Problem Statement

Hoje o faturamento por clínica é apurado manualmente na planilha, somando linhas de atendimento
à mão no fim do mês — mesma origem de erro que os módulos anteriores (Atendimentos) já eliminaram
para o cálculo por atendimento individual, mas que ainda não existe agregada por clínica/período.
Além disso, não há nenhum registro formal de "esse fechamento já foi pago pela clínica ou não" —
hoje isso é controlado fora do sistema (de cabeça ou em outra planilha), sem visibilidade de quem
está inadimplente. Sem Fechamento Financeiro, os módulos anteriores (Clínicas, Atendimentos) não
têm ponto de consolidação financeira, e o PRD (US32-36) fica sem cobertura.

## Solution

Um módulo `financeiro` com a entidade `Fechamento` (clínica + período mensal + valor total
snapshot + status de pagamento) e funções puras de agregação (`calcular_faturamento_por_clinica`,
`calcular_resumo_financeiro`) reaproveitando os atendimentos já registrados (S6) sem reimplementar
a soma por atendimento. A operação `gerar_fechamento` cria o snapshot e, a partir daí, bloqueia
edição dos atendimentos daquele período/clínica — mecanismo que S6 deixou pendente para esta spec
(ver `docs/specs/S6-atendimentos.md`, seção "Further Notes"). Além do escopo original do PRD, esta
spec cobre uma extensão decidida com o usuário durante o `/spec-write` (2026-09-21): confirmação
manual de pagamento por fechamento (`confirmar_pagamento`), com o status "Inadimplente" calculado
sob demanda (nunca gravado) a partir de um prazo de pagamento configurável por clínica.

## User Stories

1. Como administrador, quero visualizar o faturamento acumulado por clínica em um período, para
   acompanhar a receita do laboratório. (PRD US32)
2. Como administrador, quero gerar o fechamento mensal de uma clínica, que soma todos os
   atendimentos do período (com descontos e adicionais aplicados), para saber o valor total a
   cobrar dela. (PRD US33)
3. Como administrador, quero que, uma vez fechado um período para uma clínica, os atendimentos
   daquele período fiquem bloqueados para edição, para preservar a integridade do valor fechado.
   (PRD US34)
4. Como administrador, quero exportar o fechamento de uma clínica (relatório/CSV), para usar na
   cobrança feita fora do sistema (boleto, transferência, etc.). (PRD US35)
5. Como administrador, quero ver um resumo financeiro geral (todas as clínicas, período
   selecionável), para ter visão consolidada do negócio. (PRD US36)
6. Como administrador, quero confirmar que um fechamento foi efetivamente pago pela clínica
   ("dar baixa"), para manter o controle de quem já quitou o período. (Extensão decidida em
   2026-09-21, fora do texto original do PRD.)
7. Como administrador, quero que um fechamento não pago após o prazo de pagamento da clínica
   apareça como "Inadimplente" no sistema, para identificar rapidamente quem está em atraso sem
   precisar calcular prazos de cabeça. (Extensão decidida em 2026-09-21.)
8. Como administrador, quero configurar um prazo de pagamento diferente do padrão para uma clínica
   específica (ex: acordo quinzenal/semanal), para que a regra de inadimplência reflita o acordo
   comercial real daquele cliente sem exigir configuração manual para a maioria das clínicas que
   segue o prazo padrão. (Extensão decidida em 2026-09-21.)

## Implementation Decisions

- **Módulo novo**: `financeiro`, seguindo a mesma estrutura de pastas dos módulos anteriores
  (`domain`, `repository` via `Protocol`, `service`, `router`, `schemas`, `models.py`).
- **`Fechamento` (entidade)**: `id`, `clinica_id`, `ano` (`int`), `mes` (`int`, 1-12), `valor_total`
  (`Decimal`, snapshot da soma no momento do fechamento), `quantidade_atendimentos` (`int`),
  `data_fechamento` (`datetime`), `pago` (`bool`, default `False`), `data_pagamento`
  (`datetime | None`). Fechamento é sempre mensal (`ano`+`mes`), consistente com a linguagem do
  PRD ("fechamento mensal") — não um range de datas arbitrário.
- **Existência do `Fechamento` = período fechado**: não há campo `status` de "aberto/fechado"; a
  simples existência de um `Fechamento` para `clinica_id`+`ano`+`mes` já significa que o período
  está fechado e bloqueado para edição de atendimentos (ver bloqueio abaixo). Gerar um fechamento
  para uma combinação clínica+período já existente é rejeitado (`FechamentoJaExiste`) — sem
  reprocessamento silencioso.
- **`calcular_faturamento_por_clinica(atendimentos, clinica_id, ano, mes) -> Decimal`**: função
  pura, sem repositório — soma `valor_total` dos atendimentos com `status=ativo` daquela clínica
  cuja `data_hora` cai no mês/ano informado. Atendimentos cancelados não entram na soma (mesma
  regra que `listar_atendimentos` já aplica ao filtrar por status).
- **`calcular_resumo_financeiro(atendimentos, ano, mes) -> list[tuple[str, Decimal]]`** (ou
  estrutura equivalente clínica→valor): função pura que aplica `calcular_faturamento_por_clinica`
  para cada `clinica_id` presente nos atendimentos do período — cobre US36 sem reimplementar a
  soma por clínica.
- **`gerar_fechamento(clinica_id, ano, mes, repo, atendimentos_repo, clinicas_repo)`**: valida que
  a clínica existe e está ativa (reaproveitando `ClinicaRepository` de S2, mesmo padrão de S6),
  rejeita se já existe `Fechamento` para aquela clínica+período (`FechamentoJaExiste`), calcula
  `valor_total`/`quantidade_atendimentos` via `calcular_faturamento_por_clinica` sobre os
  atendimentos carregados de `AtendimentoRepository` (S6), persiste o snapshot com `pago=False`.
  Fechar um período sem nenhum atendimento ativo é permitido (gera um fechamento com
  `valor_total=0`) — não há necessidade identificada no PRD de impedir isso.
- **Bloqueio de edição em `atendimentos` (cobre US3/PRD US34)**: `atendimentos/service.py` ganha um
  `Protocol` local `PeriodoFechadoChecker` (`esta_fechado(clinica_id: str, data_hora: datetime) ->
  bool`), sem importar nada de `financeiro` (evita import circular, já que `financeiro` depende de
  `atendimentos` para somar). `editar_atendimento` e `cancelar_atendimento` recebem um parâmetro
  opcional `periodo_fechado: PeriodoFechadoChecker | None = None`; quando fornecido e
  `esta_fechado(...)` retorna `True`, a operação é rejeitada com um novo erro de domínio
  `PeriodoFechado` antes de qualquer mutação. O adaptador concreto (`financeiro`, consultando
  `FechamentoRepository`) é implementado nesta spec e conectado no `atendimentos/router.py` (nível
  de composição/DI), não dentro de `atendimentos/service.py`.
- **Prazo de pagamento por clínica (cobre US8, extensão)**: `Clinica` (S2, `clinicas/domain.py`)
  ganha um novo campo `prazo_pagamento_dias: int | None` (default `None`). `None` = usa a regra
  padrão global (vencimento no dia 10 do mês seguinte ao mês do `Fechamento`), cobrindo a maioria
  das clínicas sem exigir configuração. Um valor numérico (ex: `15`, `7`) sobrepõe a regra padrão
  para acordos quinzenais/semanais: vencimento = `data_fechamento + prazo_pagamento_dias` dias.
  Não é um parâmetro de `editar_clinica` (S2): essa função faz overwrite completo via
  `dataclasses.replace`, então editar qualquer outro campo resetaria o prazo customizado para
  `None` sem intenção. Em vez disso, `clinicas/service.py` ganha `definir_prazo_pagamento(
  clinica_id, prazo_pagamento_dias, repo) -> Clinica`, ação isolada seguindo o mesmo padrão já
  usado no arquivo para `inativar_clinica`/`reativar_clinica` (`_definir_estado_ativo`).
- **`calcular_vencimento(clinica: Clinica, data_fechamento: datetime) -> date`**: função pura em
  `financeiro/service.py` que aplica a regra acima (padrão dia 10 do mês seguinte, ou
  `data_fechamento + N dias` se `clinica.prazo_pagamento_dias` estiver definido).
- **Status de pagamento nunca gravado como "inadimplente"**: `Fechamento` só grava `pago` (bool) e
  `data_pagamento`. O status exibido ao usuário (`PENDENTE` | `PAGO` | `INADIMPLENTE`) é sempre
  calculado sob demanda por `status_exibicao(fechamento: Fechamento, clinica: Clinica, hoje: date)
  -> StatusFechamento` (função pura): `PAGO` se `fechamento.pago`; senão `INADIMPLENTE` se
  `hoje > calcular_vencimento(clinica, fechamento.data_fechamento)`; senão `PENDENTE`. Essa decisão
  evita depender de um job/cron para "virar" o status e evita que o campo fique desatualizado —
  mesmo raciocínio de `calcular_valor_total` (S6) ser função pura em vez de valor gravado sujeito a
  ficar stale.
- **`confirmar_pagamento(fechamento_id, repo, data_pagamento=None) -> Fechamento`**: marca
  `pago=True` e grava `data_pagamento` (default: `datetime.now()` se não informado). Confirmar um
  fechamento já pago é rejeitado (`FechamentoJaPago`), mesmo padrão de idempotência de
  `cancelar_atendimento` (S6). Não existe operação de "estornar"/desfazer pagamento nesta spec (ver
  "Out of Scope").
- **`exportar_fechamento_csv(fechamento: Fechamento, clinica: Clinica) -> str`**: função pura que
  monta um CSV (cabeçalho + uma linha) com clínica, período, valor total, quantidade de
  atendimentos, status de pagamento e data de pagamento (se houver) — cobre US4/PRD US35. Sem
  geração de PDF ou layout de boleto — apenas dado tabular exportável.
- **Tipo monetário**: `valor_total` é `Decimal` (Python) / `Numeric` (SQLAlchemy), mesma convenção
  de S5/S6.
- **Autorização**: reaproveita `authorize()` de S1, sem checagem de acesso reimplementada.
  - `gerar_fechamento` e `confirmar_pagamento`: exigem `authorize(papel, Acao.FECHAMENTO_GERENCIAR)`
    — nova ação, concedida só a `admin` (PRD: todas as user stories de Financeiro/Fechamento são
    "como administrador").
  - Visualização de faturamento por clínica, resumo financeiro geral e listagem de fechamentos:
    reaproveita `Acao.FINANCEIRO_VER` (já existe desde S1, concedida só a `admin`) — não cria ação
    nova para leitura.
  - `atendente` e `tecnico` continuam sem nenhuma ação que exponha dado financeiro agregado (PRD
    US4), consistente com a decisão já tomada em S6.

## Testing Decisions

- Segue o padrão de `atendimentos/service.py` (S6): `financeiro/service.py` são funções puras que
  recebem repositórios como `Protocol`, testadas com fakes em memória — sem HTTP/DB.
- `calcular_faturamento_por_clinica`, `calcular_resumo_financeiro`, `calcular_vencimento` e
  `status_exibicao` são testadas isoladamente, sem nenhum repositório (funções puras sobre
  `list[Atendimento]` / `Clinica` / `Fechamento` + `date`/`datetime`), incluindo: mês sem
  atendimentos, atendimento cancelado excluído da soma, clínica sem `prazo_pagamento_dias` (regra
  padrão dia 10), clínica com `prazo_pagamento_dias` customizado, fechamento pago (sempre `PAGO`
  independente da data), fechamento pendente antes/depois do vencimento.
- `exportar_fechamento_csv` é testada isoladamente como função pura, sem repositório, cobrindo
  formato de cabeçalho e valores.
- `gerar_fechamento` e `confirmar_pagamento` são testadas com fakes de `FechamentoRepository`,
  `AtendimentoRepository` e `ClinicaRepository`, cobrindo: geração válida, clínica inexistente/
  inativa, período já fechado, confirmação de pagamento válida, confirmação de fechamento já pago
  rejeitada.
- O bloqueio de edição em `atendimentos` é testado em `test_atendimentos_service.py` com um fake
  `PeriodoFechadoChecker` (objeto simples que responde `esta_fechado` fixo) — sem depender do
  módulo `financeiro` de verdade nesses testes, provando que o `Protocol` é a seam certa.
- Autorização é testada reutilizando `authorize()` de S1 diretamente, mesmo padrão de S5/S6/S7: um
  teste de integração leve na camada de router confirma que `Acao.FECHAMENTO_GERENCIAR` e
  `Acao.FINANCEIRO_VER` são os pontos de decisão usados, incluindo o caso de `admin` autorizado e
  `atendente`/`tecnico` bloqueados nos dois.

## Tasks

- [x] T1 — Domínio: campo `prazo_pagamento_dias` em `Clinica` (`clinicas/domain.py`), entidade
      `Fechamento` + `StatusFechamento` (`PENDENTE`/`PAGO`/`INADIMPLENTE`) em `financeiro/domain.py`,
      `FechamentoRepository` (Protocol) em `financeiro/service.py` (fakes em memória seguem o
      padrão do repo: definidos por arquivo de teste, não como implementação compartilhada — ver
      T4/T8/T10) (User Stories: base para todas)
- [x] T2 — Testes de `definir_prazo_pagamento` (`clinicas/service.py`, ação isolada, mesmo padrão
      de `inativar_clinica`/`reativar_clinica`): define valor customizado, volta para `None`
      (regra padrão), clínica inexistente rejeitada (User Stories: 8)
- [x] T3 — Implementação de `definir_prazo_pagamento` em `clinicas/service.py`, fazendo os testes
      de T2 passarem (User Stories: 8)
- [x] T4 — Testes de `calcular_faturamento_por_clinica` e `calcular_resumo_financeiro` (funções
      puras sobre `list[Atendimento]`): sem atendimentos, com atendimento cancelado excluído,
      múltiplas clínicas no resumo (User Stories: 1, 5)
- [x] T5 — Implementação de `calcular_faturamento_por_clinica` e `calcular_resumo_financeiro` em
      `financeiro/service.py`, fazendo os testes de T4 passarem (User Stories: 1, 5)
- [x] T6 — Testes de `calcular_vencimento` e `status_exibicao` (funções puras sobre `Clinica` +
      `Fechamento` + `date`): regra padrão (dia 10), `prazo_pagamento_dias` customizado, pago
      sempre `PAGO`, pendente antes/depois do vencimento (User Stories: 6, 7, 8)
- [x] T7 — Implementação de `calcular_vencimento` e `status_exibicao` em `financeiro/service.py`,
      fazendo os testes de T6 passarem (User Stories: 6, 7, 8)
- [x] T8 — Testes de `gerar_fechamento`: geração válida, clínica inexistente/inativa rejeitada,
      período já fechado rejeitado, fechamento sem atendimentos ativos gera valor 0 (User Stories:
      2)
- [x] T9 — Implementação de `gerar_fechamento` em `financeiro/service.py`, fazendo os testes de T8
      passarem (User Stories: 2)
- [ ] T10 — Testes de `confirmar_pagamento`: confirmação válida grava `pago`/`data_pagamento`,
      confirmação de fechamento já pago rejeitada (User Stories: 6)
- [ ] T11 — Implementação de `confirmar_pagamento` em `financeiro/service.py`, fazendo os testes de
      T10 passarem (User Stories: 6)
- [ ] T12 — Testes de `exportar_fechamento_csv` (função pura): formato de cabeçalho e linha,
      inclusão de status de pagamento (User Stories: 4)
- [ ] T13 — Implementação de `exportar_fechamento_csv` em `financeiro/service.py`, fazendo os
      testes de T12 passarem (User Stories: 4)
- [ ] T14 — Testes do bloqueio de edição em `atendimentos/service.py`: `editar_atendimento` e
      `cancelar_atendimento` rejeitam com `PeriodoFechado` quando um `PeriodoFechadoChecker` fake
      retorna `True`, permitem quando retorna `False` ou quando não é passado (User Stories: 3)
- [ ] T15 — Implementação do `Protocol PeriodoFechadoChecker` e do parâmetro `periodo_fechado` em
      `editar_atendimento`/`cancelar_atendimento` (`atendimentos/service.py`), fazendo os testes de
      T14 passarem (User Stories: 3)
- [ ] T16 — Persistência real: migração Alembic (coluna `prazo_pagamento_dias` em `clinicas`,
      tabela `fechamentos` com `Numeric` para `valor_total`) + implementação de
      `FechamentoRepository` contra PostgreSQL (User Stories: 1, 2, 3, 4, 5, 6, 7, 8)
- [ ] T17 — Nova ação `Acao.FECHAMENTO_GERENCIAR` em `auth/service.py` (`_PERMISSOES`: apenas
      `admin`); confirma que `Acao.FINANCEIRO_VER` (já existente) cobre as visualizações desta
      spec (User Stories: todas, via checagem de acesso)
- [ ] T18 — Endpoints HTTP (`financeiro/router.py` + `schemas.py`): gerar fechamento, confirmar
      pagamento, ver faturamento por clínica, resumo financeiro geral, exportar CSV (via
      `Depends(exigir_acao(...))` nas ações correspondentes); endpoint novo em `clinicas/router.py`
      + `schemas.py` (S2) para `definir_prazo_pagamento` (`PATCH`/`PUT` dedicado, mesmo padrão de
      inativar/reativar clínica); wiring do adapter
      `PeriodoFechadoChecker` (baseado em `FechamentoRepository`) em `atendimentos/router.py`
      (User Stories: 1, 2, 3, 4, 5, 6, 7, 8)

## Out of Scope

- Reabrir um fechamento já gerado, ou desfazer/estornar uma confirmação de pagamento — sem
  necessidade identificada; se um fechamento foi gerado ou pago por engano, correção é tratada como
  ajuste manual fora do sistema nesta spec.
- Pagamento parcial de um fechamento (parcelamento) — `confirmar_pagamento` é binário (pago/não
  pago), sem valor parcial.
- Notificação automática (e-mail/WhatsApp) de inadimplência para a clínica — o status
  "Inadimplente" só é exibido dentro do sistema para o administrador; envio proativo fica fora do
  MVP.
- Emissão de nota fiscal ou integração com meio de pagamento real (boleto, PIX, gateway) — o
  fechamento gera apenas o valor a cobrar e o CSV, a cobrança em si continua fora do sistema (PRD,
  seção "Out of Scope").
- Controle de despesas/custos do laboratório — o financeiro do MVP cobre apenas receita (PRD).
- Edição em massa de `prazo_pagamento_dias` para várias clínicas de uma vez — edição é sempre por
  clínica individual, reaproveitando `editar_clinica` (S2).
- Fechamento com período diferente de um mês calendário (ex: quinzenal) — a operação de fechar
  continua mensal para todas as clínicas; só o *prazo de pagamento* daquele fechamento mensal varia
  por clínica (ver "Implementation Decisions").

## Further Notes

- Esta spec depende de S1 (Auth/Usuários), S2 (Clínicas — estendida com `prazo_pagamento_dias`) e
  S6 (Atendimentos — estendida com o bloqueio de edição por período fechado). Não depende de S5
  (Exames) nem S7 (Laudos) diretamente.
- Ordem de specs sugerida a partir daqui (mesma de S6/S7): Fechamento Financeiro (esta) → Portal da
  Clínica → Importação de Dados Históricos.
- A extensão de confirmação de pagamento/inadimplência (User Stories 6-8) não está no texto do PRD
  original (`issues/prd.md`) — foi decidida com o usuário durante o `/spec-write` desta spec
  (2026-09-21), documentada aqui em vez de só em conversa, para que uma sessão nova implementando
  esta spec não precise da conversa original para entender o porquê.

## Descobertas

<!-- Necessidades novas encontradas durante o desenvolvimento, fora do escopo acima. Não implementar sem decisão do PO. -->

## Verificação

<!-- Preenchido por /fechar-spec -->
