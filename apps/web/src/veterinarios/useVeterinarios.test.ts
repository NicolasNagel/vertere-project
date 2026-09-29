import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroHttp } from '../api/clienteHttp'
import * as veterinariosApi from './veterinariosApi'
import { useVeterinarios } from './useVeterinarios'

vi.mock('./veterinariosApi')

const veterinarioA = {
  id: '1',
  nome: 'Dr. João',
  crmv: '1234',
  telefone: '4730000000',
  email: 'joao@vet.com',
  clinica_id: 'c1',
  ativo: true,
}

describe('useVeterinarios', () => {
  beforeEach(() => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockReset()
    vi.mocked(veterinariosApi.criarVeterinario).mockReset()
  })

  it('carrega a lista de veterinários ao montar', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA])

    const { result } = renderHook(() => useVeterinarios())

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.veterinarios).toEqual([veterinarioA])
  })

  it('definirFiltroClinicaId refaz a listagem filtrada', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA])
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([])

    const { result } = renderHook(() => useVeterinarios())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      result.current.definirFiltroClinicaId('c2')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(veterinariosApi.listarVeterinarios).toHaveBeenLastCalledWith('c2', false)
  })

  it('criar bem-sucedido adiciona o veterinário ao estado local', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([])
    vi.mocked(veterinariosApi.criarVeterinario).mockResolvedValueOnce(veterinarioA)

    const { result } = renderHook(() => useVeterinarios())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        nome: veterinarioA.nome,
        crmv: veterinarioA.crmv,
        telefone: veterinarioA.telefone,
        email: veterinarioA.email,
        clinica_id: veterinarioA.clinica_id,
      })
    })

    expect(result.current.veterinarios).toEqual([veterinarioA])
  })

  it('criar com CRMV vazio (422, detalhe "CRMV não pode ser vazio") resulta na mensagem específica', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([])
    vi.mocked(veterinariosApi.criarVeterinario).mockRejectedValueOnce(
      new ErroHttp(422, '{"detail":"CRMV não pode ser vazio"}'),
    )

    const { result } = renderHook(() => useVeterinarios())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        nome: veterinarioA.nome,
        crmv: '',
        telefone: veterinarioA.telefone,
        email: veterinarioA.email,
        clinica_id: veterinarioA.clinica_id,
      })
    })

    expect(result.current.erro).toBe('Informe o CRMV do veterinário.')
  })

  it('criar com clínica inexistente (422, detalhe "Clínica ... não encontrada") resulta na mensagem específica', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([])
    vi.mocked(veterinariosApi.criarVeterinario).mockRejectedValueOnce(
      new ErroHttp(422, '{"detail":"Clínica x não encontrada"}'),
    )

    const { result } = renderHook(() => useVeterinarios())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        nome: veterinarioA.nome,
        crmv: veterinarioA.crmv,
        telefone: veterinarioA.telefone,
        email: veterinarioA.email,
        clinica_id: 'inexistente',
      })
    })

    expect(result.current.erro).toBe(
      'A clínica selecionada não existe mais — atualize a lista de clínicas.',
    )
  })

  it('criar com CRMV duplicado (409) resulta na mensagem específica', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([])
    vi.mocked(veterinariosApi.criarVeterinario).mockRejectedValueOnce(
      new ErroHttp(409, '{"detail":"Já existe um veterinário com o CRMV 1234"}'),
    )

    const { result } = renderHook(() => useVeterinarios())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.criar({
        nome: veterinarioA.nome,
        crmv: veterinarioA.crmv,
        telefone: veterinarioA.telefone,
        email: veterinarioA.email,
        clinica_id: veterinarioA.clinica_id,
      })
    })

    expect(result.current.erro).toBe('Já existe um veterinário cadastrado com esse CRMV.')
  })
})
