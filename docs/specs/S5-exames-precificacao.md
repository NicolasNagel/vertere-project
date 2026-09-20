---
codigo: S5
modulo: Exames & Precificação
issue: https://github.com/NicolasNagel/vertere-project/issues/10
status: em-desenvolvimento
---

## Problem Statement

Hoje a tabela de preços de exames e as regras de adicional de plantão vivem soltas na planilha do
Laboratório Vertere, sem cadastro formal nem cálculo automático. Isso obriga o atendente a
consultar a planilha manualmente para saber o preço de cada exame e a decidir "no olho" se um
atendimento cai em horário de plantão e qual o adicional correspondente — processo sujeito a erro
e sem histórico de quando um preço mudou. Este módulo é pré-requisito direto de Atendimentos
(US20/21 do PRD: escolher exames e ter o valor calculado automaticamente).

## Solution

Um módulo `exames` com duas entidades administradas por `admin`: `Exame` (catálogo — categoria,
nome, preço-base) e `RegraPlantao` (dia da semana + faixa de horário + valor adicional). Além do
CRUD das duas entidades, o módulo expõe uma função pura `calcular_adicional_plantao` que, dado um
`datetime`, decide qual `RegraPlantao` ativa (se houver) se aplica — a lógica que a spec futura de
Atendimentos vai consumir para sugerir automaticamente o adicional de plantão (US19 do PRD), sem
reimplementar a decisão em nenhum outro lugar.

## User Stories

1. Como administrador, quero cadastrar um exame com categoria, nome e preço-base, para manter a
   tabela de preços atualizada.
2. Como administrador, quero editar categoria, nome ou preço-base de um exame existente, para
   refletir reajustes sem afetar atendimentos já registrados no passado (o snapshot de preço por
   atendimento é responsabilidade da spec de Atendimentos, não desta).
3. Como administrador, quero inativar um exame, para removê-lo da oferta corrente sem apagar o
   histórico de atendimentos que o usaram.
4. Como administrador, quero reativar um exame previamente inativado, para voltar a oferecê-lo.
5. Como qualquer usuário do sistema, quero listar os exames cadastrados (com filtro opcional por
   categoria e por ativos), para consultar a tabela de preços vigente.
6. Como administrador, quero cadastrar uma regra de adicional de plantão (dia da semana + faixa de
   horário + valor adicional), para que o sistema aplique automaticamente a cobrança correta.
7. Como administrador, quero editar ou inativar uma regra de plantão a qualquer momento, para
   ajustar preços e horários de atendimento plantonista conforme a operação do laboratório mudar.
8. Como sistema, quero calcular automaticamente, a partir de uma data/hora, qual regra de plantão
   ativa (se houver) se aplica, para sugerir o adicional correto ao registrar um atendimento
   (aplicação real do valor sugerido é escopo da spec de Atendimentos).
9. Como sistema, quero que apenas administrador possa cadastrar/editar/inativar/reativar exames e
   regras de plantão, e todos os papéis tenham acesso de leitura ao catálogo de exames — para não
   duplicar checagem de papel fora de `authorize()`.

## Implementation Decisions

- **Módulo novo**: `exames`, seguindo a mesma estrutura de pastas dos módulos anteriores
  (`domain`, `repository` via `Protocol`, `service`, `router`, `schemas`, `models.py`). Duas
  entidades no mesmo módulo (`Exame` e `RegraPlantao`) porque são coesas em torno do mesmo
  problema — precificação de exame — e a spec de Atendimentos vai consumir as duas juntas.
- **Campos de `Exame`**: `id`, `categoria` (str), `nome` (str), `preco_base` (`Decimal`), `ativo`
  (bool) — os campos de US15 do PRD. Sem campo de identificador único adicional: duas categorias
  podem ter exames de nomes parecidos, não é constraint desta spec.
