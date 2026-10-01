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

const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com o servidor. Tente novamente.'
const AVISO_FORA_DO_FILTRO = 'Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.'

function mensagemDeErroFake(erro: ErroHttp): string {
  if (erro.status === 404) {
    return 'Item não encontrado.'
  }
  return erro.message
}

async function montar(carregarLista: () => Promise<ItemFake[]>) {
  const hook = renderHook(
    ({ carregar }) => useColecaoCrud(carregar, mensagemDeErroFake),
    { initialProps: { carregar: carregarLista } },
  )
  await waitFor(() => expect(hook.result.current.carregando).toBe(false))
  return hook
}

describe('useColecaoCrud — carga', () => {
  it('estado inicial começa carregando com lista vazia', () => {
    const carregarLista = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => useColecaoCrud(carregarLista, mensagemDeErroFake))

    expect(result.current.itens).toEqual([])
    expect(result.current.carregando).toBe(true)
    expect(result.current.aviso).toBeNull()
  })

  it('carga bem-sucedida popula itens e zera carregando', async () => {
    const { result } = await montar(vi.fn().mockResolvedValue([itemA, itemB]))
    expect(result.current.itens).toEqual([itemA, itemB])
  })

  it('carga com ErroHttp preenche erro via mensagemDeErro', async () => {
    const { result } = await montar(vi.fn().mockRejectedValue(new ErroHttp(500, 'falha interna')))
    expect(result.current.erro).toBe('falha interna')
    expect(result.current.itens).toEqual([])
  })

  it('carga com falha de rede preenche erro genérico em vez de lista vazia silenciosa', async () => {
    const { result } = await montar(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    expect(result.current.erro).toBe(MENSAGEM_SEM_CONEXAO)
  })
})

describe('useColecaoCrud — ações de formulário (criar, salvarItem)', () => {
  it('criar bem-sucedido devolve ok e recarrega a lista sem voltar a "carregando"', async () => {
    const carregarLista = vi.fn().mockResolvedValueOnce([itemA]).mockResolvedValueOnce([itemA, itemB])
    const { result } = await montar(carregarLista)

    const estadosDeCarregando: boolean[] = []
    let resultado: unknown
    await act(async () => {
      const promessa = result.current.criar(vi.fn().mockResolvedValue(itemB))
      estadosDeCarregando.push(result.current.carregando)
      resultado = await promessa
    })

    expect(resultado).toEqual({ ok: true })
    expect(carregarLista).toHaveBeenCalledTimes(2)
    expect(result.current.itens).toEqual([itemA, itemB])
    expect(estadosDeCarregando).not.toContain(true)
    expect(result.current.carregando).toBe(false)
  })

  it('criar com ErroHttp devolve a mensagem e não preenche o erro de tela', async () => {
    const { result } = await montar(vi.fn().mockResolvedValue([itemA]))

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar(
        vi.fn().mockRejectedValue(new ErroHttp(404, 'qualquer')),
      )
    })

    expect(resultado).toEqual({ ok: false, mensagem: 'Item não encontrado.' })
    expect(result.current.erro).toBeNull()
    expect(result.current.itens).toEqual([itemA])
  })

  it('criar com falha de rede devolve a mensagem de sem conexão', async () => {
    const { result } = await montar(vi.fn().mockResolvedValue([itemA]))

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar(
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      )
    })

    expect(resultado).toEqual({ ok: false, mensagem: MENSAGEM_SEM_CONEXAO })
    expect(result.current.erro).toBeNull()
  })

  it('salvarItem bem-sucedido devolve ok e recarrega a lista', async () => {
    const itemAEditado = { ...itemA, nome: 'Item A editado' }
    const carregarLista = vi.fn().mockResolvedValueOnce([itemA]).mockResolvedValueOnce([itemAEditado])
    const { result } = await montar(carregarLista)

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.salvarItem(vi.fn().mockResolvedValue(itemAEditado))
    })

    expect(resultado).toEqual({ ok: true })
    expect(carregarLista).toHaveBeenCalledTimes(2)
    expect(result.current.itens).toEqual([itemAEditado])
  })

  it('salvarItem com ErroHttp devolve a mensagem e não preenche o erro de tela', async () => {
    const { result } = await montar(vi.fn().mockResolvedValue([itemA]))

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.salvarItem(
        vi.fn().mockRejectedValue(new ErroHttp(422, 'dado inválido')),
      )
    })

    expect(resultado).toEqual({ ok: false, mensagem: 'dado inválido' })
    expect(result.current.erro).toBeNull()
  })

  it('salvarItem com falha de rede devolve a mensagem de sem conexão', async () => {
    const { result } = await montar(vi.fn().mockResolvedValue([itemA]))

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.salvarItem(
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      )
    })

    expect(resultado).toEqual({ ok: false, mensagem: MENSAGEM_SEM_CONEXAO })
  })

  it('recarga que falha depois de uma ação bem-sucedida: a ação é ok e o erro vai para a tela', async () => {
    const carregarLista = vi
      .fn()
      .mockResolvedValueOnce([itemA])
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = await montar(carregarLista)

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar(vi.fn().mockResolvedValue(itemB))
    })

    expect(resultado).toEqual({ ok: true })
    expect(result.current.erro).toBe(MENSAGEM_SEM_CONEXAO)
  })
})

