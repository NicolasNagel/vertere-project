import { useCallback, useState } from 'react'
import { extrairDetalheErro } from '../api/erroApi'
import { ErroHttp } from '../api/clienteHttp'
import { useColecaoCrud } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import {
  buscarVeterinariosPorNome,
  criarVeterinario,
  editarVeterinario,
  inativarVeterinario,
  listarVeterinarios,
  reativarVeterinario,
} from './veterinariosApi'

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
  const [filtroClinicaId, setFiltroClinicaId] = useState<string | undefined>(undefined)
  const [termoBusca, setTermoBusca] = useState('')
  const [apenasAtivos, setApenasAtivos] = useState(false)

  const carregarLista = useCallback(
    () =>
      termoBusca
        ? buscarVeterinariosPorNome(termoBusca, filtroClinicaId, apenasAtivos)
        : listarVeterinarios(filtroClinicaId, apenasAtivos),
    [termoBusca, filtroClinicaId, apenasAtivos],
  )

  const { itens, carregando, erro, aviso, recarregar, criar, salvarItem, executarAcaoSobreItem } =
    useColecaoCrud(carregarLista, mensagemDeErro)

  const definirFiltroClinicaId = useCallback(
    (clinicaId: string | undefined) => setFiltroClinicaId(clinicaId),
    [],
  )
  const definirTermoBusca = useCallback((termo: string) => setTermoBusca(termo), [])
  const definirApenasAtivos = useCallback((valor: boolean) => setApenasAtivos(valor), [])

  const criarComDados = useCallback(
    (dados: CriarVeterinarioRequest) => criar(() => criarVeterinario(dados)),
    [criar],
  )

  const editar = useCallback(
    (id: string, dados: EditarVeterinarioRequest) =>
      salvarItem(() => editarVeterinario(id, dados)),
    [salvarItem],
  )

  const inativar = useCallback(
    (id: string) => executarAcaoSobreItem(() => inativarVeterinario(id)),
    [executarAcaoSobreItem],
  )

  const reativar = useCallback(
    (id: string) => executarAcaoSobreItem(() => reativarVeterinario(id)),
    [executarAcaoSobreItem],
  )

  return {
    veterinarios: itens,
    carregando,
    erro,
    aviso,
    filtroClinicaId,
    definirFiltroClinicaId,
    termoBusca,
    definirTermoBusca,
    apenasAtivos,
    definirApenasAtivos,
    recarregar,
    criar: criarComDados,
    editar,
    inativar,
    reativar,
  }
}
