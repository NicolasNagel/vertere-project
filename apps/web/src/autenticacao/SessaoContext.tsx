import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { definirHandlerNaoAutorizado } from '../api/clienteHttp'
import type { Papel } from '../tipos'
import * as armazenamentoSessao from './armazenamentoSessao'
import * as clienteAuth from './clienteAuth'

const MENSAGEM_ERRO_GENERICA = 'E-mail ou senha inválidos'
const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Faça login novamente.'

interface ContextoSessao {
  autenticado: boolean
  papel: Papel | null
  email: string | null
  erro: string | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<void>
  sair: () => void
}

const SessaoContext = createContext<ContextoSessao | null>(null)

/**
 * Estado de sessão compartilhado pela árvore inteira — não um hook independente por componente.
 * Isto existe porque o handler de "sessão expirada" (US3) é global (`clienteHttp` só conhece um
 * `aoReceberNaoAutorizado` por vez): se cada componente tivesse seu próprio `useState` de sessão
 * (como numa primeira versão desta spec), limpar a sessão a partir desse handler não notificaria
 * os componentes já montados, cada um com seu estado local desatualizado.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState(() => armazenamentoSessao.obter())
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    definirHandlerNaoAutorizado(() => {
      armazenamentoSessao.limpar()
      setSessao(null)
      setErro(MENSAGEM_SESSAO_EXPIRADA)
    })
    return () => definirHandlerNaoAutorizado(null)
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    setErro(null)
    setCarregando(true)
    try {
      const nova = await clienteAuth.login(email, senha)
      armazenamentoSessao.salvar(nova)
      setSessao(nova)
    } catch {
      // Mensagem genérica sempre — não distingue e-mail inexistente, senha errada ou conta
      // inativa, mesmo comportamento de `AutenticacaoInvalida` no backend (spec.md, US1).
      setErro(MENSAGEM_ERRO_GENERICA)
    } finally {
      setCarregando(false)
    }
  }, [])

  const sair = useCallback(() => {
    armazenamentoSessao.limpar()
    setSessao(null)
  }, [])

  const valor: ContextoSessao = {
    autenticado: sessao !== null,
    papel: sessao?.papel ?? null,
    email: sessao?.email ?? null,
    erro,
    carregando,
    login,
    sair,
  }

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}

export function useSessao(): ContextoSessao {
  const contexto = useContext(SessaoContext)
  if (!contexto) {
    throw new Error('useSessao precisa ser usado dentro de <SessaoProvider>')
  }
  return contexto
}
