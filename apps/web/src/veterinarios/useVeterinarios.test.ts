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

const dadosNovoVeterinario = {
  nome: veterinarioA.nome,
  crmv: veterinarioA.crmv,
  telefone: veterinarioA.telefone,
  email: veterinarioA.email,
  clinica_id: veterinarioA.clinica_id,
}

async function montar() {
  const hook = renderHook(() => useVeterinarios())
  await waitFor(() => expect(hook.result.current.carregando).toBe(false))
  return hook
}

async function criarDevolvendoResultado(
  result: { current: ReturnType<typeof useVeterinarios> },
  dados = dadosNovoVeterinario,
) {
  let resultado: unknown
  await act(async () => {
    resultado = await result.current.criar(dados)
  })
  return resultado
}

describe('useVeterinarios', () => {
  beforeEach(() => {
    for (const funcao of Object.values(veterinariosApi)) {
      vi.mocked(funcao).mockReset()
    }
  })

  it('carrega a lista de veterinários ao montar', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA])

    const { result } = await montar()

    expect(result.current.veterinarios).toEqual([veterinarioA])
    expect(result.current.aviso).toBeNull()
  })

  it('definirFiltroClinicaId refaz a listagem filtrada', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA]).mockResolvedValueOnce([])
    const { result } = await montar()

    await act(async () => {
      result.current.definirFiltroClinicaId('c2')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(veterinariosApi.listarVeterinarios).toHaveBeenLastCalledWith('c2', false)
  })

  it('criar bem-sucedido devolve ok e recarrega a lista', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([]).mockResolvedValueOnce([veterinarioA])
    vi.mocked(veterinariosApi.criarVeterinario).mockResolvedValueOnce(veterinarioA)
    const { result } = await montar()

    expect(await criarDevolvendoResultado(result)).toEqual({ ok: true })
    expect(result.current.veterinarios).toEqual([veterinarioA])
    expect(veterinariosApi.listarVeterinarios).toHaveBeenCalledTimes(2)
  })

  it('criar cujo veterinário não volta na recarga (filtro ativo) expõe o aviso', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValue([])
    vi.mocked(veterinariosApi.criarVeterinario).mockResolvedValueOnce(veterinarioA)
    const { result } = await montar()

    await criarDevolvendoResultado(result)

    expect(result.current.aviso).toBe(
      'Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.',
    )
  })

  it('criar com CRMV vazio (422, detalhe "CRMV não pode ser vazio") devolve a mensagem específica', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([])
    vi.mocked(veterinariosApi.criarVeterinario).mockRejectedValueOnce(
      new ErroHttp(422, '{"detail":"CRMV não pode ser vazio"}'),
    )
    const { result } = await montar()

    expect(await criarDevolvendoResultado(result, { ...dadosNovoVeterinario, crmv: '' })).toEqual({
      ok: false,
      mensagem: 'Informe o CRMV do veterinário.',
    })
    expect(result.current.erro).toBeNull()
  })

  it('criar com clínica inexistente (422, detalhe "Clínica ... não encontrada") devolve a mensagem específica', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([])
    vi.mocked(veterinariosApi.criarVeterinario).mockRejectedValueOnce(
      new ErroHttp(422, '{"detail":"Clínica c9 não encontrada"}'),
    )
    const { result } = await montar()

    expect(await criarDevolvendoResultado(result)).toEqual({
      ok: false,
      mensagem: 'A clínica selecionada não existe mais — atualize a lista de clínicas.',
    })
  })

  it('criar com CRMV duplicado (409) devolve a mensagem específica', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([])
    vi.mocked(veterinariosApi.criarVeterinario).mockRejectedValueOnce(
      new ErroHttp(409, '{"detail":"Já existe um veterinário com o CRMV 1234"}'),
    )
    const { result } = await montar()

    expect(await criarDevolvendoResultado(result)).toEqual({
      ok: false,
      mensagem: 'Já existe um veterinário cadastrado com esse CRMV.',
    })
  })

  it('editar devolve ok e recarrega a lista', async () => {
    const editado = { ...veterinarioA, telefone: '999' }
    vi.mocked(veterinariosApi.listarVeterinarios)
      .mockResolvedValueOnce([veterinarioA])
      .mockResolvedValueOnce([editado])
    vi.mocked(veterinariosApi.editarVeterinario).mockResolvedValueOnce(editado)
    const { result } = await montar()

    let resultado: unknown
    await act(async () => {
      resultado = await result.current.editar('1', {
        nome: veterinarioA.nome,
        telefone: '999',
        email: veterinarioA.email,
      })
    })

    expect(resultado).toEqual({ ok: true })
    expect(result.current.veterinarios).toEqual([editado])
    expect(veterinariosApi.listarVeterinarios).toHaveBeenCalledTimes(2)
  })

  it('inativar recarrega a lista (com "apenas ativos", o veterinário sai)', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA]).mockResolvedValueOnce([])
    vi.mocked(veterinariosApi.inativarVeterinario).mockResolvedValueOnce({ ...veterinarioA, ativo: false })
    const { result } = await montar()

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.veterinarios).toEqual([])
  })

  it('reativar recarrega a lista', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios)
      .mockResolvedValueOnce([{ ...veterinarioA, ativo: false }])
      .mockResolvedValueOnce([veterinarioA])
    vi.mocked(veterinariosApi.reativarVeterinario).mockResolvedValueOnce(veterinarioA)
    const { result } = await montar()

    await act(async () => {
      await result.current.reativar('1')
    })

    expect(result.current.veterinarios).toEqual([veterinarioA])
  })

  it('erro 404 numa ação de linha preenche o erro de tela com a mensagem específica', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA])
    vi.mocked(veterinariosApi.inativarVeterinario).mockRejectedValueOnce(
      new ErroHttp(404, '{"detail":"Veterinário 1 não encontrado"}'),
    )
    const { result } = await montar()

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(result.current.erro).toBe(
      'Veterinário não encontrado — pode ter sido removido por outra sessão.',
    )
  })

  it('definirTermoBusca refaz a listagem via buscarVeterinariosPorNome', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA])
    vi.mocked(veterinariosApi.buscarVeterinariosPorNome).mockResolvedValueOnce([])
    const { result } = await montar()

    await act(async () => {
      result.current.definirTermoBusca('joão')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(veterinariosApi.buscarVeterinariosPorNome).toHaveBeenLastCalledWith(
      'joão',
      undefined,
      false,
    )
  })

  it('definirApenasAtivos refaz a listagem com o filtro', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA]).mockResolvedValueOnce([])
    const { result } = await montar()

    await act(async () => {
      result.current.definirApenasAtivos(true)
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(veterinariosApi.listarVeterinarios).toHaveBeenLastCalledWith(undefined, true)
  })

  it('com busca ativa, a recarga depois de uma ação também usa a busca', async () => {
    vi.mocked(veterinariosApi.listarVeterinarios).mockResolvedValueOnce([veterinarioA])
    vi.mocked(veterinariosApi.buscarVeterinariosPorNome).mockResolvedValue([veterinarioA])
    vi.mocked(veterinariosApi.inativarVeterinario).mockResolvedValueOnce({ ...veterinarioA, ativo: false })
    const { result } = await montar()
    await act(async () => {
      result.current.definirTermoBusca('jo')
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.inativar('1')
    })

    expect(veterinariosApi.buscarVeterinariosPorNome).toHaveBeenCalledTimes(2)
    expect(veterinariosApi.listarVeterinarios).toHaveBeenCalledTimes(1)
  })
})
