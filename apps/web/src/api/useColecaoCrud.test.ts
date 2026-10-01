import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErroHttp } from './clienteHttp'
import { useColecaoCrud } from './useColecaoCrud'

interface ItemFake {
  id: string
  nome: string
}

const itemA: ItemFake = { id: '1', nome: 'Item A' }
const itemB: ItemFake = { id: '2', nome: 'Item B' }

function mensagemDeErroFake(erro: ErroHttp): string {
  if (erro.status === 404) {
    return 'Item não encontrado.'
  }
  return erro.message
}

describe('useColecaoCrud', () => {
  it('estado inicial começa carregando com lista vazia', () => {
    const carregarLista = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))

    expect(result.current.itens).toEqual([])
    expect(result.current.carregando).toBe(true)
  })

  it('recarregar bem-sucedido popula itens e zera carregando', async () => {
    const carregarLista = vi.fn().mockResolvedValue([itemA, itemB])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.itens).toEqual([itemA, itemB])
  })

  it('recarregar com ErroHttp seta erro via mensagemDeErro', async () => {
    const carregarLista = vi.fn().mockRejectedValue(new ErroHttp(500, 'falha interna'))
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('falha interna')
    expect(result.current.itens).toEqual([])
  })

  it('criar bem-sucedido adiciona o item retornado sem novo carregarLista', async () => {
    const carregarLista = vi.fn().mockResolvedValue([itemA])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    const acao = vi.fn().mockResolvedValue(itemB)
    await act(async () => {
      await result.current.criar(acao)
    })

    expect(result.current.itens).toEqual([itemA, itemB])
    expect(carregarLista).toHaveBeenCalledTimes(1)
  })

  it('criar com ErroHttp seta erro sem alterar itens', async () => {
    const carregarLista = vi.fn().mockResolvedValue([itemA])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    const acao = vi.fn().mockRejectedValue(new ErroHttp(422, 'dado inválido'))
    await act(async () => {
      await result.current.criar(acao)
    })

    expect(result.current.itens).toEqual([itemA])
    expect(result.current.erro).toBe('dado inválido')
  })

  it('executarAcaoSobreItem bem-sucedido substitui o item correspondente por id', async () => {
    const carregarLista = vi.fn().mockResolvedValue([itemA, itemB])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    const itemAAtualizado = { ...itemA, nome: 'Item A editado' }
    const acao = vi.fn().mockResolvedValue(itemAAtualizado)
    await act(async () => {
      await result.current.executarAcaoSobreItem(acao)
    })

    expect(result.current.itens).toEqual([itemAAtualizado, itemB])
  })

  it('executarAcaoSobreItem com ErroHttp 404 seta erro sem alterar itens', async () => {
    const carregarLista = vi.fn().mockResolvedValue([itemA])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    const acao = vi.fn().mockRejectedValue(new ErroHttp(404, '{"detail":"Item 1 não encontrado"}'))
    await act(async () => {
      await result.current.executarAcaoSobreItem(acao)
    })

    expect(result.current.itens).toEqual([itemA])
    expect(result.current.erro).toBe('Item não encontrado.')
  })
})

describe('useColecaoCrud — falha que não é ErroHttp (ex.: rede)', () => {
  const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com o servidor. Tente novamente.'

  it('recarregar com falha de rede seta erro genérico em vez de lista vazia silenciosa', async () => {
    const carregarLista = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe(MENSAGEM_SEM_CONEXAO)
  })

  it('criar com falha de rede seta erro genérico', async () => {
    const carregarLista = vi.fn().mockResolvedValue([itemA])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    })

    expect(result.current.erro).toBe(MENSAGEM_SEM_CONEXAO)
    expect(result.current.itens).toEqual([itemA])
  })

  it('executarAcaoSobreItem com falha de rede seta erro genérico', async () => {
    const carregarLista = vi.fn().mockResolvedValue([itemA])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.executarAcaoSobreItem(
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      )
    })

    expect(result.current.erro).toBe(MENSAGEM_SEM_CONEXAO)
  })
})
