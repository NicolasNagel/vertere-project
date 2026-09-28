import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definirHandlerNaoAutorizado, ErroHttp, requisitar } from './clienteHttp'
import * as armazenamentoSessao from '../autenticacao/armazenamentoSessao'

describe('clienteHttp 401', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    definirHandlerNaoAutorizado(null)
  })

  it('dispara aoReceberNaoAutorizado exatamente uma vez quando há sessão e a resposta é 401', async () => {
    vi.spyOn(armazenamentoSessao, 'obter').mockReturnValue({
      token: 'token-expirado',
      papel: 'admin',
      email: 'admin@vertere.com',
      clinicaId: null,
    })
    const handler = vi.fn()
    definirHandlerNaoAutorizado(handler)

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(new Response('Sessão expirada', { status: 401 }))

    await expect(requisitar('/pacientes')).rejects.toThrow(ErroHttp)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('NÃO dispara aoReceberNaoAutorizado quando não há sessão (ex: login com credenciais erradas)', async () => {
    vi.spyOn(armazenamentoSessao, 'obter').mockReturnValue(null)
    const handler = vi.fn()
    definirHandlerNaoAutorizado(handler)

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(new Response('E-mail ou senha inválidos', { status: 401 }))

    await expect(requisitar('/auth/login', { method: 'POST' })).rejects.toThrow(ErroHttp)
    expect(handler).not.toHaveBeenCalled()
  })
})
