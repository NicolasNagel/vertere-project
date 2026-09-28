import { obter } from '../autenticacao/armazenamentoSessao'

const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ErroHttp extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let aoReceberNaoAutorizado: (() => void) | null = null

/**
 * Registra o handler de "sessão expirada" (US3) — conectado por `useSessao`/`App.tsx`, não aqui.
 * `clienteHttp` só sabe que existe um handler a chamar; a decisão do que fazer é de quem o registra.
 */
export function definirHandlerNaoAutorizado(handler: (() => void) | null): void {
  aoReceberNaoAutorizado = handler
}

export interface OpcoesRequisicao extends RequestInit {}

/**
 * `fetch` fino que injeta `Authorization: Bearer <token>` quando há sessão, e reporta `401` ao
 * handler de sessão expirada — mas só quando a própria requisição enviou um token (uma falha de
 * login sem sessão prévia é responsabilidade de quem chama `POST /auth/login`, não um evento de
 * "sessão expirada": ver US1 vs. US3 em spec.md).
 *
 * `tokenSubstituto` existe só para `clienteAuth.login`: o token acabou de ser emitido por
 * `POST /auth/login` e ainda não está salvo em `armazenamentoSessao` quando `GET /auth/me` precisa
 * dele — nenhum outro chamador deveria precisar disso.
 */
export async function requisitar<T>(
  caminho: string,
  opcoes: OpcoesRequisicao = {},
  tokenSubstituto?: string,
): Promise<T> {
  const sessao = obter()
  const token = tokenSubstituto ?? sessao?.token
  const cabecalhos = new Headers(opcoes.headers)
  if (token) {
    cabecalhos.set('Authorization', `Bearer ${token}`)
  }
  if (opcoes.body && !cabecalhos.has('Content-Type')) {
    cabecalhos.set('Content-Type', 'application/json')
  }

  const resposta = await fetch(`${URL_BASE}${caminho}`, { ...opcoes, headers: cabecalhos })

  if (resposta.status === 401) {
    if (token) {
      aoReceberNaoAutorizado?.()
    }
    throw new ErroHttp(resposta.status, await resposta.text())
  }
  if (!resposta.ok) {
    throw new ErroHttp(resposta.status, await resposta.text())
  }
  if (resposta.status === 204) {
    return undefined as T
  }
  return (await resposta.json()) as T
}