- **Campos de `RegraPlantao`**: `id`, `dia_semana` (inteiro 0–6, convenção `datetime.weekday()`
  do Python: 0=segunda, 6=domingo — escolhida por ser a convenção nativa da stdlib, evitando
  tradução manual de enum na implementação), `hora_inicio` (`time`), `hora_fim` (`time`),
  `valor_adicional` (`Decimal`), `ativo` (bool).
- **Tipo monetário**: `preco_base` e `valor_adicional` são `Decimal` (Python) / `Numeric`
  (SQLAlchemy) — não `float`, para não introduzir erro de arredondamento binário em valor
  monetário que alimenta o fechamento financeiro (spec futura). Decisão tomada nesta spec por ser
  o primeiro módulo do projeto a lidar com valores monetários; specs futuras (Atendimentos,
  Financeiro) seguem a mesma convenção.
- **Janela de horário cruzando a meia-noite**: uma regra de plantão pode ter `hora_inicio >
  hora_fim` (ex: `hora_inicio=18:00`, `hora_fim=06:00`) para representar um plantão noturno que
  começa em `dia_semana` e termina no dia seguinte. Nesse caso, a janela cobre: de `hora_inicio`
  até `23:59:59` no próprio `dia_semana`, **e** de `00:00:00` até `hora_fim` no dia seguinte
  (`(dia_semana + 1) % 7`). Quando `hora_inicio <= hora_fim`, a janela é o intervalo simples
  `[hora_inicio, hora_fim)` dentro do próprio `dia_semana`. Em ambos os casos o limite superior é
  exclusivo (`hora_fim` não pertence à janela), para não sobrepor com a regra do turno seguinte
  que começaria exatamente em `hora_fim`.
- **`calcular_adicional_plantao(data_hora, regras)`**: função pura (sem repositório), recebe um
  `datetime` e a lista de `RegraPlantao` já carregada pelo chamador, e retorna a `RegraPlantao`
  cuja janela contém `data_hora` (ou `None` se nenhuma regra ativa se aplica) — retorna a entidade
  inteira, não só o valor, porque a spec de Atendimentos precisa do `id` da regra para
  rastreabilidade de qual regra gerou o adicional aplicado a um atendimento. Regras inativas
  (`ativo=False`) são ignoradas. Se mais de uma regra ativa combinar com o mesmo `data_hora`
  (sobreposição de cadastro, que esta spec não impede via constraint), a função retorna a de maior
  `valor_adicional` — desempate determinístico, decisão de código, não configurável.
- **Autorização**: reaproveita `authorize()` de S1, sem checagem de papel nova em nenhum módulo.
  - `cadastrar_exame`, `editar_exame`, `inativar_exame`, `reativar_exame`: exigem
    `authorize(papel, Acao.EXAME_GERENCIAR)`, só `admin` (US15/16/17/18 do PRD atribuem essas
    ações explicitamente ao administrador, sem mencionar atendente).
  - `cadastrar_regra_plantao`, `editar_regra_plantao`, `inativar_regra_plantao`,
    `reativar_regra_plantao`: exigem `authorize(papel, Acao.REGRA_PLANTAO_GERENCIAR)`, só `admin`.
  - `listar_exames`: exige `authorize(papel, Acao.EXAME_VER)`, concedida aos 4 papéis (mesmo
    padrão de `Acao.CLINICA_VER`/`Acao.VETERINARIO_VER` — consulta de catálogo não é dado
    financeiro agregado, não há razão do PRD para restringir).
  - `listar_regras_plantao`: exige `authorize(papel, Acao.REGRA_PLANTAO_VER)`, concedida a `admin`
    e `atendente` — só quem registra atendimento (dia a dia) precisa consultar a regra de plantão
    vigente; `tecnico` e `clinica` não têm essa necessidade no MVP (podem ganhar a permissão numa
    spec futura se surgir necessidade real).
  - `calcular_adicional_plantao` não chama `authorize()` diretamente (é função pura sem contexto
    de usuário); o endpoint HTTP que a expõe usa `Depends(exigir_acao(Acao.REGRA_PLANTAO_VER))`,
    mesma ação de listagem — sugerir o adicional é uma forma de consulta às regras.
  - Novas ações desta spec: `Acao.EXAME_GERENCIAR`, `Acao.EXAME_VER`,
    `Acao.REGRA_PLANTAO_GERENCIAR`, `Acao.REGRA_PLANTAO_VER`, adicionadas em `auth/service.py`
    seguindo o padrão de `Acao.VETERINARIO_GERENCIAR`/`Acao.VETERINARIO_VER`.
