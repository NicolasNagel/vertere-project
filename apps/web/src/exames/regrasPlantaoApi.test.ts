import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requisitar } from '../api/clienteHttp'
import {
  criarRegraPlantao,
  editarRegraPlantao,
  inativarRegraPlantao,
  listarRegrasPlantao,
  reativarRegraPlantao,
} from './regrasPlantaoApi'

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

  it('editarRegraPlantao chama PATCH /regras-plantao/{id} com o body serializado', async () => {
    const dados = {
      dia_semana: 4,
      hora_inicio: '18:00:00',
      hora_fim: '06:00:00',
      valor_adicional: '80.00',
    }
    vi.mocked(requisitar).mockResolvedValueOnce({ id: '1', ativo: true, ...dados })
    await editarRegraPlantao('1', dados)
    expect(requisitar).toHaveBeenCalledWith('/regras-plantao/1', {
      method: 'PATCH',
      body: JSON.stringify(dados),
    })
  })

  it('inativarRegraPlantao chama POST /regras-plantao/{id}/inativar', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await inativarRegraPlantao('1')
    expect(requisitar).toHaveBeenCalledWith('/regras-plantao/1/inativar', { method: 'POST' })
  })

  it('reativarRegraPlantao chama POST /regras-plantao/{id}/reativar', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await reativarRegraPlantao('1')
    expect(requisitar).toHaveBeenCalledWith('/regras-plantao/1/reativar', { method: 'POST' })
  })
})
