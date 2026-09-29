import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'

type ExameResponse = components['schemas']['ExameResponse']
type CriarExameRequest = components['schemas']['CriarExameRequest']

function comCategoria(query: string, categoria?: string): string {
  return categoria ? `${query}&categoria=${encodeURIComponent(categoria)}` : query
}

export function listarExames(categoria?: string, apenasAtivos = false): Promise<ExameResponse[]> {
  return requisitar<ExameResponse[]>(comCategoria(`/exames?apenas_ativos=${apenasAtivos}`, categoria))
}

export function criarExame(dados: CriarExameRequest): Promise<ExameResponse> {
  return requisitar<ExameResponse>('/exames', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}
