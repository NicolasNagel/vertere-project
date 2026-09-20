---
codigo: S6
modulo: Atendimentos
issue: https://github.com/NicolasNagel/vertere-project/issues/12
status: em-desenvolvimento
---

## Problem Statement

Hoje o registro de cada atendimento (clínica, veterinário, paciente, exames realizados, valor
cobrado) vive numa linha de planilha, com o valor total calculado manualmente pelo atendente —
soma dos exames, decisão "no olho" sobre adicional de plantão, desconto negociado à mão. Isso é a
origem do risco de erro de cálculo citado no PRD (Problem Statement) e o ponto que os módulos
anteriores (Clínicas, Veterinários, Pacientes, Exames & Precificação) foram construídos para
alimentar. Sem Atendimentos, nenhum dos cadastros anteriores tem uso operacional real, e não há
base para Laudos (vinculados a um atendimento) nem para Fechamento Financeiro (soma de
atendimentos por clínica/período).

## Solution

Um módulo `atendimentos` com a entidade `Atendimento` (clínica, veterinário, paciente, itens de
exame com preço snapshot, adicional de plantão, desconto, valor total, status) e uma função pura
`calcular_valor_total` que soma os itens de exame, aplica o adicional de plantão e subtrai o
desconto — a mesma decisão de design de S5 (`calcular_adicional_plantao` como função pura testável
sem repositório) repetida aqui para o cálculo do valor total. O módulo reaproveita
`exames/service.calcular_adicional_plantao` (S5) para sugerir o adicional a partir da data/hora do
atendimento, sem reimplementar a decisão de qual regra de plantão se aplica.

## User Stories

1. Como atendente, quero registrar um novo atendimento escolhendo clínica, veterinário, paciente,
   um ou mais exames, método de coleta e horário, para documentar a operação do dia a dia.
2. Como atendente, quero que o sistema calcule automaticamente o valor total do atendimento (soma
   dos exames + adicional de plantão − desconto), para evitar erro de cálculo manual.
3. Como atendente, quero aplicar um desconto manual a um atendimento, para casos negociados
   individualmente.
4. Como administrador, quero listar e filtrar atendimentos por período, clínica, veterinário ou
   status, para acompanhar a operação.
5. Como atendente, quero editar um atendimento registrado incorretamente (antes do fechamento do
   período), para corrigir erros de digitação.
6. Como atendente, quero que o adicional de plantão seja sugerido automaticamente com base na
   data/hora do atendimento, mas possa ser ajustado manualmente se necessário (US19 do PRD,
   aplicação real da sugestão calculada em S5).
7. Como atendente, quero cancelar um atendimento registrado por engano, para que ele deixe de
   contar como atendimento válido sem apagar o registro (histórico auditável).

## Implementation Decisions

- **Módulo novo**: `atendimentos`, seguindo a mesma estrutura de pastas dos módulos anteriores
  (`domain`, `repository` via `Protocol`, `service`, `router`, `schemas`, `models.py`).
- **Campos de `Atendimento`**: `id`, `clinica_id`, `veterinario_id`, `paciente_id`,
  `itens_exame` (lista de `ItemExame`), `metodo_coleta` (str), `data_hora` (`datetime`),
  `regra_plantao_id` (`str | None` — id da regra que originou a sugestão, `None` se não houve
  sugestão aplicável ou se o valor foi definido manualmente sem regra), `valor_adicional_plantao`
  (`Decimal`, pode ser 0, é o valor final aplicado — sugerido ou ajustado manualmente, ver
  próximo ponto), `desconto` (`Decimal`, default 0), `valor_total` (`Decimal`, resultado de
  `calcular_valor_total`), `status` (`StatusAtendimento`: `ativo` | `cancelado`).
- **Campos de `ItemExame`** (value object, não entidade própria — não tem `repository` nem CRUD
  isolado, só existe dentro de um `Atendimento`): `exame_id`, `preco_unitario` (`Decimal`,
  snapshot do `preco_base` do `Exame` no momento do registro — cumpre a garantia de US16/S5 de
  que editar preço de exame não afeta atendimentos passados), `quantidade` (`int`, mínimo 1 —
  cobre o caso de mais de uma unidade do mesmo exame no mesmo atendimento, ex: 2x hemograma).
  Valor do item = `preco_unitario * quantidade`.
