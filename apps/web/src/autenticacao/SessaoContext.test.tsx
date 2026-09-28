import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definirHandlerNaoAutorizado } from '../api/clienteHttp'
import * as clienteAuth from './clienteAuth'
import { SessaoProvider, useSessao } from './SessaoContext'

vi.mock('./clienteAuth')

describe('SessaoProvider / useSessao', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    definirHandlerNaoAutorizado(null)
  })

  it('login bem-sucedido guarda a sessão e expõe autenticado=true', async () => {
    vi.spyOn(clienteAuth, 'login').mockResolvedValue({
      token: 'token-123',
      papel: 'admin',
      email: 'admin@vertere.com',
      clinicaId: null,
    })

    const { result } = renderHook(() => useSessao(), { wrapper: SessaoProvider })
    expect(result.current.autenticado).toBe(false)

    await act(async () => {
      await result.current.login('admin@vertere.com', 'senha-correta')
    })

    expect(result.current.autenticado).toBe(true)
    expect(result.current.papel).toBe('admin')
    expect(sessionStorage.getItem('vertere:sessao')).toContain('token-123')
  })

  it('credenciais inválidas mostram erro genérico e não guardam sessão', async () => {
    vi.spyOn(clienteAuth, 'login').mockRejectedValue(new Error('401'))

    const { result } = renderHook(() => useSessao(), { wrapper: SessaoProvider })

    await act(async () => {
      await result.current.login('admin@vertere.com', 'senha-errada')
    })

    expect(result.current.autenticado).toBe(false)
    expect(result.current.erro).toBe('E-mail ou senha inválidos')
    expect(sessionStorage.getItem('vertere:sessao')).toBeNull()
  })

  it('usuário inativo recebe a mesma mensagem genérica de credenciais inválidas', async () => {
    vi.spyOn(clienteAuth, 'login').mockRejectedValue(new Error('401'))

    const { result } = renderHook(() => useSessao(), { wrapper: SessaoProvider })

    await act(async () => {
      await result.current.login('inativo@vertere.com', 'senha-correta')
    })

    expect(result.current.erro).toBe('E-mail ou senha inválidos')
  })

  it('sair() limpa a sessão', async () => {
    vi.spyOn(clienteAuth, 'login').mockResolvedValue({
      token: 'token-123',
      papel: 'admin',
      email: 'admin@vertere.com',
      clinicaId: null,
    })
    const { result } = renderHook(() => useSessao(), { wrapper: SessaoProvider })
    await act(async () => {
      await result.current.login('admin@vertere.com', 'senha-correta')
    })
    expect(result.current.autenticado).toBe(true)

    act(() => {
      result.current.sair()
    })

    await waitFor(() => expect(result.current.autenticado).toBe(false))
    expect(sessionStorage.getItem('vertere:sessao')).toBeNull()
  })

  it('uma resposta 401 de qualquer chamada (via clienteHttp) limpa a sessão e mostra aviso (US3)', async () => {
    vi.spyOn(clienteAuth, 'login').mockResolvedValue({
      token: 'token-123',
      papel: 'admin',
      email: 'admin@vertere.com',
      clinicaId: null,
    })
    const { result } = renderHook(() => useSessao(), { wrapper: SessaoProvider })
    await act(async () => {
      await result.current.login('admin@vertere.com', 'senha-correta')
    })
    expect(result.current.autenticado).toBe(true)

    // Dispara o handler real via clienteHttp.requisitar — definirHandlerNaoAutorizado já foi
    // registrado pelo useEffect do Provider quando o hook montou acima.
    const { requisitar } = await import('../api/clienteHttp')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Sessão expirada', { status: 401 })))
    await act(async () => {
      await requisitar('/pacientes').catch(() => undefined)
    })
    vi.unstubAllGlobals()

    await waitFor(() => expect(result.current.autenticado).toBe(false))
    expect(result.current.erro).toBe('Sua sessão expirou. Faça login novamente.')
    expect(sessionStorage.getItem('vertere:sessao')).toBeNull()
  })
})
