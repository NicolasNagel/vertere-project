import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requisitar } from '../api/clienteHttp'
import { buscarVeterinariosPorNome, criarVeterinario, listarVeterinarios } from './veterinariosApi'

vi.mock('../api/clienteHttp', () => ({
  requisitar: vi.fn(),
}))

describe('veterinariosApi', () => {
  beforeEach(() => {
    vi.mocked(requisitar).mockReset()
  })

  it('listarVeterinarios sem filtros chama GET /veterinarios com apenas_ativos', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await listarVeterinarios()
    expect(requisitar).toHaveBeenCalledWith('/veterinarios?apenas_ativos=false')
  })

  it('listarVeterinarios com clinicaId inclui clinica_id na query', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await listarVeterinarios('c1', true)
    expect(requisitar).toHaveBeenCalledWith(
      '/veterinarios?apenas_ativos=true&clinica_id=c1',
    )
  })

  it('buscarVeterinariosPorNome chama GET /veterinarios/busca com nome', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await buscarVeterinariosPorNome('joao', 'c1')
    expect(requisitar).toHaveBeenCalledWith(
      '/veterinarios/busca?nome=joao&apenas_ativos=false&clinica_id=c1',
    )
  })

  it('criarVeterinario chama POST /veterinarios com o body serializado', async () => {
    const dados = {
      nome: 'Dr. João',
      crmv: '1234',
      telefone: '4730000000',
      email: 'joao@vet.com',
      clinica_id: 'c1',
    }
    vi.mocked(requisitar).mockResolvedValueOnce({ id: '1', ativo: true, ...dados })
    await criarVeterinario(dados)
    expect(requisitar).toHaveBeenCalledWith('/veterinarios', {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  })
})
