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
