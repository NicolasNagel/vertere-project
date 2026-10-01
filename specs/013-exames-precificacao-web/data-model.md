# Data Model: Tela de Exames & Precificação (Web)

Nenhuma entidade nova de persistência — este arquivo documenta apenas a forma dos dados como o
frontend os consome, já definida pelo backend (S5) e espelhada em `apps/web/src/api/tipos.gerados.ts`.

## Exame

Fonte: `components["schemas"]["ExameResponse"]` (leitura), `CriarExameRequest` (criação),
`EditarExameRequest` (edição) — já gerados em `tipos.gerados.ts`.

| Campo | Tipo (frontend) | Editável na tela | Observações |
|-------|------------------|-------------------|-------------|
| `id` | `string` | não | usado só para ações (editar/inativar/reativar), não exibido como coluna |
| `categoria` | `string` | sim (`admin`) | também usado como filtro de listagem |
| `nome` | `string` | sim (`admin`) | |
| `preco_base` | `string` (decimal serializado; `number \| string` na request) | sim (`admin`) | tratar como string monetária na exibição; validar > 0 no formulário antes de enviar |
| `ativo` | `boolean` | não editável direto — via ações inativar/reativar | determina o rótulo de status na lista |

**Validação no formulário**: `categoria` e `nome` não vazios; `preco_base` numérico e maior que
zero. **Achado de verificação do backend (S5)**: `CriarExameRequest`/`EditarExameRequest`
(`apps/api/src/vertere_api/exames/schemas.py`) não têm nenhuma constraint Pydantic sobre
`preco_base` (sem `gt=0`) nem sobre `categoria`/`nome` vazios — o backend aceita esses valores sem
rejeitar. Esta validação é, portanto, **só de frontend** nesta spec, não uma dupla-checagem de algo
que o backend também garante. Corrigir o schema do backend está fora do escopo desta spec (frontend
puro, S5 já `entregue`) — registrado como nota em "Descobertas" de `spec.md` para decisão do
usuário, não implementado aqui.

**Transições de estado**: `ativo: true ⇄ false` via `POST /exames/{id}/inativar` e
`POST /exames/{id}/reativar` — nunca exclusão (mesma decisão de S5/S12).

## Regra de Plantão (`RegraPlantao`)

Fonte: `components["schemas"]["RegraPlantaoResponse"]` (leitura), `CriarRegraPlantaoRequest`
(criação), `EditarRegraPlantaoRequest` (edição) — já gerados em `tipos.gerados.ts`.

| Campo | Tipo (frontend) | Editável na tela | Observações |
|-------|------------------|-------------------|-------------|
| `id` | `string` | não | usado só para ações |
| `dia_semana` | `number` (0–6, convenção `datetime.weekday()`: 0=segunda, 6=domingo) | sim (`admin`) | exibir como nome do dia em português, não o número |
| `hora_inicio` | `string` (formato `time`, ex: `"18:00:00"`) | sim (`admin`) | usar `<input type="time">` ou equivalente |
| `hora_fim` | `string` (formato `time`) | sim (`admin`) | pode ser menor que `hora_inicio` (plantão cruzando meia-noite) — **não validar `hora_fim > hora_inicio`** no formulário, o backend já aceita e trata esse caso |
| `valor_adicional` | `string` (decimal serializado; `number \| string` na request) | sim (`admin`) | validar > 0 no formulário |
| `ativo` | `boolean` | não editável direto — via ações inativar/reativar | determina o rótulo de status na lista |

**Validação no formulário**: `dia_semana` selecionado (0–6); `hora_inicio`/`hora_fim` preenchidos
(formato válido de horário); `valor_adicional` numérico e maior que zero. **Sem** validação de
ordem entre `hora_inicio`/`hora_fim`. Mesmo achado da tabela de `Exame` acima: `valor_adicional`
também não tem `gt=0` no schema do backend — validação só de frontend.

**Transições de estado**: `ativo: true ⇄ false` via `POST /regras-plantao/{id}/inativar` e
`POST /regras-plantao/{id}/reativar` — nunca exclusão.

## Relação entre as entidades

Sem relação direta de dados entre `Exame` e `RegraPlantao` — cada uma é independente na tela e na
API (duas listas, dois formulários, dois hooks). Elas compartilham apenas a mesma seção de
navegação (`/exames`) e o mesmo padrão de hook de suporte (ver `research.md`, Decisão 3).

## Visibilidade por papel (não é campo de dado, é regra de apresentação)

| Ação | `admin` | `atendente` | `tecnico` |
|------|---------|-------------|-----------|
| Ver lista de Exame | sim | sim | sim |
| Cadastrar/editar/inativar/reativar Exame | sim | não | não |
| Ver lista de Regra de Plantão | sim | sim | **não** |
| Cadastrar/editar/inativar/reativar Regra de Plantão | sim | não | não |

Espelha `Acao.EXAME_VER` (todos os 3 papéis de staff), `Acao.EXAME_GERENCIAR` (só admin),
`Acao.REGRA_PLANTAO_VER` (admin + atendente) e `Acao.REGRA_PLANTAO_GERENCIAR` (só admin), já
definidas em `auth/service.py` (S5) — tabela documentada aqui só para referência de implementação
da UI, a decisão real continua no backend.
