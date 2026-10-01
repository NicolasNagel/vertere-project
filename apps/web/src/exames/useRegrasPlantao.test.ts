import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroHttp } from '../api/clienteHttp'
import * as regrasPlantaoApi from './regrasPlantaoApi'
import { useRegrasPlantao } from './useRegrasPlantao'

vi.mock('./regrasPlantaoApi')

const regraA = {
  id: '1',
  dia_semana: 4,
  hora_inicio: '18:00:00',
  hora_fim: '06:00:00',
  valor_adicional: '50.00',
  ativo: true,
}

describe('useRegrasPlantao', () => {
  beforeEach(() => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockReset()
    vi.mocked(regrasPlantaoApi.criarRegraPlantao).mockReset()
  })

  it('editar atualiza a regra correspondente e recarrega a lista', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([regraA])
    const editada = { ...regraA, valor_adicional: '80.00' }
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([editada])
    vi.mocked(regrasPlantaoApi.editarRegraPlantao).mockResolvedValueOnce(editada)

    const { result } = renderHook(() => useRegrasPlantao())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.editar('1', {
        dia_semana: regraA.dia_semana,
        hora_inicio: regraA.hora_inicio,
        hora_fim: regraA.hora_fim,
        valor_adicional: '80.00',
      })
    })

    expect(result.current.regras).toEqual([editada])
    expect(regrasPlantaoApi.listarRegrasPlantao).toHaveBeenCalledTimes(2)
  })

  it('inativar atualiza o status da regra e recarrega a lista', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([regraA])
    const inativada = { ...regraA, ativo: false }
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([inativada])
    vi.mocked(regrasPlantaoApi.inativarRegraPlantao).mockResolvedValueOnce(inativada)

    const { result } = renderHook(() => useRegrasPlantao())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.regras).toEqual([inativada])
  })

  it('reativar atualiza o status da regra e recarrega a lista', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([
      { ...regraA, ativo: false },
    ])
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([regraA])
    vi.mocked(regrasPlantaoApi.reativarRegraPlantao).mockResolvedValueOnce(regraA)

    const { result } = renderHook(() => useRegrasPlantao())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.reativar('1')
    })

    expect(result.current.regras).toEqual([regraA])
  })

  it('erro HTTP 404 em qualquer ação de edição resulta na mensagem específica', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([regraA])
    vi.mocked(regrasPlantaoApi.inativarRegraPlantao).mockRejectedValueOnce(
      new ErroHttp(404, '{"detail":"Regra de plantão 1 não encontrada"}'),
    )

    const { result } = renderHook(() => useRegrasPlantao())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.erro).toBe(
      'Regra de plantão não encontrada — pode ter sido removida por outra sessão.',
    )
  })

  it('carrega a lista de regras de plantão ao montar', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([regraA])

    const { result } = renderHook(() => useRegrasPlantao())

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.regras).toEqual([regraA])
  })

  it('criar com hora_inicio maior que hora_fim (cruzando meia-noite) é aceito normalmente', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([])
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([regraA])
    vi.mocked(regrasPlantaoApi.criarRegraPlantao).mockResolvedValueOnce(regraA)

    const { result } = renderHook(() => useRegrasPlantao())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        dia_semana: regraA.dia_semana,
        hora_inicio: regraA.hora_inicio,
        hora_fim: regraA.hora_fim,
        valor_adicional: regraA.valor_adicional,
      })
    })

    expect(result.current.regras).toEqual([regraA])
    expect(result.current.erro).toBeNull()
    expect(regrasPlantaoApi.listarRegrasPlantao).toHaveBeenCalledTimes(2)
  })

  it('criar com erro HTTP inesperado devolve a mensagem sem preencher o erro de tela', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([])
    vi.mocked(regrasPlantaoApi.criarRegraPlantao).mockRejectedValueOnce(
      new ErroHttp(500, '{"detail":"falha interna"}'),
    )

    const { result } = renderHook(() => useRegrasPlantao())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar({
        dia_semana: regraA.dia_semana,
        hora_inicio: regraA.hora_inicio,
        hora_fim: regraA.hora_fim,
        valor_adicional: regraA.valor_adicional,
      })
    })

    expect(resultado).toEqual({ ok: false, mensagem: 'falha interna' })
    expect(result.current.erro).toBeNull()
  })

  it('definirApenasAtivos refaz a listagem com o filtro', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([regraA])
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([])

    const { result } = renderHook(() => useRegrasPlantao())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      result.current.definirApenasAtivos(true)
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(regrasPlantaoApi.listarRegrasPlantao).toHaveBeenLastCalledWith(true)
  })
})
