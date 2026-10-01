import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import { useEnvioFormulario } from './useEnvioFormulario'

function promessaControlada() {
  let resolver!: (valor: ResultadoAcao) => void
  const promessa = new Promise<ResultadoAcao>((r) => {
    resolver = r
  })
  return { promessa, resolver }
}

describe('useEnvioFormulario', () => {
  it('envio bem-sucedido chama aoFechar uma vez', async () => {
    const aoFechar = vi.fn()
    const { result } = renderHook(() =>
      useEnvioFormulario(vi.fn().mockResolvedValue({ ok: true }), aoFechar),
    )

    await act(async () => {
      await result.current.enviar()
    })

    expect(aoFechar).toHaveBeenCalledTimes(1)
    expect(result.current.erroEnvio).toBeNull()
  })

  it('envio que falha não fecha e expõe a mensagem', async () => {
    const aoFechar = vi.fn()
    const { result } = renderHook(() =>
      useEnvioFormulario(vi.fn().mockResolvedValue({ ok: false, mensagem: 'x' }), aoFechar),
    )

    await act(async () => {
      await result.current.enviar()
    })

    expect(aoFechar).not.toHaveBeenCalled()
    expect(result.current.erroEnvio).toBe('x')
  })

  it('salvando fica true enquanto o envio está pendente e volta a false', async () => {
    const { promessa, resolver } = promessaControlada()
    const { result } = renderHook(() => useEnvioFormulario(() => promessa, vi.fn()))

    let envio!: Promise<void>
    act(() => {
      envio = result.current.enviar()
    })
    expect(result.current.salvando).toBe(true)

    await act(async () => {
      resolver({ ok: false, mensagem: 'x' })
      await envio
    })
    expect(result.current.salvando).toBe(false)
  })

  it('um segundo envio enquanto salvando não chama aoSalvar de novo', async () => {
    const { promessa, resolver } = promessaControlada()
    const aoSalvar = vi.fn(() => promessa)
    const { result } = renderHook(() => useEnvioFormulario(aoSalvar, vi.fn()))

    let primeiro!: Promise<void>
    act(() => {
      primeiro = result.current.enviar()
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(aoSalvar).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolver({ ok: true })
      await primeiro
    })
  })

  it('um envio bem-sucedido depois de uma falha limpa a mensagem', async () => {
    const aoSalvar = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, mensagem: 'x' })
      .mockResolvedValueOnce({ ok: true })
    const { result } = renderHook(() => useEnvioFormulario(aoSalvar, vi.fn()))

    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.erroEnvio).toBe('x')

    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.erroEnvio).toBeNull()
  })
})
