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

const dadosNovaClinica = {
  nome: clinicaA.nome,
  cnpj: clinicaA.cnpj,
  endereco: clinicaA.endereco,
  telefone: clinicaA.telefone,
  email: clinicaA.email,
}

async function montar() {
  const hook = renderHook(() => useClinicas())
  await waitFor(() => expect(hook.result.current.carregando).toBe(false))
  return hook
}

describe('useClinicas', () => {
  beforeEach(() => {
    for (const funcao of Object.values(clinicasApi)) {
      vi.mocked(funcao).mockReset()
    }
  })

  it('carrega a lista de clínicas ao montar', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])

    const { result } = await montar()

    expect(result.current.clinicas).toEqual([clinicaA])
    expect(result.current.aviso).toBeNull()
  })

  it('criar bem-sucedido devolve ok e recarrega a lista', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([]).mockResolvedValueOnce([clinicaA])
    vi.mocked(clinicasApi.criarClinica).mockResolvedValueOnce(clinicaA)
    const { result } = await montar()

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar(dadosNovaClinica)
    })

    expect(resultado).toEqual({ ok: true })
    expect(result.current.clinicas).toEqual([clinicaA])
    expect(clinicasApi.listarClinicas).toHaveBeenCalledTimes(2)
  })

  it('criar cuja clínica não volta na recarga (filtro ativo) expõe o aviso', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValue([])
    vi.mocked(clinicasApi.criarClinica).mockResolvedValueOnce(clinicaA)
    const { result } = await montar()

    await act(async () => {
      await result.current.criar(dadosNovaClinica)
    })

    expect(result.current.aviso).toBe(
      'Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.',
    )
  })

  it('criar com CNPJ inválido (422) devolve a mensagem específica sem preencher o erro de tela', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([])
    vi.mocked(clinicasApi.criarClinica).mockRejectedValueOnce(
      new ErroHttp(422, '{"detail":"CNPJ inválido"}'),
    )
    const { result } = await montar()

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar({ ...dadosNovaClinica, cnpj: 'invalido' })
    })

    expect(resultado).toEqual({
      ok: false,
      mensagem: 'CNPJ inválido — verifique o formato informado.',
    })
    expect(result.current.erro).toBeNull()
  })

  it('criar com CNPJ duplicado (409) devolve a mensagem específica', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([])
    vi.mocked(clinicasApi.criarClinica).mockRejectedValueOnce(
      new ErroHttp(409, '{"detail":"Já existe uma clínica com o CNPJ 123"}'),
    )
    const { result } = await montar()

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.criar(dadosNovaClinica)
    })

    expect(resultado).toEqual({
      ok: false,
      mensagem: 'Já existe uma clínica cadastrada com esse CNPJ.',
    })
  })

  it('editar devolve ok e recarrega a lista', async () => {
    const editada = { ...clinicaA, telefone: '999' }
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA]).mockResolvedValueOnce([editada])
    vi.mocked(clinicasApi.editarClinica).mockResolvedValueOnce(editada)
    const { result } = await montar()

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.editar('1', {
        nome: clinicaA.nome,
        endereco: clinicaA.endereco,
        telefone: '999',
        email: clinicaA.email,
      })
    })

    expect(resultado).toEqual({ ok: true })
    expect(result.current.clinicas).toEqual([editada])
    expect(clinicasApi.listarClinicas).toHaveBeenCalledTimes(2)
  })

  it('inativar recarrega a lista (com "apenas ativas", a clínica sai)', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA]).mockResolvedValueOnce([])
    vi.mocked(clinicasApi.inativarClinica).mockResolvedValueOnce({ ...clinicaA, ativo: false })
    const { result } = await montar()

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.clinicas).toEqual([])
  })

  it('reativar recarrega a lista', async () => {
    vi.mocked(clinicasApi.listarClinicas)
      .mockResolvedValueOnce([{ ...clinicaA, ativo: false }])
      .mockResolvedValueOnce([clinicaA])
    vi.mocked(clinicasApi.reativarClinica).mockResolvedValueOnce(clinicaA)
    const { result } = await montar()

    await act(async () => {
      await result.current.reativar('1')
    })

    expect(result.current.clinicas).toEqual([clinicaA])
  })

  it('definirPrazoPagamento recarrega a lista', async () => {
    const comNovoPrazo = { ...clinicaA, prazo_pagamento_dias: 45 }
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA]).mockResolvedValueOnce([comNovoPrazo])
    vi.mocked(clinicasApi.definirPrazoPagamento).mockResolvedValueOnce(comNovoPrazo)
    const { result } = await montar()

    await act(async () => {
      await result.current.definirPrazoPagamento('1', 45)
    })

    expect(clinicasApi.definirPrazoPagamento).toHaveBeenCalledWith('1', 45)
    expect(result.current.clinicas).toEqual([comNovoPrazo])
  })

  it('erro 404 numa ação de linha preenche o erro de tela com a mensagem específica', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    vi.mocked(clinicasApi.inativarClinica).mockRejectedValueOnce(
      new ErroHttp(404, '{"detail":"Clínica 1 não encontrada"}'),
    )
    const { result } = await montar()

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
    const { result } = await montar()

    await act(async () => {
      result.current.definirTermoBusca('clínica')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(clinicasApi.buscarClinicasPorNome).toHaveBeenLastCalledWith('clínica', false)
  })

  it('termo de busca vazio volta a usar listarClinicas', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValue([clinicaA])
    vi.mocked(clinicasApi.buscarClinicasPorNome).mockResolvedValueOnce([])
    const { result } = await montar()

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
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA]).mockResolvedValueOnce([])
    const { result } = await montar()

    await act(async () => {
      result.current.definirApenasAtivas(true)
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(clinicasApi.listarClinicas).toHaveBeenLastCalledWith(true)
  })

  it('com busca ativa, a recarga depois de uma ação também usa a busca', async () => {
    vi.mocked(clinicasApi.listarClinicas).mockResolvedValueOnce([clinicaA])
    vi.mocked(clinicasApi.buscarClinicasPorNome).mockResolvedValue([clinicaA])
    vi.mocked(clinicasApi.inativarClinica).mockResolvedValueOnce({ ...clinicaA, ativo: false })
    const { result } = await montar()
    await act(async () => {
      result.current.definirTermoBusca('A')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(clinicasApi.buscarClinicasPorNome).toHaveBeenCalledTimes(2)
    expect(clinicasApi.listarClinicas).toHaveBeenCalledTimes(1)
  })
})