- **Adicional de plantão — sugestão vs. ajuste manual**: `registrar_atendimento` recebe
  `data_hora` e a lista de `RegraPlantao` ativas (carregada pelo chamador/router a partir do
  repositório de S5) e usa `calcular_adicional_plantao(data_hora, regras)` para obter a sugestão;
  se o chamador não passar um `valor_adicional_plantao` explícito, o valor sugerido (ou `0` se
  nenhuma regra se aplica) é o valor final gravado, junto com o `id` da regra usada (se houve). Se
  o chamador passar `valor_adicional_plantao` explicitamente (ajuste manual do atendente), esse
  valor é gravado como final e `regra_plantao_id` é gravado como `None` — o sistema não guarda
  sugestão e valor aplicado separados, só o valor final e, quando veio de regra automática, a
  rastreabilidade de qual regra.
- **`calcular_valor_total(itens_exame, valor_adicional_plantao, desconto) -> Decimal`**: função
  pura, sem repositório — soma `preco_unitario * quantidade` de cada item, soma
  `valor_adicional_plantao`, subtrai `desconto`. Não permite valor total negativo: se o desconto
  exceder a soma (itens + adicional), `registrar_atendimento`/`editar_atendimento` rejeitam a
  operação com erro de domínio (`DescontoInvalido` ou equivalente) antes de persistir — decisão de
  código, não fica a critério da UI validar.
- **Tipo monetário**: `preco_unitario`, `valor_adicional_plantao`, `desconto`, `valor_total` são
  `Decimal` (Python) / `Numeric` (SQLAlchemy), mesma convenção de S5.
- **`status` do atendimento**: `StatusAtendimento` com dois valores nesta spec — `ativo` (default
  no registro) e `cancelado` (via `cancelar_atendimento`, nova operação desta spec cobrindo US7).
  Cancelamento não apaga o registro (auditoria) e não permite edição posterior (um atendimento
  cancelado é terminal nesta spec — reabrir não é necessidade identificada no PRD). Estados
  adicionais relacionados a Laudos (ex: "com laudo emitido") ou Fechamento (ex: "fechado") ficam
  fora desta spec — ver "Out of Scope". `listar_atendimentos` filtra por `status` entre os dois
  valores existentes.
- **Edição antes do fechamento**: como Fechamento Financeiro ainda não existe como módulo, esta
  spec não implementa nenhum bloqueio de edição — `editar_atendimento` está sempre disponível para
  um atendimento com `status=ativo` (não para `cancelado`). O bloqueio real por fechamento de
  período é responsabilidade da spec futura de Fechamento Financeiro, que vai precisar checar um
  estado adicional antes de permitir a edição (nota registrada aqui para a spec seguinte, mesmo
  padrão de S5 deixando nota para esta spec sobre snapshot de preço).
- **Referências validadas na criação**: `registrar_atendimento` verifica que `clinica_id`,
  `veterinario_id` e `paciente_id` existem e estão ativos (reaproveitando os repositórios de
  S2/S3/S4, não reimplementando a checagem), e que cada `exame_id` em `itens_exame` existe e está
  ativo (repositório de S5). Referenciar uma clínica/veterinário/paciente/exame inativo ou
  inexistente é erro de domínio, rejeitado antes de persistir.
