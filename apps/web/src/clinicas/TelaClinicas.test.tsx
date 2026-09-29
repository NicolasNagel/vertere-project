import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as useClinicasModulo from './useClinicas'
import { TelaClinicas } from './TelaClinicas'

vi.mock('./useClinicas')

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

function mockarHook(overrides: Partial<ReturnType<typeof useClinicasModulo.useClinicas>> = {}) {
  vi.mocked(useClinicasModulo.useClinicas).mockReturnValue({
    clinicas: [],
    carregando: false,
    erro: null,
    termoBusca: '',
    definirTermoBusca: vi.fn(),
    apenasAtivas: false,
    definirApenasAtivas: vi.fn(),
    recarregar: vi.fn(),
    criar: vi.fn(),
    editar: vi.fn(),
    inativar: vi.fn(),
    reativar: vi.fn(),
    definirPrazoPagamento: vi.fn(),
    ...overrides,
  })
}

describe('TelaClinicas', () => {
  it('renderiza a lista de clínicas vinda do hook', () => {
    mockarHook({ clinicas: [clinicaA] })
    render(<TelaClinicas />)
    expect(screen.getByText('Clínica A')).toBeInTheDocument()
    expect(screen.getByText('12345678000199')).toBeInTheDocument()
  })

  it('abre o formulário e cadastra uma clínica nova ao confirmar', async () => {
    const criar = vi.fn()
    mockarHook({ criar })
    render(<TelaClinicas />)

    await userEvent.click(screen.getByRole('button', { name: /nova clínica/i }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Clínica Nova')
    await userEvent.type(screen.getByLabelText('CNPJ'), '99988877000111')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Clínica Nova', cnpj: '99988877000111' }),
    )
  })

  it('exibe o erro do hook (ex: CNPJ duplicado)', () => {
    mockarHook({ erro: 'Já existe uma clínica cadastrada com esse CNPJ.' })
    render(<TelaClinicas />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Já existe uma clínica cadastrada com esse CNPJ.',
    )
  })

  it('ação "Editar" por linha abre o formulário preenchido e salva com editar', async () => {
    const editar = vi.fn()
    mockarHook({ clinicas: [clinicaA], editar })
    render(<TelaClinicas />)

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Clínica A')

    await userEvent.clear(screen.getByLabelText('Telefone'))
    await userEvent.type(screen.getByLabelText('Telefone'), '999')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(editar).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ nome: 'Clínica A', telefone: '999' }),
    )
  })

  it('ação "Inativar" por linha chama inativar com o id da clínica', async () => {
    const inativar = vi.fn()
    mockarHook({ clinicas: [clinicaA], inativar })
    render(<TelaClinicas />)

    await userEvent.click(screen.getByRole('button', { name: /inativar/i }))
    expect(inativar).toHaveBeenCalledWith('1')
  })

  it('ação "Reativar" por linha chama reativar com o id da clínica', async () => {
    const reativar = vi.fn()
    mockarHook({ clinicas: [{ ...clinicaA, ativo: false }], reativar })
    render(<TelaClinicas />)

    await userEvent.click(screen.getByRole('button', { name: /reativar/i }))
    expect(reativar).toHaveBeenCalledWith('1')
  })

  it('campo de prazo de pagamento por linha salva o novo valor', async () => {
    const definirPrazoPagamento = vi.fn()
    mockarHook({ clinicas: [clinicaA], definirPrazoPagamento })
    render(<TelaClinicas />)

    const campoPrazo = screen.getByLabelText(/prazo de pagamento/i)
    await userEvent.clear(campoPrazo)
    await userEvent.type(campoPrazo, '45')
    await userEvent.click(screen.getByRole('button', { name: /salvar prazo/i }))

    expect(definirPrazoPagamento).toHaveBeenCalledWith('1', 45)
  })

  it('campo de busca chama definirTermoBusca com o texto digitado', async () => {
    const definirTermoBusca = vi.fn()
    mockarHook({ definirTermoBusca })
    render(<TelaClinicas />)

    fireEvent.change(screen.getByLabelText(/buscar por nome/i), { target: { value: 'vet' } })

    expect(definirTermoBusca).toHaveBeenCalledWith('vet')
  })

  it('checkbox "apenas ativas" chama definirApenasAtivas', async () => {
    const definirApenasAtivas = vi.fn()
    mockarHook({ definirApenasAtivas })
    render(<TelaClinicas />)

    await userEvent.click(screen.getByLabelText(/apenas ativas/i))

    expect(definirApenasAtivas).toHaveBeenCalledWith(true)
  })
})
