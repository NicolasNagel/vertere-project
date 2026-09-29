import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'

type ClinicaResponse = components['schemas']['ClinicaResponse']
type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']

export function listarClinicas(apenasAtivas = false): Promise<ClinicaResponse[]> {
  return requisitar<ClinicaResponse[]>(`/clinicas?apenas_ativas=${apenasAtivas}`)
}

export function buscarClinicasPorNome(
  nome: string,
  apenasAtivas = false,
): Promise<ClinicaResponse[]> {
  return requisitar<ClinicaResponse[]>(
    `/clinicas/busca?nome=${encodeURIComponent(nome)}&apenas_ativas=${apenasAtivas}`,
  )
}

export function criarClinica(dados: CriarClinicaRequest): Promise<ClinicaResponse> {
  return requisitar<ClinicaResponse>('/clinicas', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}
