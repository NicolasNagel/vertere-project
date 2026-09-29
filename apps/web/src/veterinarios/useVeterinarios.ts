import { useCallback, useEffect, useState } from 'react'
import { extrairDetalheErro } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'
import {
  buscarVeterinariosPorNome,
  criarVeterinario,
  editarVeterinario,
  inativarVeterinario,
  listarVeterinarios,
  reativarVeterinario,
} from './veterinariosApi'

type VeterinarioResponse = components['schemas']['VeterinarioResponse']
type CriarVeterinarioRequest = components['schemas']['CriarVeterinarioRequest']
type EditarVeterinarioRequest = components['schemas']['EditarVeterinarioRequest']

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
  const [termoBusca, setTermoBusca] = useState('')
  const [apenasAtivos, setApenasAtivos] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setVeterinarios(
        termoBusca
          ? await buscarVeterinariosPorNome(termoBusca, filtroClinicaId, apenasAtivos)
          : await listarVeterinarios(filtroClinicaId, apenasAtivos),
      )
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp) {
        setErro(mensagemDeErro(erroRequisicao))
      }
    } finally {
      setCarregando(false)
    }
  }, [filtroClinicaId, termoBusca, apenasAtivos])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const definirFiltroClinicaId = useCallback((clinicaId: string | undefined) => {
    setFiltroClinicaId(clinicaId)
  }, [])

  const definirTermoBusca = useCallback((termo: string) => setTermoBusca(termo), [])
  const definirApenasAtivos = useCallback((valor: boolean) => setApenasAtivos(valor), [])

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

  function substituirNoEstado(veterinario: VeterinarioResponse) {
    setVeterinarios((atual) => atual.map((v) => (v.id === veterinario.id ? veterinario : v)))
  }

  async function executarAcaoSobreVeterinario(acao: () => Promise<VeterinarioResponse>) {
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
    (id: string, dados: EditarVeterinarioRequest) =>
      executarAcaoSobreVeterinario(() => editarVeterinario(id, dados)),
    [],
  )

  const inativar = useCallback(
    (id: string) => executarAcaoSobreVeterinario(() => inativarVeterinario(id)),
    [],
  )

  const reativar = useCallback(
    (id: string) => executarAcaoSobreVeterinario(() => reativarVeterinario(id)),
    [],
  )

  return {
    veterinarios,
    carregando,
    erro,
    filtroClinicaId,
    definirFiltroClinicaId,
    termoBusca,
    definirTermoBusca,
    apenasAtivos,
    definirApenasAtivos,
    recarregar,
    criar,
    editar,
    inativar,
    reativar,
  }
}
