import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requisitar } from '../api/clienteHttp'
import {
  buscarVeterinariosPorNome,
  criarVeterinario,
  editarVeterinario,
  inativarVeterinario,
  listarVeterinarios,
  reativarVeterinario,
} from './veterinariosApi'

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

  it('editarVeterinario chama PATCH /veterinarios/{id} com o body serializado', async () => {
    const dados = { nome: 'Dr. João', telefone: '999', email: 'joao@vet.com' }
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await editarVeterinario('1', dados)
    expect(requisitar).toHaveBeenCalledWith('/veterinarios/1', {
      method: 'PATCH',
      body: JSON.stringify(dados),
    })
  })

  it('inativarVeterinario chama POST /veterinarios/{id}/inativar', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await inativarVeterinario('1')
    expect(requisitar).toHaveBeenCalledWith('/veterinarios/1/inativar', { method: 'POST' })
  })

  it('reativarVeterinario chama POST /veterinarios/{id}/reativar', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await reativarVeterinario('1')
    expect(requisitar).toHaveBeenCalledWith('/veterinarios/1/reativar', { method: 'POST' })
  })
})
