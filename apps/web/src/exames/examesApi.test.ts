import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requisitar } from '../api/clienteHttp'
import { criarExame, listarExames } from './examesApi'

vi.mock('../api/clienteHttp', () => ({
  requisitar: vi.fn(),
}))

describe('examesApi', () => {
  beforeEach(() => {
    vi.mocked(requisitar).mockReset()
  })

  it('listarExames sem argumentos chama GET /exames com apenas_ativos e sem categoria', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await listarExames()
    expect(requisitar).toHaveBeenCalledWith('/exames?apenas_ativos=false')
  })

  it('listarExames com categoria inclui o filtro na query', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce([])
    await listarExames('Hematologia', true)
    expect(requisitar).toHaveBeenCalledWith('/exames?apenas_ativos=true&categoria=Hematologia')
  })

  it('criarExame chama POST /exames com o body serializado', async () => {
    const dados = { categoria: 'Hematologia', nome: 'Hemograma completo', preco_base: '50.00' }
    vi.mocked(requisitar).mockResolvedValueOnce({ id: '1', ativo: true, ...dados })
    await criarExame(dados)
    expect(requisitar).toHaveBeenCalledWith('/exames', {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  })
})
