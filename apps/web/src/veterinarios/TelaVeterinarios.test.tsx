import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { usuario } from '../../tests/usuario'
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
    aviso: null,
    filtroClinicaId: undefined,
    definirFiltroClinicaId: vi.fn(),
    termoBusca: '',
    definirTermoBusca: vi.fn(),
    apenasAtivos: false,
    definirApenasAtivos: vi.fn(),
    recarregar: vi.fn(),
    criar: vi.fn().mockResolvedValue({ ok: true }),
    editar: vi.fn().mockResolvedValue({ ok: true }),
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
    aviso: null,
    termoBusca: '',
    definirTermoBusca: vi.fn(),
    apenasAtivas: false,
    definirApenasAtivas: vi.fn(),
    recarregar: vi.fn(),
    criar: vi.fn().mockResolvedValue({ ok: true }),
    editar: vi.fn().mockResolvedValue({ ok: true }),
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
    const criar = vi.fn().mockResolvedValue({ ok: true })
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
    const editar = vi.fn().mockResolvedValue({ ok: true })
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

describe('TelaVeterinarios — formulários fecham só com sucesso (US1)', () => {
  it('criar com falha mantém o formulário aberto, com os valores e a mensagem', async () => {
    mockarHookClinicas()
    mockarHookVeterinarios({ criar: vi.fn().mockResolvedValue({ ok: false, mensagem: 'm' }) })
    render(<TelaVeterinarios />)
    const u = usuario()

    await u.click(screen.getByRole('button', { name: 'Novo veterinário' }))
    await u.type(screen.getByLabelText('Nome'), 'Dr. Novo')
    await u.type(screen.getByLabelText('CRMV'), '999')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('m')
    expect(screen.getByLabelText('CRMV')).toHaveValue('999')
  })

  it('criar com sucesso fecha o formulário', async () => {
    mockarHookClinicas()
    mockarHookVeterinarios()
    render(<TelaVeterinarios />)
    const u = usuario()

    await u.click(screen.getByRole('button', { name: 'Novo veterinário' }))
    await u.type(screen.getByLabelText('Nome'), 'Dr. Novo')
    await u.type(screen.getByLabelText('CRMV'), '999')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.queryByLabelText('CRMV')).not.toBeInTheDocument()
  })

  it('"Cancelar" no formulário novo fecha sem chamar criar', async () => {
    const criar = vi.fn().mockResolvedValue({ ok: true })
    mockarHookClinicas()
    mockarHookVeterinarios({ criar })
    render(<TelaVeterinarios />)
    const u = usuario()

    await u.click(screen.getByRole('button', { name: 'Novo veterinário' }))
    await u.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('CRMV')).not.toBeInTheDocument()
    expect(criar).not.toHaveBeenCalled()
  })

  it('editar com falha mantém a linha em edição com os valores e a mensagem', async () => {
    mockarHookClinicas()
    mockarHookVeterinarios({
      veterinarios: [veterinarioA],
      editar: vi.fn().mockResolvedValue({ ok: false, mensagem: 'm' }),
    })
    render(<TelaVeterinarios />)
    const u = usuario()

    await u.click(screen.getByRole('button', { name: 'Editar' }))
    await u.clear(screen.getByLabelText('Telefone'))
    await u.type(screen.getByLabelText('Telefone'), '999')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('m')
    expect(screen.getByLabelText('Telefone')).toHaveValue('999')
  })

  it('"Cancelar" na edição descarta a alteração: reabrir mostra o valor original', async () => {
    const editar = vi.fn().mockResolvedValue({ ok: true })
    mockarHookClinicas()
    mockarHookVeterinarios({ veterinarios: [veterinarioA], editar })
    render(<TelaVeterinarios />)
    const u = usuario()

    await u.click(screen.getByRole('button', { name: 'Editar' }))
    await u.clear(screen.getByLabelText('Telefone'))
    await u.type(screen.getByLabelText('Telefone'), '999')
    await u.click(screen.getByRole('button', { name: 'Cancelar' }))
    await u.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByLabelText('Telefone')).toHaveValue('4730000000')
    expect(editar).not.toHaveBeenCalled()
  })

  it('a linha em edição ocupa as 6 colunas da tabela (FR-019)', async () => {
    mockarHookClinicas()
    mockarHookVeterinarios({ veterinarios: [veterinarioA] })
    render(<TelaVeterinarios />)

    await usuario().click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByLabelText('CRMV').closest('td')).toHaveAttribute('colspan', '6')
  })
})

describe('TelaVeterinarios — aviso de item fora do filtro (US4)', () => {
  it('mostra o aviso do hook em role="status", distinto do alerta de erro', () => {
    mockarHookClinicas()
    mockarHookVeterinarios({ aviso: 'Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.' })
    render(<TelaVeterinarios />)

    expect(screen.getByRole('status')).toHaveTextContent('Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
