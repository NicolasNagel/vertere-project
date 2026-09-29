import { useCallback, useState } from 'react'
import { extrairDetalheErro } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
import { useColecaoCrud } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import { criarExame, listarExames } from './examesApi'

type ExameResponse = components['schemas']['ExameResponse']
type CriarExameRequest = components['schemas']['CriarExameRequest']

/** Mensagens de erro da UI para Exames — ver data-model.md → "Achado de verificação do backend". */
function mensagemDeErro(erro: ErroHttp): string {
  if (erro.status === 404) {
    return 'Exame não encontrado — pode ter sido removido por outra sessão.'
  }
  return extrairDetalheErro(erro)
}

export function useExames() {
  const [categoria, setCategoria] = useState<string | undefined>(undefined)
  const [apenasAtivos, setApenasAtivos] = useState(false)

  const carregarLista = useCallback(() => listarExames(categoria, apenasAtivos), [categoria, apenasAtivos])

  const { itens, carregando, erro, recarregar, criar } = useColecaoCrud(carregarLista, mensagemDeErro)

  const definirCategoria = useCallback((valor: string | undefined) => setCategoria(valor), [])
  const definirApenasAtivos = useCallback((valor: boolean) => setApenasAtivos(valor), [])

  const criarComDados = useCallback(
    (dados: CriarExameRequest) => criar(() => criarExame(dados)),
    [criar],
  )

  return {
    exames: itens as ExameResponse[],
    carregando,
    erro,
    categoria,
    definirCategoria,
    apenasAtivos,
    definirApenasAtivos,
    recarregar,
    criar: criarComDados,
  }
}
