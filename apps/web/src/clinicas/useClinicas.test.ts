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

  it('editar atualiza a clínica correspondente no estado local', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    const editada = { ...clinicaA, telefone: '999' }
    vi.mocked(clinicasApi.editarClinica).mockResolvedValueOnce(editada)

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.editar('1', {
        nome: clinicaA.nome,
        endereco: clinicaA.endereco,
        telefone: '999',
        email: clinicaA.email,
      })
    })

    expect(result.current.clinicas).toEqual([editada])
    expect(clinicasApi.listarClinicas).toHaveBeenCalledTimes(1)
  })

  it('inativar atualiza o status da clínica no estado local', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    const inativada = { ...clinicaA, ativo: false }
    vi.mocked(clinicasApi.inativarClinica).mockResolvedValueOnce(inativada)

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.clinicas).toEqual([inativada])
  })

  it('reativar atualiza o status da clínica no estado local', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([{ ...clinicaA, ativo: false }])
    vi.mocked(clinicasApi.reativarClinica).mockResolvedValueOnce(clinicaA)

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.reativar('1')
    })

    expect(result.current.clinicas).toEqual([clinicaA])
  })

  it('definirPrazoPagamento atualiza o prazo da clínica no estado local', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    const comNovoPrazo = { ...clinicaA, prazo_pagamento_dias: 45 }
    vi.mocked(clinicasApi.definirPrazoPagamento).mockResolvedValueOnce(comNovoPrazo)

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.definirPrazoPagamento('1', 45)
    })

    expect(result.current.clinicas).toEqual([comNovoPrazo])
  })

  it('erro HTTP 404 em qualquer ação de edição resulta na mensagem específica', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    vi.mocked(clinicasApi.inativarClinica).mockRejectedValueOnce(
      new ErroHttp(404, '{"detail":"Clínica 1 não encontrada"}'),
    )

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.erro).toBe(
      'Clínica não encontrada — pode ter sido removida por outra sessão.',
    )
  })

  it('definirTermoBusca refaz a listagem via buscarClinicasPorNome', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    vi.mocked(clinicasApi.buscarClinicasPorNome).mockResolvedValueOnce([])

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      result.current.definirTermoBusca('clínica')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(clinicasApi.buscarClinicasPorNome).toHaveBeenLastCalledWith('clínica', false)
  })

  it('termo de busca vazio volta a usar listarClinicas', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    vi.mocked(clinicasApi.buscarClinicasPorNome).mockResolvedValueOnce([])
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      result.current.definirTermoBusca('x')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      result.current.definirTermoBusca('')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(clinicasApi.listarClinicas).toHaveBeenLastCalledWith(false)
  })

  it('definirApenasAtivas refaz a listagem com o filtro', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([])

    const { result } = renderHook(() => useClinicas())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      result.current.definirApenasAtivas(true)
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(clinicasApi.listarClinicas).toHaveBeenLastCalledWith(true)
  })
})
