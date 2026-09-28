import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as clienteAuth from './clienteAuth'
import { useSessao } from './useSessao'

vi.mock('./clienteAuth')

describe('useSessao', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('login bem-sucedido guarda a sessão e expõe autenticado=true', async () => {
    vi.spyOn(clienteAuth, 'login').mockResolvedValue({
      token: 'token-123',
      papel: 'admin',
      clinicaId: null,
    })

    const { result } = renderHook(() => useSessao())
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

    const { result } = renderHook(() => useSessao())

    await act(async () => {
      await result.current.login('admin@vertere.com', 'senha-errada')
    })

    expect(result.current.autenticado).toBe(false)
    expect(result.current.erro).toBe('E-mail ou senha inválidos')
    expect(sessionStorage.getItem('vertere:sessao')).toBeNull()
  })

  it('usuário inativo recebe a mesma mensagem genérica de credenciais inválidas', async () => {
    vi.spyOn(clienteAuth, 'login').mockRejectedValue(new Error('401'))

    const { result } = renderHook(() => useSessao())

    await act(async () => {
      await result.current.login('inativo@vertere.com', 'senha-correta')
    })

    expect(result.current.erro).toBe('E-mail ou senha inválidos')
  })

  it('sair() limpa a sessão', async () => {
    vi.spyOn(clienteAuth, 'login').mockResolvedValue({
      token: 'token-123',
      papel: 'admin',
      clinicaId: null,
    })
    const { result } = renderHook(() => useSessao())
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
})