describe('useColecaoCrud — ações de linha (executarAcaoSobreItem)', () => {
  it('bem-sucedida recarrega a lista', async () => {
    const itemAInativo = { ...itemA, nome: 'inativo' }
    const carregarLista = vi.fn().mockResolvedValueOnce([itemA, itemB]).mockResolvedValueOnce([itemB])
    const { result } = await montar(carregarLista)

    await act(async () => {
      await result.current.executarAcaoSobreItem(vi.fn().mockResolvedValue(itemAInativo))
    })

    expect(carregarLista).toHaveBeenCalledTimes(2)
    expect(result.current.itens).toEqual([itemB])
  })

  it('com ErroHttp preenche o erro de tela sem alterar itens', async () => {
    const { result } = await montar(vi.fn().mockResolvedValue([itemA]))

    await act(async () => {
      await result.current.executarAcaoSobreItem(
        vi.fn().mockRejectedValue(new ErroHttp(404, 'qualquer')),
      )
    })

    expect(result.current.erro).toBe('Item não encontrado.')
    expect(result.current.itens).toEqual([itemA])
  })

  it('com falha de rede preenche o erro de tela com a mensagem de sem conexão', async () => {
    const { result } = await montar(vi.fn().mockResolvedValue([itemA]))

    await act(async () => {
      await result.current.executarAcaoSobreItem(
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      )
    })

    expect(result.current.erro).toBe(MENSAGEM_SEM_CONEXAO)
  })
})

describe('useColecaoCrud — aviso de item fora do filtro (FR-014)', () => {
  it('criar cujo item não volta na recarga preenche o aviso', async () => {
    const carregarLista = vi.fn().mockResolvedValueOnce([itemA]).mockResolvedValueOnce([itemA])
    const { result } = await montar(carregarLista)

    await act(async () => {
      await result.current.criar(vi.fn().mockResolvedValue(itemB))
    })

    expect(result.current.aviso).toBe(AVISO_FORA_DO_FILTRO)
  })

  it('criar cujo item volta na recarga não preenche o aviso', async () => {
    const carregarLista = vi.fn().mockResolvedValueOnce([itemA]).mockResolvedValueOnce([itemA, itemB])
    const { result } = await montar(carregarLista)

    await act(async () => {
      await result.current.criar(vi.fn().mockResolvedValue(itemB))
    })

    expect(result.current.aviso).toBeNull()
  })

  it('o aviso é limpo na próxima ação', async () => {
    const carregarLista = vi.fn().mockResolvedValue([itemA])
    const { result } = await montar(carregarLista)
    await act(async () => {
      await result.current.criar(vi.fn().mockResolvedValue(itemB))
    })
    expect(result.current.aviso).toBe(AVISO_FORA_DO_FILTRO)

    await act(async () => {
      await result.current.executarAcaoSobreItem(vi.fn().mockResolvedValue(itemA))
    })

    expect(result.current.aviso).toBeNull()
  })

  it('o aviso é limpo quando a lista é carregada com outro filtro', async () => {
    const { result, rerender } = await montar(vi.fn().mockResolvedValue([itemA]))
    await act(async () => {
      await result.current.criar(vi.fn().mockResolvedValue(itemB))
    })
    expect(result.current.aviso).toBe(AVISO_FORA_DO_FILTRO)

    rerender({ carregar: vi.fn().mockResolvedValue([itemA, itemB]) })

    await waitFor(() => expect(result.current.itens).toEqual([itemA, itemB]))
    expect(result.current.aviso).toBeNull()
  })
})
