# Data Model: Polimento das Telas Web de Cadastro (S12/S13) e Validação de Valores de Exames

Nenhuma tabela, coluna ou migração nova. Esta spec muda **regras de validação** de duas entidades
de S5 e o **estado de interface** das quatro telas de cadastro. Decisões e alternativas em
[research.md](./research.md).

## Backend (S5): regras de validação novas

Aplicadas na função de serviço (`apps/api/src/vertere_api/exames/service.py`), antes de gravar.
Ver research.md, Decisão 1.

### Exame (`cadastrar_exame`, `editar_exame`)

| Campo | Regra | Mensagem (`detail` do 422) |
|---|---|---|
| `categoria` | depois de remover espaços das pontas, não pode ser vazia | `Categoria não pode ficar vazia.` |
| `nome` | depois de remover espaços das pontas, não pode ser vazio | `Nome não pode ficar vazio.` |
| `preco_base` | `> 0` | `Preço-base deve ser maior que zero.` |

- `categoria` e `nome` são **gravados já sem os espaços das pontas** (FR-011). Espaços internos são
  preservados.
- Ordem de checagem: categoria, nome, preço-base. A primeira falha encerra e é a reportada (uma
  mensagem por vez, como o restante da API).
- `inativar_exame`/`reativar_exame` **não** validam esses campos: um registro legado inválido pode
  ser inativado e reativado (Edge Case da spec).
- `NaN`/`Infinity` já são recusados antes do service pelo tipo `Decimal` do Pydantic (o padrão do
  Pydantic v2 é `allow_inf_nan=False` para `Decimal`), com 422 em formato de lista.

### Regra de Plantão (`cadastrar_regra_plantao`, `editar_regra_plantao`)

| Campo | Regra | Mensagem (`detail` do 422) |
|---|---|---|
| `valor_adicional` | `> 0` | `Valor adicional deve ser maior que zero.` |

`dia_semana` continua sem validação de faixa: fora de escopo, ver "Descobertas" da spec.

### Exceções de domínio

| Exceção | Onde | HTTP |
|---|---|---|
| `ExameInvalido(mensagem)` | `exames/service.py` | 422, `detail` = mensagem |
| `RegraPlantaoInvalida(mensagem)` | `exames/service.py` | 422, `detail` = mensagem |

Seguem o padrão de `CrmvVazio` (S3): exceção levantada no service e convertida em `HTTPException`
422 com `detail` string no router.

## Frontend: estado e tipos

### `ResultadoAcao` (novo, `apps/web/src/api/useColecaoCrud.ts`)

```text
ResultadoAcao = { ok: true } | { ok: false; mensagem: string }
```

É o retorno de toda ação disparada por formulário (criar, editar). O formulário decide fechar ou
mostrar `mensagem` com base nele (FR-001/FR-002).

### Estado de `useColecaoCrud` (estendido)

| Campo | Tipo | Antes | Depois |
|---|---|---|---|
| `itens` | `T[]` | lista carregada | igual, **recarregada do servidor** depois de toda ação bem-sucedida (FR-013) |
| `carregando` | `boolean` | carga inicial e troca de filtro | igual; a recarga depois de uma ação **não** volta para "Carregando…" |
| `erro` | `string \| null` | erro de lista e de qualquer ação | erro de lista e de **ações de linha** (inativar, reativar, prazo de pagamento); ações de formulário devolvem o erro no `ResultadoAcao` em vez de usar este campo |
| `aviso` | `string \| null` | — | novo: `Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.` quando o item criado não volta na recarga (FR-014); limpo na próxima ação ou troca de filtro |

### Estado de formulário (`apps/web/src/ui/useEnvioFormulario.ts`, novo)

| Campo | Tipo | Significado |
|---|---|---|
| `salvando` | `boolean` | envio em andamento: bloqueia novo envio e "Cancelar" (FR-003, Edge Case) |
| `erroEnvio` | `string \| null` | mensagem do `ResultadoAcao` com falha, exibida dentro do formulário em `role="alert"` |

Os valores digitados continuam sendo estado do próprio formulário, como hoje. Como o formulário só
desmonta com sucesso ou "Cancelar", uma falha não os perde (FR-002). Reabrir uma edição cancelada
remonta o formulário a partir do item atual (cenário 5 da US1).

### Permissões de tela (`apps/web/src/autenticacao/permissoesDeTela.ts`, novo)

Espelho, no navegador, do subconjunto de `_PERMISSOES` (`apps/api/.../auth/service.py`) que as
telas de cadastro usam:

| `AcaoDeTela` | admin | atendente | tecnico | Usado em |
|---|---|---|---|---|
| `CLINICA_GERENCIAR` | ✔ | | | Clínicas: Nova, Editar, Inativar/Reativar, prazo de pagamento |
| `VETERINARIO_GERENCIAR` | ✔ | | | Veterinários: Novo, Editar, Inativar/Reativar |
| `EXAME_GERENCIAR` | ✔ | | | Catálogo de Exames: Novo, Editar, Inativar/Reativar |
| `REGRA_PLANTAO_VER` | ✔ | ✔ | | aba "Regras de Plantão" |
| `REGRA_PLANTAO_GERENCIAR` | ✔ | | | Regras de Plantão: Nova, Editar, Inativar/Reativar |

Os nomes das chaves são os mesmos do enum `Acao` do backend, para facilitar a busca cruzada.
Mudança em `_PERMISSOES` que afete uma dessas ações exige atualizar esta tabela (nota de
sincronização no arquivo, mesmo padrão de `itensDeNavegacao.ts`).

### Mensagens de erro padrão (`apps/web/src/api/erroApi.ts`, estendido)

| Situação | Mensagem |
|---|---|
| Falha sem resposta HTTP (rede, servidor desligado) | `Não foi possível falar com o servidor. Tente novamente.` (já existe desde S13) |
| HTTP ≥ 500, ou corpo que não é JSON | `Problema no servidor. Tente novamente em instantes.` |
| 422 com `detail` em lista (validação do Pydantic) | `Verifique o campo <Rótulo>: <motivo>.` por erro, unidos por espaço (ver research.md, Decisão 4) |
| Qualquer status com `detail` string | o próprio `detail` (mensagens de negócio do backend, já em PT) |
| Outro, sem `detail` utilizável | `Não foi possível concluir a operação. Tente novamente.` |

Os hooks de domínio continuam podendo trocar a mensagem por uma específica. 404 e 409 têm
significado único em cada recurso e podem ser reconhecidos pelo status (ex.: 404 → "Exame não
encontrado — …", 409 → "Já existe …"). Já o **422** tem várias origens (regra de domínio ou
validação do Pydantic) e só pode virar mensagem específica pelo **conteúdo** do `detail` string
(ex.: contém "CNPJ"). Nunca pelo status sozinho: é isso que corrige o "todo 422 vira CNPJ inválido"
da S12. O que não for reconhecido cai na mensagem padrão.
