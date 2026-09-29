import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'

type ClinicaResponse = components['schemas']['ClinicaResponse']
type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']
type EditarClinicaRequest = components['schemas']['EditarClinicaRequest']

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

export function editarClinica(
  id: string,
  dados: EditarClinicaRequest,
): Promise<ClinicaResponse> {
  return requisitar<ClinicaResponse>(`/clinicas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  })
}

export function inativarClinica(id: string): Promise<ClinicaResponse> {
  return requisitar<ClinicaResponse>(`/clinicas/${id}/inativar`, { method: 'POST' })
}

export function reativarClinica(id: string): Promise<ClinicaResponse> {
  return requisitar<ClinicaResponse>(`/clinicas/${id}/reativar`, { method: 'POST' })
}

export function definirPrazoPagamento(
  id: string,
  prazoPagamentoDias: number | null,
): Promise<ClinicaResponse> {
  return requisitar<ClinicaResponse>(`/clinicas/${id}/prazo-pagamento`, {
    method: 'POST',
    body: JSON.stringify({ prazo_pagamento_dias: prazoPagamentoDias }),
  })
}
