import { useCallback, useEffect, useState } from 'react'
import { extrairDetalheErro } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'
import { criarVeterinario, listarVeterinarios } from './veterinariosApi'

type VeterinarioResponse = components['schemas']['VeterinarioResponse']
type CriarVeterinarioRequest = components['schemas']['CriarVeterinarioRequest']

/**
 * Mensagens de erro da UI para Veterinários — ver data-model.md → "Erros mapeados para mensagem
 * de UI". `CrmvVazio` e `ClinicaInexistente` são ambos 422 no backend — só se distinguem pelo
 * texto do detalhe (`extrairDetalheErro`), nunca pelo status isoladamente.
 */
function mensagemDeErro(erro: ErroHttp): string {
  const detalhe = extrairDetalheErro(erro)
  if (erro.status === 422) {
    if (detalhe.includes('CRMV')) {
      return 'Informe o CRMV do veterinário.'
    }
    return 'A clínica selecionada não existe mais — atualize a lista de clínicas.'
  }
  if (erro.status === 409) {
    return 'Já existe um veterinário cadastrado com esse CRMV.'
  }
  if (erro.status === 404) {
    return 'Veterinário não encontrado — pode ter sido removido por outra sessão.'
  }
  return detalhe
}

export function useVeterinarios() {
  const [veterinarios, setVeterinarios] = useState<VeterinarioResponse[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtroClinicaId, setFiltroClinicaId] = useState<string | undefined>(undefined)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setVeterinarios(await listarVeterinarios(filtroClinicaId, false))
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp) {
        setErro(mensagemDeErro(erroRequisicao))
      }
    } finally {
      setCarregando(false)
    }
  }, [filtroClinicaId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const definirFiltroClinicaId = useCallback((clinicaId: string | undefined) => {
    setFiltroClinicaId(clinicaId)
  }, [])

  const criar = useCallback(async (dados: CriarVeterinarioRequest) => {
    setErro(null)
    try {
      const veterinario = await criarVeterinario(dados)
      setVeterinarios((atual) => [...atual, veterinario])
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp) {
        setErro(mensagemDeErro(erroRequisicao))
      }
    }
  }, [])

  return { veterinarios, carregando, erro, filtroClinicaId, definirFiltroClinicaId, recarregar, criar }
}
