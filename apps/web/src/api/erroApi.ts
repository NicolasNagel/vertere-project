import type { ErroHttp } from './clienteHttp'

/**
 * FastAPI devolve `{"detail": "<mensagem>"}` em toda `HTTPException` (ver `apps/api`). `ErroHttp`
 * guarda o corpo bruto em `message` (via `resposta.text()` em `clienteHttp.ts`) — esta função
 * extrai o `detail` para os módulos de domínio distinguirem os erros de `data-model.md`.
 */
export function extrairDetalheErro(erro: ErroHttp): string {
  try {
    const corpo = JSON.parse(erro.message) as { detail?: unknown }
    if (typeof corpo.detail === 'string') {
      return corpo.detail
    }
  } catch {
    // corpo não é JSON válido — cai para a mensagem original abaixo
  }
  return erro.message
}

const MENSAGEM_SERVIDOR = 'Problema no servidor. Tente novamente em instantes.'
const MENSAGEM_OPERACAO = 'Não foi possível concluir a operação. Tente novamente.'

interface ErroDeValidacao {
  loc?: unknown[]
  type?: string
  ctx?: { gt?: unknown }
}

/** Motivo em português para o `type` de um erro de validação do Pydantic v2. */
function motivoDeValidacao(item: ErroDeValidacao): string {
  switch (item.type) {
    case 'missing':
      return 'preenchimento obrigatório'
    case 'greater_than':
      return `deve ser maior que ${String(item.ctx?.gt)}`
    case 'string_too_short':
      return 'não pode ficar vazio'
    case 'decimal_parsing':
    case 'float_parsing':
    case 'int_parsing':
      return 'precisa ser um número'
    case 'time_parsing':
      return 'horário inválido'
    default:
      return 'valor inválido'
  }
}

/**
 * Mensagem compreensível para qualquer `ErroHttp`, sem JSON nem texto técnico (S14, FR-006/FR-007).
 * `rotulosDeCampo` traduz o nome do campo de um 422 do Pydantic (último elemento de `loc`) para o
 * rótulo que a tela mostra. Os hooks de domínio trocam por mensagens próprias só os casos que
 * reconhecem; o resto cai aqui (ver specs/014-polimento-telas-web/research.md, Decisão 4).
 */
export function mensagemDeErroPadrao(
  erro: ErroHttp,
  rotulosDeCampo: Record<string, string> = {},
): string {
  if (erro.status >= 500) {
    return MENSAGEM_SERVIDOR
  }
  let corpo: { detail?: unknown }
  try {
    corpo = JSON.parse(erro.message) as { detail?: unknown }
  } catch {
    return MENSAGEM_SERVIDOR
  }
  if (typeof corpo.detail === 'string') {
    return corpo.detail
  }
  if (Array.isArray(corpo.detail) && corpo.detail.length > 0) {
    return (corpo.detail as ErroDeValidacao[])
      .map((item) => {
        const campo = String(item.loc?.at(-1) ?? '')
        const rotulo = rotulosDeCampo[campo] ?? 'informado'
        return `Verifique o campo ${rotulo}: ${motivoDeValidacao(item)}.`
      })
      .join(' ')
  }
  return MENSAGEM_OPERACAO
}
