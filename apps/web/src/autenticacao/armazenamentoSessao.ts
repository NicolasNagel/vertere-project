import type { SessaoUsuario } from '../tipos'

const CHAVE_SESSAO = 'vertere:sessao'

/**
 * `sessionStorage`, não `localStorage` — decisão de segurança registrada em research.md: encerra
 * automaticamente ao fechar a aba/navegador, reduzindo a janela de um token vazado continuar
 * válido indefinidamente.
 */
export function obter(): SessaoUsuario | null {
  const bruto = sessionStorage.getItem(CHAVE_SESSAO)
  if (!bruto) return null
  try {
    return JSON.parse(bruto) as SessaoUsuario
  } catch {
    return null
  }
}

export function salvar(sessao: SessaoUsuario): void {
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
}

export function limpar(): void {
  sessionStorage.removeItem(CHAVE_SESSAO)
}
