import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requisitar } from '../api/clienteHttp'
import { criarRegraPlantao, listarRegrasPlantao } from './regrasPlantaoApi'

vi.mock('../api/clienteHttp', () => ({
  requisitar: vi.fn(),
}))

describe('regrasPlantaoApi', () => {
  beforeEach(() => {
    vi.mocked(requisitar).mockReset()
  })

  it('listarRegrasPlantao chama GET /regras-plantao com apenas_ativos', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await listarRegrasPlantao(true)
    expect(requisitar).toHaveBeenCalledWith('/regras-plantao?apenas_ativos=true')
  })

  it('listarRegrasPlantao sem argumento não filtra por ativas', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await listarRegrasPlantao()
    expect(requisitar).toHaveBeenCalledWith('/regras-plantao?apenas_ativos=false')
  })

  it('criarRegraPlantao chama POST /regras-plantao com o body serializado', async () => {
    const dados = {
      dia_semana: 4,
      hora_inicio: '18:00:00',
      hora_fim: '06:00:00',
      valor_adicional: '50.00',
    }
    vi.mocked(requisitar).mockResolvedValueOnce({ id: '1', ativo: true, ...dados })
    await criarRegraPlantao(dados)
    expect(requisitar).toHaveBeenCalledWith('/regras-plantao', {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  })
})
