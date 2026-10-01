# Contrato HTTP: validação de Exames e Regras de Plantão (mudança em S5)

Única mudança de contrato HTTP desta spec. Os caminhos, os schemas de request/response e as
permissões (`Acao.EXAME_GERENCIAR`, `Acao.REGRA_PLANTAO_GERENCIAR`) **não mudam**. Mudam só os
casos que passam a ser recusados e o que é gravado.

## `POST /exames` e `PATCH /exames/{exame_id}`

Request inalterado: `{ "categoria": str, "nome": str, "preco_base": Decimal }`.

| Caso | Antes | Depois |
|---|---|---|
| `preco_base <= 0` | 201/200, gravado | **422** `{"detail": "Preço-base deve ser maior que zero."}`, nada gravado |
| `categoria` vazia ou só espaços | 201/200, gravado | **422** `{"detail": "Categoria não pode ficar vazia."}`, nada gravado |
| `nome` vazio ou só espaços | 201/200, gravado | **422** `{"detail": "Nome não pode ficar vazio."}`, nada gravado |
| `categoria`/`nome` com espaços nas pontas | gravado como enviado | gravado **sem** os espaços das pontas; a resposta já traz o valor limpo |
| `preco_base` não numérico, `NaN`, campo ausente | 422 do Pydantic (`detail` lista) | inalterado |
| `PATCH` de id inexistente, com dados válidos | 404 | inalterado |
| `PATCH` de id inexistente, com dados inválidos | 404 | **422** (ver nota) |

Nota de ordem no `PATCH`: a validação dos dados roda **antes** da busca do exame. Um `PATCH` com
dados inválidos para um id inexistente devolve 422, não 404. Isso evita uma consulta ao banco para
um pedido que seria recusado de qualquer forma, e não muda nenhum caso válido.

## `POST /regras-plantao` e `PATCH /regras-plantao/{regra_id}`

Request inalterado: `{ "dia_semana": int, "hora_inicio": time, "hora_fim": time, "valor_adicional": Decimal }`.

| Caso | Antes | Depois |
|---|---|---|
| `valor_adicional <= 0` | 201/200, gravado | **422** `{"detail": "Valor adicional deve ser maior que zero."}`, nada gravado |
| `hora_inicio > hora_fim` (cruza a meia-noite) | aceito | inalterado (aceito) |
| `dia_semana` fora de 0-6 | aceito | inalterado (fora de escopo, ver "Descobertas") |

## Não muda

- `POST /exames/{id}/inativar`, `/reativar` e os equivalentes de regra de plantão: não validam
  preço nem texto, então um registro legado inválido continua podendo ser inativado e reativado.
- `GET /exames`, `GET /regras-plantao` e o cálculo de adicional de plantão.
- `tipos.gerados.ts` (frontend): os schemas OpenAPI não mudam, porque a validação vive no service e
  não em `Field(...)`. Não é preciso rodar `pnpm gerar-tipos-api`.
