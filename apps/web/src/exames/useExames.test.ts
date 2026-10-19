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

  it('editar atualiza o exame correspondente e recarrega a lista', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
    const editado = { ...exameA, preco_base: '70.00' }
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([editado])
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
    expect(examesApi.listarExames).toHaveBeenCalledTimes(2)
  })

  it('inativar atualiza o status do exame e recarrega a lista', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
    const inativado = { ...exameA, ativo: false }
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([inativado])
    vi.mocked(examesApi.inativarExame).mockResolvedValueOnce(inativado)

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.exames).toEqual([inativado])
  })

  it('reativar atualiza o status do exame e recarrega a lista', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([{ ...exameA, ativo: false }])
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
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

  it('criar bem-sucedido devolve ok e recarrega a lista', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([])
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([exameA])
    vi.mocked(examesApi.criarExame).mockResolvedValueOnce(exameA)

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar({
        categoria: exameA.categoria,
        nome: exameA.nome,
        preco_base: exameA.preco_base,
      })
    })

    expect(resultado).toEqual({ ok: true })
    expect(result.current.exames).toEqual([exameA])
    expect(examesApi.listarExames).toHaveBeenCalledTimes(2)
  })

  it('criar com erro 500 devolve a mensagem genérica de servidor sem preencher o erro de tela', async () => {
    vi.mocked(examesApi.listarExames).mockResolvedValueOnce([])
    vi.mocked(examesApi.criarExame).mockRejectedValueOnce(
      new ErroHttp(500, '{"detail":"falha interna"}'),
    )

    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar({
        categoria: exameA.categoria,
        nome: exameA.nome,
        preco_base: exameA.preco_base,
      })
    })

    expect(resultado).toEqual({
      ok: false,
      mensagem: 'Problema no servidor. Tente novamente em instantes.',
    })
    expect(result.current.erro).toBeNull()
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

describe('useExames — mensagens de erro (US2)', () => {
  const dados = { categoria: exameA.categoria, nome: exameA.nome, preco_base: '-1' }

  async function criarComErro(erro: unknown) {
    vi.mocked(examesApi.listarExames).mockReset().mockResolvedValue([])
    vi.mocked(examesApi.criarExame).mockReset().mockRejectedValueOnce(erro)
    const { result } = renderHook(() => useExames())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar(dados)
    })
    return resultado
  }

  it('422 de domínio do backend (detail string) passa como está', async () => {
    expect(
      await criarComErro(new ErroHttp(422, '{"detail":"Preço-base deve ser maior que zero."}')),
    ).toEqual({ ok: false, mensagem: 'Preço-base deve ser maior que zero.' })
  })

  it('422 do Pydantic em preco_base cita o campo Preço-base', async () => {
    expect(
      await criarComErro(
        new ErroHttp(
          422,
          JSON.stringify({ detail: [{ loc: ['body', 'preco_base'], type: 'decimal_parsing' }] }),
        ),
      ),
    ).toEqual({ ok: false, mensagem: 'Verifique o campo Preço-base: precisa ser um número.' })
  })

  it('erro 500 vira mensagem genérica de servidor', async () => {
    expect(await criarComErro(new ErroHttp(500, 'Internal Server Error'))).toEqual({
      ok: false,
      mensagem: 'Problema no servidor. Tente novamente em instantes.',
    })
  })
})
