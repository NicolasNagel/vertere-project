import { useCallback, useState } from 'react'
import * as armazenamentoSessao from './armazenamentoSessao'
import * as clienteAuth from './clienteAuth'

const MENSAGEM_ERRO_GENERICA = 'E-mail ou senha inválidos'

export function useSessao() {
  const [sessao, setSessao] = useState(() => armazenamentoSessao.obter())
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

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

  return {
    autenticado: sessao !== null,
    papel: sessao?.papel ?? null,
    email: sessao?.email ?? null,
    erro,
    carregando,
    login,
    sair,
  }
}
