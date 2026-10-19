# Contrato interno do frontend: interfaces compartilhadas

Esta spec não expõe interface nova a terceiros no frontend. Este arquivo fixa as **assinaturas
compartilhadas** que as quatro telas passam a usar, para que `tasks.md` e os testes partam do mesmo
contrato. Os nomes são definitivos; os corpos ficam para a implementação.

## `api/useColecaoCrud.ts`

```ts
type ResultadoAcao = { ok: true } | { ok: false; mensagem: string }

function useColecaoCrud<T extends { id: string }>(
  carregarLista: () => Promise<T[]>,
  mensagemDeErro: (erro: ErroHttp) => string,
): {
  itens: T[]
  carregando: boolean
  erro: string | null      // erro de lista e de ações de linha
  aviso: string | null     // FR-014
  recarregar: () => Promise<void>
  /** Ação de formulário: cria, recarrega a lista, devolve o resultado. Não preenche `erro`. */
  criar: (acao: () => Promise<T>) => Promise<ResultadoAcao>
  /** Ação de formulário: edita, recarrega a lista, devolve o resultado. Não preenche `erro`. */
  salvarItem: (acao: () => Promise<T>) => Promise<ResultadoAcao>
  /** Ação de linha (inativar, reativar, prazo): executa, recarrega, e em falha preenche `erro`. */
  executarAcaoSobreItem: (acao: () => Promise<T>) => Promise<void>
}
```

Mudança em relação à S13: `criar` deixa de preencher `erro` e passa a devolver `ResultadoAcao`; a
edição por formulário sai de `executarAcaoSobreItem` e vai para `salvarItem`; toda ação
bem-sucedida recarrega a lista do servidor (research.md, Decisão 3).

Os hooks de domínio (`useClinicas`, `useVeterinarios`, `useExames`, `useRegrasPlantao`) passam
todos a ser construídos sobre ele (retrofit de S12, research.md, Decisão 3) e expõem:
`criar(dados) => Promise<ResultadoAcao>`, `editar(id, dados) => Promise<ResultadoAcao>`, e
`inativar`/`reativar`/(`definirPrazoPagamento`) `=> Promise<void>`. Também mantêm os filtros que
já expõem hoje e repassam `aviso`.

## `ui/useEnvioFormulario.ts`

```ts
function useEnvioFormulario(
  aoSalvar: () => Promise<ResultadoAcao>,
  aoFechar: () => void,
): {
  salvando: boolean
  erroEnvio: string | null
  enviar: () => Promise<void>   // ignora chamadas enquanto `salvando`; em ok, chama `aoFechar`
}
```

## Props dos quatro formulários

`FormularioClinica`, `FormularioVeterinario`, `FormularioExame`, `FormularioRegraPlantao`:

```ts
aoSalvar: (dados: <CriarXRequest>) => Promise<ResultadoAcao>   // era `=> void`
aoFechar: () => void                                         // novo: sucesso ou "Cancelar"
```

Cada formulário renderiza "Salvar" e "Cancelar", desabilitados enquanto `salvando`, e mostra
`erroEnvio` em `role="alert"`, no mesmo lugar onde `FormularioExame`/`FormularioRegraPlantao` já
mostram a validação local de valor positivo.

## `api/erroApi.ts`

```ts
function mensagemDeErroPadrao(erro: ErroHttp, rotulosDeCampo?: Record<string, string>): string
```

`rotulosDeCampo` traduz o último elemento de `loc` de um 422 do Pydantic para o rótulo mostrado na
tela (ex.: `{ preco_base: 'Preço-base' }`). `extrairDetalheErro` continua existindo para os hooks
reconhecerem mensagens de domínio pelo texto.

## `autenticacao/permissoesDeTela.ts`

```ts
type AcaoDeTela =
  | 'CLINICA_GERENCIAR' | 'VETERINARIO_GERENCIAR' | 'EXAME_GERENCIAR'
  | 'REGRA_PLANTAO_VER' | 'REGRA_PLANTAO_GERENCIAR'

function podeExecutar(papel: Papel, acao: AcaoDeTela): boolean
```

Nenhuma tela compara `papel === '...'` diretamente depois desta spec (FR-016).

## `ui/formatacao.ts`

```ts
function formatarMoeda(valor: string | number): string   // "R$ 1.234,50"
```

Só para exibição. Nenhum cálculo sobre o valor no frontend (Princípio I).
