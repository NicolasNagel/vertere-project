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

  it('carrega a lista de regras de plantão ao montar', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([regraA])

    const { result } = renderHook(() => useRegrasPlantao())

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.regras).toEqual([regraA])
  })

  it('criar com hora_inicio maior que hora_fim (cruzando meia-noite) é aceito normalmente', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([])
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
    expect(regrasPlantaoApi.listarRegrasPlantao).toHaveBeenCalledTimes(1)
  })

  it('criar com erro HTTP inesperado usa a mensagem do corpo como fallback', async () => {
    vi.mocked(regrasPlantaoApi.listarRegrasPlantao).mockResolvedValueOnce([])
    vi.mocked(regrasPlantaoApi.criarRegraPlantao).mockRejectedValueOnce(
      new ErroHttp(500, '{"detail":"falha interna"}'),
    )

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

    expect(result.current.erro).toBe('falha interna')
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
