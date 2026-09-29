import { useCallback, useEffect, useState } from 'react'
import { extrairDetalheErro } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'
import { criarClinica, listarClinicas } from './clinicasApi'

type ClinicaResponse = components['schemas']['ClinicaResponse']
type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']

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

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setClinicas(await listarClinicas())
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp) {
        setErro(mensagemDeErro(erroRequisicao))
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

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

  return { clinicas, carregando, erro, recarregar, criar }
}