- **Inativação preserva histórico**: inativar um exame ou uma regra de plantão não apaga nem
  desvincula nenhum registro de atendimento que os tenha usado (entidade Atendimento ainda não
  existe nesta spec; decisão definida aqui para ser seguida pela spec seguinte — mesma decisão já
  tomada para Clínicas/Veterinários/Pacientes em S2/S3/S4).
- **Sem busca textual**: diferente de Clínicas/Veterinários/Pacientes, o PRD não pede busca por
  nome para Exame nem RegraPlantao nesta fase (US15-19 são só CRUD administrativo + cálculo) —
  apenas listagem com filtro opcional (`categoria`/`ativo` para Exame; nenhum filtro adicional além
  de `ativo` para RegraPlantao). Busca textual fica para quando a spec de Atendimentos precisar
  dela para o fluxo de seleção de exames.

## Testing Decisions

- Segue o padrão de `apps/api/src/vertere_api/veterinarios/service.py` (S3) e
  `pacientes/service.py` (S4): `exames/service.py` são funções puras que recebem um
  `ExameRepository`/`RegraPlantaoRepository` (Protocol) como parâmetro, testadas com uma
  implementação fake em memória — sem HTTP/DB.
- `calcular_adicional_plantao` é testada isoladamente, sem nenhum repositório (é função pura sobre
  `datetime` + `list[RegraPlantao]`), cobrindo: janela simples dentro do dia, fora da janela (antes
  e depois), janela cruzando meia-noite (instante antes da meia-noite no dia inicial, instante
  depois da meia-noite no dia seguinte, fora da janela em ambos os dias), regra inativa ignorada,
  nenhuma regra cadastrada para o dia da semana, e duas regras ativas sobrepostas (retorna a de
  maior `valor_adicional`).
- Módulo testado: `exames` (funções `cadastrar_exame`, `editar_exame`, `inativar_exame`,
  `reativar_exame`, `listar_exames`, `cadastrar_regra_plantao`, `editar_regra_plantao`,
  `inativar_regra_plantao`, `reativar_regra_plantao`, `listar_regras_plantao`,
  `calcular_adicional_plantao`), cobrindo criação válida, edição, inativação/reativação e
  listagem com filtro, para as duas entidades.
- Autorização é testada reutilizando `authorize()` de S1 diretamente (sem reimplementar teste de
  papel): um teste de integração leve na camada de router confirma que
  `authorize(papel, Acao.EXAME_GERENCIAR)`, `Acao.EXAME_VER`,
  `Acao.REGRA_PLANTAO_GERENCIAR` e `Acao.REGRA_PLANTAO_VER` são os pontos de decisão usados —
  incluindo o caso de `atendente` autorizado em `REGRA_PLANTAO_VER` mas bloqueado em
  `REGRA_PLANTAO_GERENCIAR`.

## Tasks

- [x] T1 — Domínio (`Exame`, `RegraPlantao`) e repositórios (`ExameRepository`,
      `RegraPlantaoRepository`, Protocol) com implementações fake em memória para os testes
      (User Stories: base para todas)
- [x] T2 — Testes de `calcular_adicional_plantao` (função pura, sem repositório): janela simples,
      fora da janela, janela cruzando meia-noite, regra inativa ignorada, nenhuma regra aplicável,
      regras sobrepostas (User Stories: 6, 7, 8)
- [x] T3 — Implementação de `calcular_adicional_plantao` em `exames/service.py`, fazendo os testes
      de T2 passarem (User Stories: 6, 7, 8)
