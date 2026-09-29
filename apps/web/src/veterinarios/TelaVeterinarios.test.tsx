import { render, screen } from '@testing-library/react'
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
    recarregar: vi.fn(),
    criar: vi.fn(),
    ...overrides,
  })
}

function mockarHookClinicas(overrides: Partial<ReturnType<typeof useClinicasModulo.useClinicas>> = {}) {
  vi.mocked(useClinicasModulo.useClinicas).mockReturnValue({
    clinicas: [clinicaA],
    carregando: false,
    erro: null,
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
})
