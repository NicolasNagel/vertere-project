import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroHttp } from '../api/clienteHttp'
import * as examesApi from './examesApi'
import { useExames } from './useExames'

vi.mock('./examesApi')

const exameA = {
  id: '1',
  categoria: 'Hematologia',
  nome: 'Hemograma completo',
  preco_base: '50.00',
  ativo: true,
}

describe('useExames', () => {
  beforeEach(() => {
    vi.mocked(examesApi.listarExames).mockReset()
    vi.mocked(examesApi.criarExame).mockReset()
  })

  it('editar atualiza o exame correspondente no estado local', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
    const editado = { ...exameA, preco_base: '70.00' }
    vi.mocked(examesApi.editarExame).mockResolvedValueOnce(editado)

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.editar('1', {
        categoria: exameA.categoria,
        nome: exameA.nome,
        preco_base: '70.00',
      })
    })

    expect(result.current.exames).toEqual([editado])
    expect(examesApi.listarExames).toHaveBeenCalledTimes(1)
  })

  it('inativar atualiza o status do exame no estado local', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
    const inativado = { ...exameA, ativo: false }
    vi.mocked(examesApi.inativarExame).mockResolvedValueOnce(inativado)

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.exames).toEqual([inativado])
  })

  it('reativar atualiza o status do exame no estado local', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([{ ...exameA, ativo: false }])
    vi.mocked(examesApi.reativarExame).mockResolvedValueOnce(exameA)

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.reativar('1')
    })

    expect(result.current.exames).toEqual([exameA])
  })

  it('erro HTTP 404 em qualquer ação de edição resulta na mensagem específica', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
    vi.mocked(examesApi.inativarExame).mockRejectedValueOnce(
      new ErroHttp(404, '{"detail":"Exame 1 não encontrado"}'),
    )

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.erro).toBe(
      'Exame não encontrado — pode ter sido removido por outra sessão.',
    )
  })

  it('carrega a lista de exames ao montar', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])

    const { result } = renderHook(() => useExames())

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.exames).toEqual([exameA])
  })

  it('criar bem-sucedido adiciona o exame ao estado local sem novo GET', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([])
    vi.mocked(examesApi.criarExame).mockResolvedValueOnce(exameA)

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        categoria: exameA.categoria,
        nome: exameA.nome,
        preco_base: exameA.preco_base,
      })
    })

    expect(result.current.exames).toEqual([exameA])
    expect(examesApi.listarExames).toHaveBeenCalledTimes(1)
  })

  it('criar com erro HTTP inesperado usa a mensagem do corpo como fallback', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([])
    vi.mocked(examesApi.criarExame).mockRejectedValueOnce(
      new ErroHttp(500, '{"detail":"falha interna"}'),
    )

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        categoria: exameA.categoria,
        nome: exameA.nome,
        preco_base: exameA.preco_base,
      })
    })

    expect(result.current.erro).toBe('falha interna')
  })

  it('definirCategoria refaz a listagem com o filtro', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([])

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      result.current.definirCategoria('Hematologia')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(examesApi.listarExames).toHaveBeenLastCalledWith('Hematologia', false)
  })

  it('definirApenasAtivos refaz a listagem com o filtro', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([])

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      result.current.definirApenasAtivos(true)
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(examesApi.listarExames).toHaveBeenLastCalledWith(undefined, true)
  })
})
