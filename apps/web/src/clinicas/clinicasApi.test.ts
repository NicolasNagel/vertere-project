import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requisitar } from '../api/clienteHttp'
import { buscarClinicasPorNome, criarClinica, listarClinicas } from './clinicasApi'

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
})
