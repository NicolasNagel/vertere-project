import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'

type RegraPlantaoResponse = components['schemas']['RegraPlantaoResponse']
type CriarRegraPlantaoRequest = components['schemas']['CriarRegraPlantaoRequest']
type EditarRegraPlantaoRequest = components['schemas']['EditarRegraPlantaoRequest']

export function listarRegrasPlantao(apenasAtivos = false): Promise<RegraPlantaoResponse[]> {
  return requisitar<RegraPlantaoResponse[]>(`/regras-plantao?apenas_ativos=${apenasAtivos}`)
}

export function criarRegraPlantao(
  dados: CriarRegraPlantaoRequest,
): Promise<RegraPlantaoResponse> {
  return requisitar<RegraPlantaoResponse>('/regras-plantao', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export function editarRegraPlantao(
  id: string,
  dados: EditarRegraPlantaoRequest,
): Promise<RegraPlantaoResponse> {
  return requisitar<RegraPlantaoResponse>(`/regras-plantao/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  })
}

export function inativarRegraPlantao(id: string): Promise<RegraPlantaoResponse> {
  return requisitar<RegraPlantaoResponse>(`/regras-plantao/${id}/inativar`, { method: 'POST' })
}

export function reativarRegraPlantao(id: string): Promise<RegraPlantaoResponse> {
  return requisitar<RegraPlantaoResponse>(`/regras-plantao/${id}/reativar`, { method: 'POST' })
}
