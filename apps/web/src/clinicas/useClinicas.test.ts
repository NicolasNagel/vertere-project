import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroHttp } from '../api/clienteHttp'
import * as clinicasApi from './clinicasApi'
import { useClinicas } from './useClinicas'

vi.mock('./clinicasApi')

const clinicaA = {
  id: '1',
  nome: 'Clínica A',
  cnpj: '12345678000199',
  endereco: 'Rua X',
  telefone: '4730000000',
  email: 'a@clinica.com',
  ativo: true,
  prazo_pagamento_dias: 30,
}

describe('useClinicas', () => {
  beforeEach(() => {
    vi.mocked(clinicasApi.listarClinicas).mockReset()
    vi.mocked(clinicasApi.criarClinica).mockReset()
  })

  it('carrega a lista de clínicas ao montar', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])

    const { result } = renderHook(() => useClinicas())

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.clinicas).toEqual([clinicaA])
  })

  it('criar bem-sucedido adiciona a clínica ao estado local sem novo GET', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([])
    vi.mocked(clinicasApi.criarClinica).mockResolvedValueOnce(clinicaA)

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        nome: clinicaA.nome,
        cnpj: clinicaA.cnpj,
        endereco: clinicaA.endereco,
        telefone: clinicaA.telefone,
        email: clinicaA.email,
      })
    })

    expect(result.current.clinicas).toEqual([clinicaA])
    expect(clinicasApi.listarClinicas).toHaveBeenCalledTimes(1)
  })

  it('criar com CNPJ inválido (422) resulta na mensagem de erro específica', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([])
    vi.mocked(clinicasApi.criarClinica).mockRejectedValueOnce(
      new ErroHttp(422, '{"detail":"CNPJ inválido"}'),
    )

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        nome: clinicaA.nome,
        cnpj: 'invalido',
        endereco: clinicaA.endereco,
        telefone: clinicaA.telefone,
        email: clinicaA.email,
      })
    })

    expect(result.current.erro).toBe('CNPJ inválido — verifique o formato informado.')
  })

  it('criar com CNPJ duplicado (409) resulta na mensagem de erro específica', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([])
    vi.mocked(clinicasApi.criarClinica).mockRejectedValueOnce(
      new ErroHttp(409, '{"detail":"Já existe uma clínica com o CNPJ 123"}'),
    )

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        nome: clinicaA.nome,
        cnpj: clinicaA.cnpj,
        endereco: clinicaA.endereco,
        telefone: clinicaA.telefone,
        email: clinicaA.email,
      })
    })

    expect(result.current.erro).toBe('Já existe uma clínica cadastrada com esse CNPJ.')
  })
})
