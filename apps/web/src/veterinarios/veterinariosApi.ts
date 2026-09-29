import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'

type VeterinarioResponse = components['schemas']['VeterinarioResponse']
type CriarVeterinarioRequest = components['schemas']['CriarVeterinarioRequest']

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
