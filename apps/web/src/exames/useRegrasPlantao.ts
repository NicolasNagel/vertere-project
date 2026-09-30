import { useCallback, useState } from 'react'
import { extrairDetalheErro } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
import { useColecaoCrud } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import { criarRegraPlantao, listarRegrasPlantao } from './regrasPlantaoApi'

type RegraPlantaoResponse = components['schemas']['RegraPlantaoResponse']
type CriarRegraPlantaoRequest = components['schemas']['CriarRegraPlantaoRequest']

/** Mensagens de erro da UI para Regras de Plantão — mesmo padrão de useExames.ts. */
function mensagemDeErro(erro: ErroHttp): string {
  if (erro.status === 404) {
    return 'Regra de plantão não encontrada — pode ter sido removida por outra sessão.'
  }
  return extrairDetalheErro(erro)
}

export function useRegrasPlantao() {
  const [apenasAtivos, setApenasAtivos] = useState(false)

  const carregarLista = useCallback(() => listarRegrasPlantao(apenasAtivos), [apenasAtivos])

  const { itens, carregando, erro, recarregar, criar } = useColecaoCrud(
    carregarLista,
    mensagemDeErro,
  )

  const definirApenasAtivos = useCallback((valor: boolean) => setApenasAtivos(valor), [])

  const criarComDados = useCallback(
    (dados: CriarRegraPlantaoRequest) => criar(() => criarRegraPlantao(dados)),
    [criar],
  )

  return {
    regras: itens as RegraPlantaoResponse[],
    carregando,
    erro,
    apenasAtivos,
    definirApenasAtivos,
    recarregar,
    criar: criarComDados,
  }
}
