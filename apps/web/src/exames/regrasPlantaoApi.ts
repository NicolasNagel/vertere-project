import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'

type RegraPlantaoResponse = components['schemas']['RegraPlantaoResponse']
type CriarRegraPlantaoRequest = components['schemas']['CriarRegraPlantaoRequest']

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
