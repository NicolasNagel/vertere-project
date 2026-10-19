import { useCallback, useState } from 'react'
import { mensagemDeErroPadrao } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
import { useColecaoCrud } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import {
  criarRegraPlantao,
  editarRegraPlantao,
  inativarRegraPlantao,
  listarRegrasPlantao,
  reativarRegraPlantao,
} from './regrasPlantaoApi'

type CriarRegraPlantaoRequest = components['schemas']['CriarRegraPlantaoRequest']
type EditarRegraPlantaoRequest = components['schemas']['EditarRegraPlantaoRequest']

const ROTULOS_DE_CAMPO = {
  dia_semana: 'Dia da semana',
  hora_inicio: 'Horário de início',
  hora_fim: 'Horário de fim',
  valor_adicional: 'Valor adicional',
}

/** Mensagens de erro da UI para Regras de Plantão — mesmo padrão de useExames.ts. */
function mensagemDeErro(erro: ErroHttp): string {
  if (erro.status === 404) {
    return 'Regra de plantão não encontrada — pode ter sido removida por outra sessão.'
  }
  return mensagemDeErroPadrao(erro, ROTULOS_DE_CAMPO)
}

export function useRegrasPlantao() {
  const [apenasAtivos, setApenasAtivos] = useState(false)

  const carregarLista = useCallback(() => listarRegrasPlantao(apenasAtivos), [apenasAtivos])

  const { itens, carregando, erro, aviso, recarregar, criar, salvarItem, executarAcaoSobreItem } =
    useColecaoCrud(
    carregarLista,
    mensagemDeErro,
  )

  const definirApenasAtivos = useCallback((valor: boolean) => setApenasAtivos(valor), [])

  const criarComDados = useCallback(
    (dados: CriarRegraPlantaoRequest) => criar(() => criarRegraPlantao(dados)),
    [criar],
  )

  const editar = useCallback(
    (id: string, dados: EditarRegraPlantaoRequest) =>
      salvarItem(() => editarRegraPlantao(id, dados)),
    [salvarItem],
  )

  const inativar = useCallback(
    (id: string) => executarAcaoSobreItem(() => inativarRegraPlantao(id)),
    [executarAcaoSobreItem],
  )

  const reativar = useCallback(
    (id: string) => executarAcaoSobreItem(() => reativarRegraPlantao(id)),
    [executarAcaoSobreItem],
  )

  return {
    regras: itens,
    carregando,
    erro,
    aviso,
    apenasAtivos,
    definirApenasAtivos,
    recarregar,
    criar: criarComDados,
    editar,
    inativar,
    reativar,
  }
}
