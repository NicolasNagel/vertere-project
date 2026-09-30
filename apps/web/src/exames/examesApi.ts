import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'

type ExameResponse = components['schemas']['ExameResponse']
type CriarExameRequest = components['schemas']['CriarExameRequest']
type EditarExameRequest = components['schemas']['EditarExameRequest']

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

export function editarExame(id: string, dados: EditarExameRequest): Promise<ExameResponse> {
  return requisitar<ExameResponse>(`/exames/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  })
}

export function inativarExame(id: string): Promise<ExameResponse> {
  return requisitar<ExameResponse>(`/exames/${id}/inativar`, { method: 'POST' })
}

export function reativarExame(id: string): Promise<ExameResponse> {
  return requisitar<ExameResponse>(`/exames/${id}/reativar`, { method: 'POST' })
}
