import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as useVeterinariosModulo from './useVeterinarios'
import * as useClinicasModulo from '../clinicas/useClinicas'
import { TelaVeterinarios } from './TelaVeterinarios'

vi.mock('./useVeterinarios')
vi.mock('../clinicas/useClinicas')

const clinicaA = {
  id: 'c1',
  nome: 'Clínica A',
  cnpj: '1',
  endereco: '',
  telefone: '',
  email: '',
  ativo: true,
  prazo_pagamento_dias: null,
}

const veterinarioA = {
  id: '1',
  nome: 'Dr. João',
  crmv: '1234',
  telefone: '4730000000',
  email: 'joao@vet.com',
  clinica_id: 'c1',
  ativo: true,
}

function mockarHookVeterinarios(
  overrides: Partial<ReturnType<typeof useVeterinariosModulo.useVeterinarios>> = {},
) {
  vi.mocked(useVeterinariosModulo.useVeterinarios).mockReturnValue({
    veterinarios: [],
    carregando: false,
    erro: null,
    filtroClinicaId: undefined,
    definirFiltroClinicaId: vi.fn(),
    termoBusca: '',
    definirTermoBusca: vi.fn(),
    apenasAtivos: false,
    definirApenasAtivos: vi.fn(),
    recarregar: vi.fn(),
    criar: vi.fn(),
    editar: vi.fn(),
    inativar: vi.fn(),
    reativar: vi.fn(),
    ...overrides,
  })
}

function mockarHookClinicas(overrides: Partial<ReturnType<typeof useClinicasModulo.useClinicas>> = {}) {
  vi.mocked(useClinicasModulo.useClinicas).mockReturnValue({
    clinicas: [clinicaA],
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

describe('TelaVeterinarios', () => {
  it('renderiza a lista de veterinários vinda do hook', () => {
    mockarHookClinicas()
    mockarHookVeterinarios({ veterinarios: [veterinarioA] })
    render(<TelaVeterinarios />)
    expect(screen.getByText('Dr. João')).toBeInTheDocument()
    expect(screen.getByText('1234')).toBeInTheDocument()
  })

  it('filtro por clínica chama definirFiltroClinicaId', async () => {
    const definirFiltroClinicaId = vi.fn()
    mockarHookClinicas()
    mockarHookVeterinarios({ veterinarios: [veterinarioA], definirFiltroClinicaId })
    render(<TelaVeterinarios />)

    await userEvent.selectOptions(screen.getByLabelText(/filtrar por clínica/i), 'c1')

    expect(definirFiltroClinicaId).toHaveBeenCalledWith('c1')
  })

  it('cadastro de veterinário reflete na lista', async () => {
    const criar = vi.fn()
    mockarHookClinicas()
    mockarHookVeterinarios({ criar })
    render(<TelaVeterinarios />)

    await userEvent.click(screen.getByRole('button', { name: /novo veterinário/i }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Dr. João')
    await userEvent.type(screen.getByLabelText('CRMV'), '1234')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Dr. João', crmv: '1234' }),
    )
  })

  it('exibe o erro do hook (ex: CRMV vazio)', () => {
    mockarHookClinicas()
    mockarHookVeterinarios({ erro: 'Informe o CRMV do veterinário.' })
    render(<TelaVeterinarios />)
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o CRMV do veterinário.')
  })

  it('ação "Editar" por linha abre o formulário preenchido e salva com editar', async () => {
    const editar = vi.fn()
    mockarHookClinicas()
    mockarHookVeterinarios({ veterinarios: [veterinarioA], editar })
    render(<TelaVeterinarios />)

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Dr. João')

    await userEvent.clear(screen.getByLabelText('Telefone'))
    await userEvent.type(screen.getByLabelText('Telefone'), '999')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(editar).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ nome: 'Dr. João', telefone: '999' }),
    )
  })

  it('ação "Inativar" por linha chama inativar com o id do veterinário', async () => {
    const inativar = vi.fn()
    mockarHookClinicas()
    mockarHookVeterinarios({ veterinarios: [veterinarioA], inativar })
    render(<TelaVeterinarios />)

    await userEvent.click(screen.getByRole('button', { name: /inativar/i }))
    expect(inativar).toHaveBeenCalledWith('1')
  })

  it('ação "Reativar" por linha chama reativar com o id do veterinário', async () => {
    const reativar = vi.fn()
    mockarHookClinicas()
    mockarHookVeterinarios({ veterinarios: [{ ...veterinarioA, ativo: false }], reativar })
    render(<TelaVeterinarios />)

    await userEvent.click(screen.getByRole('button', { name: /reativar/i }))
    expect(reativar).toHaveBeenCalledWith('1')
  })

  it('campo de busca chama definirTermoBusca com o texto digitado', () => {
    const definirTermoBusca = vi.fn()
    mockarHookClinicas()
    mockarHookVeterinarios({ definirTermoBusca })
    render(<TelaVeterinarios />)

    fireEvent.change(screen.getByLabelText(/buscar por nome/i), { target: { value: 'joão' } })

    expect(definirTermoBusca).toHaveBeenCalledWith('joão')
  })

  it('checkbox "apenas ativos" chama definirApenasAtivos', async () => {
    const definirApenasAtivos = vi.fn()
    mockarHookClinicas()
    mockarHookVeterinarios({ definirApenasAtivos })
    render(<TelaVeterinarios />)

    await userEvent.click(screen.getByLabelText(/apenas ativos/i))

    expect(definirApenasAtivos).toHaveBeenCalledWith(true)
  })

  it('sem clínica ativa cadastrada, o formulário orienta em vez de permitir submissão', async () => {
    mockarHookClinicas({ clinicas: [] })
    mockarHookVeterinarios()
    render(<TelaVeterinarios />)

    await userEvent.click(screen.getByRole('button', { name: /novo veterinário/i }))

    expect(
      screen.getByText(/nenhuma clínica ativa cadastrada/i),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('CRMV')).not.toBeInTheDocument()
  })
})
