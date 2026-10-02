import { useCallback, useState } from 'react'
import { extrairDetalheErro, mensagemDeErroPadrao } from '../api/erroApi'
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

const ROTULOS_DE_CAMPO = {
  nome: 'Nome',
  cnpj: 'CNPJ',
  endereco: 'Endereço',
  telefone: 'Telefone',
  email: 'E-mail',
}

/**
 * Mensagens de erro da UI para Clínicas. O 422 tem duas origens (regra de CNPJ do service ou
 * validação do Pydantic, ex.: e-mail), então só vira a mensagem de CNPJ quando o detalhe fala de
 * CNPJ; o resto cai em `mensagemDeErroPadrao` (S14, FR-006).
 */
function mensagemDeErro(erro: ErroHttp): string {
  if (erro.status === 422 && extrairDetalheErro(erro).includes('CNPJ')) {
    return 'CNPJ inválido — verifique o formato informado.'
  }
  if (erro.status === 409) {
    return 'Já existe uma clínica cadastrada com esse CNPJ.'
  }
  if (erro.status === 404) {
    return 'Clínica não encontrada — pode ter sido removida por outra sessão.'
  }
  return mensagemDeErroPadrao(erro, ROTULOS_DE_CAMPO)
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