- [x] T4 — Testes de `cadastrar_exame`, `editar_exame`, `inativar_exame`, `reativar_exame`,
      `listar_exames` (com filtro de categoria e de ativos) (User Stories: 1, 2, 3, 4, 5)
- [x] T5 — Implementação dessas funções em `exames/service.py`, fazendo os testes de T4 passarem
      (User Stories: 1, 2, 3, 4, 5)
- [x] T6 — Testes de `cadastrar_regra_plantao`, `editar_regra_plantao`, `inativar_regra_plantao`,
      `reativar_regra_plantao`, `listar_regras_plantao` (com filtro de ativos) (User Stories: 6, 7)
- [x] T7 — Implementação dessas funções em `exames/service.py`, fazendo os testes de T6 passarem
      (User Stories: 6, 7)
- [ ] T8 — Persistência real: modelos SQLAlchemy (`Exame`, `RegraPlantao`, `Numeric` para valores
      monetários) + migração Alembic, implementando `ExameRepository`/`RegraPlantaoRepository`
      contra PostgreSQL (User Stories: 1, 2, 3, 4, 5, 6, 7)
- [ ] T9 — Novas ações `Acao.EXAME_GERENCIAR`, `Acao.EXAME_VER`, `Acao.REGRA_PLANTAO_GERENCIAR`,
      `Acao.REGRA_PLANTAO_VER` em `auth/service.py` (`_PERMISSOES`: `EXAME_GERENCIAR` e
      `REGRA_PLANTAO_GERENCIAR` só admin; `EXAME_VER` todos os 4 papéis; `REGRA_PLANTAO_VER`
      admin + atendente) (User Stories: 9)
- [ ] T10 — Endpoints HTTP (`exames/router.py` + `schemas.py`): CRUD de exame e regra de plantão
      (via `Depends(exigir_acao(...))` nas ações correspondentes) e endpoint de sugestão de
      adicional (`calcular_adicional_plantao` sobre as regras ativas carregadas), incluindo
      mapeamento de erros de domínio (recurso inexistente → 404) (User Stories: 1, 2, 3, 4, 5, 6,
      7, 8, 9)

## Out of Scope

- Aplicação do adicional de plantão (ou do preço de exame) a um atendimento real, e o cálculo do
  valor total de um atendimento (soma de exames + adicional − desconto) — spec futura de
  Atendimentos, que consome `calcular_adicional_plantao` e o catálogo de `Exame` desta spec.
- Snapshot de preço por atendimento (US16 do PRD: editar preço não afeta atendimentos passados) —
  a garantia real dessa propriedade é responsabilidade da spec de Atendimentos (que precisa
  copiar o preço vigente no momento do atendimento, não só referenciar o `Exame` por id).
- Desconto manual em atendimento — spec de Atendimentos.
- Busca textual de exame por nome/categoria — só listagem com filtro nesta spec (ver
  "Implementation Decisions").
- Constraint de banco que impeça cadastro de regras de plantão sobrepostas — a função de cálculo
  resolve sobreposição em tempo de leitura (maior `valor_adicional`), sem bloquear o cadastro.
- Permissão de `REGRA_PLANTAO_VER` para `tecnico`/`clinica` — sem necessidade identificada no PRD
  para o MVP; se surgir, é uma "Descoberta" a registrar, não a implementar aqui.

## Further Notes

- Esta spec depende de S1 (Auth/Usuários, para `authorize()`/`exigir_acao`). Não depende de S2/S3/
  S4 (Clínicas/Veterinários/Pacientes) — `Exame` e `RegraPlantao` não referenciam clínica, ao
  contrário dos módulos anteriores.
- Ordem de specs sugerida a partir daqui (mesma de S3/S4): Exames & Precificação (esta) →
  Atendimentos → Laudos → Fechamento Financeiro → Portal da Clínica → Importação de Dados
  Históricos.

## Descobertas

## Verificação