- **Autorização**: reaproveita `authorize()` de S1.
  - `registrar_atendimento`, `editar_atendimento`, `cancelar_atendimento`: exigem
    `authorize(papel, Acao.ATENDIMENTO_GERENCIAR)` — US20-22/24 do PRD atribuem essas ações ao
    atendente; `admin` também tem a ação (mesmo padrão dos módulos anteriores, onde admin herda as
    ações operacionais além das de gestão de catálogo).
  - `listar_atendimentos`: exige `authorize(papel, Acao.ATENDIMENTO_VER)`. Concedida a `admin`,
    `atendente` e `tecnico` (quem opera o dia a dia e quem faz laudo precisa ver o atendimento).
    Usuário do tipo `clinica` usa a mesma ação, mas `listar_atendimentos` filtra
    automaticamente por `clinica_id = clinica do usuário logado` quando o papel é `clinica` — não
    uma checagem de acesso nova fora de `authorize()`, mas um filtro de escopo de dados aplicado
    pelo service a partir do papel/clínica do usuário autenticado (mesma ideia de US5 do PRD,
    aplicada operacionalmente aqui pela primeira vez desde que existe uma entidade com dado real
    de operação vinculado a clínica).
  - Novas ações desta spec: `Acao.ATENDIMENTO_GERENCIAR`, `Acao.ATENDIMENTO_VER`, adicionadas em
    `auth/service.py` seguindo o padrão de `Acao.EXAME_GERENCIAR`/`Acao.EXAME_VER`.
- **Sem acesso a valores financeiros agregados**: esta spec não expõe nenhum endpoint de soma/
  faturamento — só o `valor_total` de cada atendimento individual, que `atendente`/`tecnico` já
  enxergam ao listar/ver atendimentos (não é o dado agregado que US4 do PRD restringe; é dado
  operacional do atendimento em si). Faturamento agregado por clínica é escopo de Fechamento
  Financeiro.

## Testing Decisions

- Segue o padrão de `exames/service.py` (S5): `atendimentos/service.py` são funções puras que
  recebem um `AtendimentoRepository` (Protocol) como parâmetro, testadas com uma implementação
  fake em memória — sem HTTP/DB. `registrar_atendimento`/`editar_atendimento` recebem também os
  repositórios de S2/S3/S4/S5 (fakes) para validar as referências, sem reimplementar a lógica
  desses módulos.
- `calcular_valor_total` é testada isoladamente, sem nenhum repositório (função pura sobre
  `list[ItemExame]` + `Decimal` + `Decimal`), cobrindo: um item, múltiplos itens, item com
  `quantidade > 1`, com e sem adicional de plantão, com desconto que não zera o total, desconto
  que exceder o total (rejeitado com erro de domínio).
- Módulo testado: `atendimentos` (funções `registrar_atendimento`, `editar_atendimento`,
  `cancelar_atendimento`, `listar_atendimentos`, `calcular_valor_total`), cobrindo: registro válido
  com sugestão automática de plantão, registro com ajuste manual do adicional, registro rejeitado
  por referência inativa/inexistente (clínica, veterinário, paciente, exame), edição antes de
  cancelamento, edição rejeitada após cancelamento, cancelamento, listagem com filtro por período/
  clínica/veterinário/status, e filtro automático por clínica quando o papel é `clinica`.
- Autorização é testada reutilizando `authorize()` de S1 diretamente: um teste de integração leve
  na camada de router confirma que `Acao.ATENDIMENTO_GERENCIAR` e `Acao.ATENDIMENTO_VER` são os
  pontos de decisão usados, incluindo o caso de `tecnico` autorizado em `ATENDIMENTO_VER` mas
  bloqueado em `ATENDIMENTO_GERENCIAR`.

## Tasks

- [x] T1 — Domínio (`Atendimento`, `ItemExame`, `StatusAtendimento`) e `AtendimentoRepository`
      (Protocol) com implementação fake em memória para os testes (User Stories: base para todas)
- [x] T2 — Testes de `calcular_valor_total` (função pura, sem repositório): item único, múltiplos
      itens, quantidade > 1, com/sem adicional de plantão, desconto válido, desconto que excede o
      total (User Stories: 2, 3)
- [ ] T3 — Implementação de `calcular_valor_total` em `atendimentos/service.py`, fazendo os testes
      de T2 passarem (User Stories: 2, 3)
- [ ] T4 — Testes de `registrar_atendimento`: registro válido com sugestão automática de plantão
      (reaproveitando `calcular_adicional_plantao` de S5), registro com ajuste manual do
      adicional, rejeição por clínica/veterinário/paciente/exame inativo ou inexistente (User
      Stories: 1, 2, 6)
