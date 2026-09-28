import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from './clienteAuth'

describe('clienteAuth.login', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('encadeia POST /auth/login -> GET /auth/me e retorna a sessão completa', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'token-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'user-1',
            email: 'admin@vertere.com',
            papel: 'admin',
            ativo: true,
            clinica_id: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    const sessao = await login('admin@vertere.com', 'senha-correta')

    expect(sessao).toEqual({ token: 'token-123', papel: 'admin', clinicaId: null })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [, primeiraChamada] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(primeiraChamada.method).toBe('POST')

    const [segundaUrl, segundaChamada] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(segundaUrl).toContain('/auth/me')
    const cabecalhos = new Headers(segundaChamada.headers)
    expect(cabecalhos.get('Authorization')).toBe('Bearer token-123')
  })

  it('propaga o erro quando as credenciais são inválidas, sem chamar /auth/me', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(
      new Response('E-mail ou senha inválidos', { status: 401 }),
    )

    await expect(login('admin@vertere.com', 'senha-errada')).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
