import { useCallback, useEffect, useState } from 'react'
import { extrairDetalheErro } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
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

type ClinicaResponse = components['schemas']['ClinicaResponse']
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
  const [clinicas, setClinicas] = useState<ClinicaResponse[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [apenasAtivas, setApenasAtivas] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setClinicas(
        termoBusca
          ? await buscarClinicasPorNome(termoBusca, apenasAtivas)
          : await listarClinicas(apenasAtivas),
      )
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp) {
        setErro(mensagemDeErro(erroRequisicao))
      }
    } finally {
      setCarregando(false)
    }
  }, [termoBusca, apenasAtivas])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const definirTermoBusca = useCallback((termo: string) => setTermoBusca(termo), [])
  const definirApenasAtivas = useCallback((valor: boolean) => setApenasAtivas(valor), [])

  const criar = useCallback(async (dados: CriarClinicaRequest) => {
    setErro(null)
    try {
      const clinica = await criarClinica(dados)
      setClinicas((atual) => [...atual, clinica])
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp) {
        setErro(mensagemDeErro(erroRequisicao))
      }
    }
  }, [])

  function substituirNoEstado(clinica: ClinicaResponse) {
    setClinicas((atual) => atual.map((c) => (c.id === clinica.id ? clinica : c)))
  }

  async function executarAcaoSobreClinica(acao: () => Promise<ClinicaResponse>) {
    setErro(null)
    try {
      substituirNoEstado(await acao())
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp) {
        setErro(mensagemDeErro(erroRequisicao))
      }
    }
  }

  const editar = useCallback(
    (id: string, dados: EditarClinicaRequest) =>
      executarAcaoSobreClinica(() => editarClinica(id, dados)),
    [],
  )

  const inativar = useCallback(
    (id: string) => executarAcaoSobreClinica(() => inativarClinica(id)),
    [],
  )

  const reativar = useCallback(
    (id: string) => executarAcaoSobreClinica(() => reativarClinica(id)),
    [],
  )

  const definirPrazoPagamento = useCallback(
    (id: string, prazoPagamentoDias: number | null) =>
      executarAcaoSobreClinica(() => definirPrazoPagamentoApi(id, prazoPagamentoDias)),
    [],
  )

  return {
    clinicas,
    carregando,
    erro,
    termoBusca,
    definirTermoBusca,
    apenasAtivas,
    definirApenasAtivas,
    recarregar,
    criar,
    editar,
    inativar,
    reativar,
    definirPrazoPagamento,
  }
}
