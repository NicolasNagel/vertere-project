import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'

type VeterinarioResponse = components['schemas']['VeterinarioResponse']
type CriarVeterinarioRequest = components['schemas']['CriarVeterinarioRequest']
type EditarVeterinarioRequest = components['schemas']['EditarVeterinarioRequest']

function comClinicaId(query: string, clinicaId?: string): string {
  return clinicaId ? `${query}&clinica_id=${clinicaId}` : query
}

export function listarVeterinarios(
  clinicaId?: string,
  apenasAtivos = false,
): Promise<VeterinarioResponse[]> {
  return requisitar<VeterinarioResponse[]>(
    comClinicaId(`/veterinarios?apenas_ativos=${apenasAtivos}`, clinicaId),
  )
}

export function buscarVeterinariosPorNome(
  nome: string,
  clinicaId?: string,
  apenasAtivos = false,
): Promise<VeterinarioResponse[]> {
  return requisitar<VeterinarioResponse[]>(
    comClinicaId(
      `/veterinarios/busca?nome=${encodeURIComponent(nome)}&apenas_ativos=${apenasAtivos}`,
      clinicaId,
    ),
  )
}

export function criarVeterinario(
  dados: CriarVeterinarioRequest,
): Promise<VeterinarioResponse> {
  return requisitar<VeterinarioResponse>('/veterinarios', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export function editarVeterinario(
  id: string,
  dados: EditarVeterinarioRequest,
): Promise<VeterinarioResponse> {
  return requisitar<VeterinarioResponse>(`/veterinarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  })
}

export function inativarVeterinario(id: string): Promise<VeterinarioResponse> {
  return requisitar<VeterinarioResponse>(`/veterinarios/${id}/inativar`, { method: 'POST' })
}

export function reativarVeterinario(id: string): Promise<VeterinarioResponse> {
  return requisitar<VeterinarioResponse>(`/veterinarios/${id}/reativar`, { method: 'POST' })
}
