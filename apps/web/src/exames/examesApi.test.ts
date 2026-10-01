import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requisitar } from '../api/clienteHttp'
import { criarExame, editarExame, inativarExame, listarExames, reativarExame } from './examesApi'

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

  it('editarExame chama PATCH /exames/{id} com o body serializado', async () => {
    const dados = { categoria: 'Hematologia', nome: 'Hemograma', preco_base: '60.00' }
    vi.mocked(requisitar).mockResolvedValueOnce({ id: '1', ativo: true, ...dados })
    await editarExame('1', dados)
    expect(requisitar).toHaveBeenCalledWith('/exames/1', {
      method: 'PATCH',
      body: JSON.stringify(dados),
    })
  })

  it('inativarExame chama POST /exames/{id}/inativar', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await inativarExame('1')
    expect(requisitar).toHaveBeenCalledWith('/exames/1/inativar', { method: 'POST' })
  })

  it('reativarExame chama POST /exames/{id}/reativar', async () => {
    vi.mocked(requisitar).mockResolvedValueOnce({})
    await reativarExame('1')
    expect(requisitar).toHaveBeenCalledWith('/exames/1/reativar', { method: 'POST' })
  })
})
