import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requisitar } from '../api/clienteHttp'
import {
  buscarClinicasPorNome,
  criarClinica,
  definirPrazoPagamento,
  editarClinica,
  inativarClinica,
  listarClinicas,
  reativarClinica,
} from './clinicasApi'

vi.mock('../api/clienteHttp', () => ({
  requisitar: vi.fn(),
}))

describe('clinicasApi', () => {
  beforeEach(() => {
    vi.mocked(requisitar).mockReset()
  })

  it('listarClinicas chama GET /clinicas com apenas_ativas', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await listarClinicas(true)
    expect(requisitar).toHaveBeenCalledWith('/clinicas?apenas_ativas=true')
  })

  it('listarClinicas sem argumento não filtra por ativas', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await listarClinicas()
    expect(requisitar).toHaveBeenCalledWith('/clinicas?apenas_ativas=false')
  })

  it('buscarClinicasPorNome chama GET /clinicas/busca com nome', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await buscarClinicasPorNome('vet')
    expect(requisitar).toHaveBeenCalledWith('/clinicas/busca?nome=vet&apenas_ativas=false')
  })

  it('criarClinica chama POST /clinicas com o body serializado', async () => {
    const dados = {
      nome: 'Clínica A',
      cnpj: '12345678000199',
      endereco: 'Rua X',
      telefone: '4730000000',
      email: 'a@clinica.com',
    }
    vi.mocked(requisitar).mockResolvedValueOnce({ id: '1', ativo: true, ...dados })
    await criarClinica(dados)
    expect(requisitar).toHaveBeenCalledWith('/clinicas', {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  })

  it('editarClinica chama PATCH /clinicas/{id} com o body serializado', async () => {
    const dados = { nome: 'Clínica A', endereco: 'Rua Y', telefone: '123', email: 'a@a.com' }
    vi.mocked(requisitar).mockResolvedValueOnce({ id: '1', ativo: true, cnpj: '1', ...dados })
    await editarClinica('1', dados)
    expect(requisitar).toHaveBeenCalledWith('/clinicas/1', {
      method: 'PATCH',
      body: JSON.stringify(dados),
    })
  })

  it('inativarClinica chama POST /clinicas/{id}/inativar', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await inativarClinica('1')
    expect(requisitar).toHaveBeenCalledWith('/clinicas/1/inativar', { method: 'POST' })
  })

  it('reativarClinica chama POST /clinicas/{id}/reativar', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await reativarClinica('1')
    expect(requisitar).toHaveBeenCalledWith('/clinicas/1/reativar', { method: 'POST' })
  })

  it('definirPrazoPagamento chama POST /clinicas/{id}/prazo-pagamento com o body serializado', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await definirPrazoPagamento('1', 45)
    expect(requisitar).toHaveBeenCalledWith('/clinicas/1/prazo-pagamento', {
      method: 'POST',
      body: JSON.stringify({ prazo_pagamento_dias: 45 }),
    })
  })
})