- [ ] T5 — Implementação de `registrar_atendimento` em `atendimentos/service.py`, fazendo os
      testes de T4 passarem (User Stories: 1, 2, 6)
- [ ] T6 — Testes de `editar_atendimento` (atualização de itens/desconto/plantão recalculando
      `valor_total`, permitida com `status=ativo`, rejeitada com `status=cancelado`) e de
      `cancelar_atendimento` (User Stories: 5, 7)
- [ ] T7 — Implementação de `editar_atendimento` e `cancelar_atendimento` em
      `atendimentos/service.py`, fazendo os testes de T6 passarem (User Stories: 5, 7)
- [ ] T8 — Testes de `listar_atendimentos` com filtro por período, clínica, veterinário e status,
      incluindo o filtro automático por clínica quando o papel do usuário é `clinica` (User
      Stories: 4)
- [ ] T9 — Implementação de `listar_atendimentos` em `atendimentos/service.py`, fazendo os testes
      de T8 passarem (User Stories: 4)
- [ ] T10 — Persistência real: modelo SQLAlchemy (`Atendimento` com `itens_exame` como tabela
      relacionada ou campo JSON — decisão de implementação, `Numeric` para valores monetários) +
      migração Alembic, implementando `AtendimentoRepository` contra PostgreSQL (User Stories: 1,
      2, 3, 4, 5, 6, 7)
- [ ] T11 — Novas ações `Acao.ATENDIMENTO_GERENCIAR`, `Acao.ATENDIMENTO_VER` em `auth/service.py`
      (`_PERMISSOES`: `ATENDIMENTO_GERENCIAR` para `admin` e `atendente`; `ATENDIMENTO_VER` para
      `admin`, `atendente`, `tecnico` e `clinica`) (User Stories: todas, via checagem de acesso)
- [ ] T12 — Endpoints HTTP (`atendimentos/router.py` + `schemas.py`): registrar, editar, cancelar
      e listar/filtrar atendimento (via `Depends(exigir_acao(...))` nas ações correspondentes,
      incluindo o filtro automático por clínica para o papel `clinica`), com mapeamento de erros
      de domínio (recurso inexistente → 404, referência inativa/desconto inválido → 400/422)
      (User Stories: 1, 2, 3, 4, 5, 6, 7)

## Out of Scope

- Emissão e envio de laudos vinculados ao atendimento — spec futura de Laudos.
- Fechamento financeiro e o bloqueio de edição por período fechado — spec futura de Fechamento
  Financeiro; esta spec só bloqueia edição de atendimento `cancelado` (ver "Implementation
  Decisions").
- Faturamento agregado por clínica/período — spec futura de Fechamento Financeiro.
- Reabrir um atendimento cancelado — sem necessidade identificada no PRD; cancelamento é terminal
  nesta spec.
- Constraint de banco impedindo dois atendimentos idênticos (mesma clínica/veterinário/paciente/
  data_hora) — sem menção no PRD, não é escopo desta spec.
- Busca textual/autocomplete de clínica, veterinário, paciente ou exame na tela de registro de
  atendimento — o frontend consome os endpoints de listagem já existentes de S2/S3/S4/S5; nenhum
  endpoint novo de busca é criado aqui.

## Further Notes

- Esta spec depende de S1 (Auth/Usuários), S2 (Clínicas), S3 (Veterinários), S4 (Pacientes) e S5
  (Exames & Precificação) — é o primeiro módulo do MVP que integra todos os cadastros anteriores.
- Ordem de specs sugerida a partir daqui (mesma de S5): Atendimentos (esta) → Laudos → Fechamento
  Financeiro → Portal da Clínica → Importação de Dados Históricos.
- A spec de Fechamento Financeiro vai precisar de um mecanismo de bloqueio de edição por período
  fechado que esta spec não implementa (ver "Implementation Decisions" e "Out of Scope") — decisão
  de design (novo status vs. campo `periodo_fechado_em`) fica para quando aquela spec for escrita.

## Descobertas

## Verificação
