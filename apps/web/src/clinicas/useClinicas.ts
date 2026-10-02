import { useCallback, useState } from 'react'
import { extrairDetalheErro } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
import { useColecaoCrud } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import {
  buscarClinicasPorNome,
  criarClinica,
  definirPrazoPagamento as definirPrazoPagamentoApi,
  editarClinica,
  inativarClinica,
  listarClinicas,
  reativarClinica,
} from './clinicasApi'

type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']
type EditarClinicaRequest = components['schemas']['EditarClinicaRequest']

/** Mensagens de erro da UI para Clínicas — ver data-model.md → "Erros mapeados para mensagem de UI". */
function mensagemDeErro(erro: ErroHttp): string {
  const detalhe = extrairDetalheErro(erro)
  if (erro.status === 422) {
    return 'CNPJ inválido — verifique o formato informado.'
  }
  if (erro.status === 409) {
    return 'Já existe uma clínica cadastrada com esse CNPJ.'
  }
  if (erro.status === 404) {
    return 'Clínica não encontrada — pode ter sido removida por outra sessão.'
  }
  return detalhe
}

export function useClinicas() {
  const [termoBusca, setTermoBusca] = useState('')
  const [apenasAtivas, setApenasAtivas] = useState(false)

  const carregarLista = useCallback(
    () =>
      termoBusca ? buscarClinicasPorNome(termoBusca, apenasAtivas) : listarClinicas(apenasAtivas),
    [termoBusca, apenasAtivas],
  )

  const { itens, carregando, erro, aviso, recarregar, criar, salvarItem, executarAcaoSobreItem } =
    useColecaoCrud(carregarLista, mensagemDeErro)

  const definirTermoBusca = useCallback((termo: string) => setTermoBusca(termo), [])
  const definirApenasAtivas = useCallback((valor: boolean) => setApenasAtivas(valor), [])

  const criarComDados = useCallback(
    (dados: CriarClinicaRequest) => criar(() => criarClinica(dados)),
    [criar],
  )

  const editar = useCallback(
    (id: string, dados: EditarClinicaRequest) => salvarItem(() => editarClinica(id, dados)),
    [salvarItem],
  )

  const inativar = useCallback(
    (id: string) => executarAcaoSobreItem(() => inativarClinica(id)),
    [executarAcaoSobreItem],
  )

  const reativar = useCallback(
    (id: string) => executarAcaoSobreItem(() => reativarClinica(id)),
    [executarAcaoSobreItem],
  )

  const definirPrazoPagamento = useCallback(
    (id: string, prazoPagamentoDias: number | null) =>
      executarAcaoSobreItem(() => definirPrazoPagamentoApi(id, prazoPagamentoDias)),
    [executarAcaoSobreItem],
  )

  return {
    clinicas: itens,
    carregando,
    erro,
    aviso,
    termoBusca,
    definirTermoBusca,
    apenasAtivas,
    definirApenasAtivas,
    recarregar,
    criar: criarComDados,
    editar,
    inativar,
    reativar,
    definirPrazoPagamento,
  }
}
