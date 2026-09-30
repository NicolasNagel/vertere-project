import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as SessaoContextModulo from '../autenticacao/SessaoContext'
import * as useExamesModulo from './useExames'
import * as useRegrasPlantaoModulo from './useRegrasPlantao'
import { TelaExames } from './TelaExames'

vi.mock('./useExames')
vi.mock('./useRegrasPlantao')
vi.mock('../autenticacao/SessaoContext')

const exameA = {
  id: '1',
  categoria: 'Hematologia',
  nome: 'Hemograma completo',
  preco_base: '50.00',
  ativo: true,
}

function mockarUseExames(overrides: Partial<ReturnType<typeof useExamesModulo.useExames>> = {}) {
  vi.mocked(useExamesModulo.useExames).mockReturnValue({
    exames: [],
    carregando: false,
    erro: null,
    categoria: undefined,
    definirCategoria: vi.fn(),
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

const regraA = {
  id: '1',
  dia_semana: 4,
  hora_inicio: '18:00:00',
  hora_fim: '06:00:00',
  valor_adicional: '50.00',
  ativo: true,
}

function mockarUseRegrasPlantao(
  overrides: Partial<ReturnType<typeof useRegrasPlantaoModulo.useRegrasPlantao>> = {},
) {
  vi.mocked(useRegrasPlantaoModulo.useRegrasPlantao).mockReturnValue({
    regras: [],
    carregando: false,
    erro: null,
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

function mockarPapel(papel: 'admin' | 'atendente' | 'tecnico') {
  vi.mocked(SessaoContextModulo.useSessao).mockReturnValue({
    autenticado: true,
    papel,
    email: 'usuario@vertere.com',
    erro: null,
    carregando: false,
    login: vi.fn(),
    sair: vi.fn(),
  })
}

describe('TelaExames', () => {
  beforeEach(() => {
    mockarUseRegrasPlantao()
  })

  it('renderiza a lista de exames vinda do hook para os 3 papéis de staff', () => {
    mockarUseExames({ exames: [exameA] })
    mockarPapel('atendente')
    render(<TelaExames />)
    expect(screen.getByText('Hemograma completo')).toBeInTheDocument()
  })

  it('só admin vê o botão "Novo exame"', () => {
    mockarUseExames()
    mockarPapel('admin')
    render(<TelaExames />)
    expect(screen.getByRole('button', { name: /novo exame/i })).toBeInTheDocument()
  })

  it('atendente e técnico não veem o botão "Novo exame"', () => {
    mockarUseExames()
    mockarPapel('atendente')
    render(<TelaExames />)
    expect(screen.queryByRole('button', { name: /novo exame/i })).not.toBeInTheDocument()
  })

  it('admin cadastra um exame novo abrindo o formulário', async () => {
    const criar = vi.fn()
    mockarUseExames({ criar })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /novo exame/i }))
    await userEvent.type(screen.getByLabelText('Categoria'), 'Hematologia')
    await userEvent.type(screen.getByLabelText('Nome'), 'Hemograma completo')
    await userEvent.type(screen.getByLabelText('Preço-base'), '50')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ categoria: 'Hematologia', nome: 'Hemograma completo' }),
    )
  })

  it('admin vê ações "Editar"/"Inativar" por linha; atendente e técnico não veem', () => {
    mockarUseExames({ exames: [exameA] })
    mockarPapel('admin')
    const { rerender } = render(<TelaExames />)
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inativar/i })).toBeInTheDocument()

    mockarPapel('tecnico')
    rerender(<TelaExames />)
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /inativar/i })).not.toBeInTheDocument()
  })

  it('ação "Editar" por linha abre o formulário preenchido e salva com editar', async () => {
    const editar = vi.fn()
    mockarUseExames({ exames: [exameA], editar })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Hemograma completo')

    await userEvent.clear(screen.getByLabelText('Preço-base'))
    await userEvent.type(screen.getByLabelText('Preço-base'), '80')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(editar).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ nome: 'Hemograma completo', preco_base: '80' }),
    )
  })

  it('ação "Inativar" por linha chama inativar com o id do exame', async () => {
    const inativar = vi.fn()
    mockarUseExames({ exames: [exameA], inativar })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /inativar/i }))
    expect(inativar).toHaveBeenCalledWith('1')
  })

  it('ação "Reativar" por linha chama reativar com o id do exame', async () => {
    const reativar = vi.fn()
    mockarUseExames({ exames: [{ ...exameA, ativo: false }], reativar })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /reativar/i }))
    expect(reativar).toHaveBeenCalledWith('1')
  })

  it('aba "Regras de Plantão" visível para admin e atendente, ausente para técnico', () => {
    mockarUseExames()
    mockarPapel('admin')
    const { rerender } = render(<TelaExames />)
    expect(screen.getByRole('button', { name: /regras de plantão/i })).toBeInTheDocument()

    mockarPapel('atendente')
    rerender(<TelaExames />)
    expect(screen.getByRole('button', { name: /regras de plantão/i })).toBeInTheDocument()

    mockarPapel('tecnico')
    rerender(<TelaExames />)
    expect(screen.queryByRole('button', { name: /regras de plantão/i })).not.toBeInTheDocument()
  })

  it('aba "Regras de Plantão" lista as regras e só admin vê "Nova regra"', async () => {
    mockarUseExames()
    mockarUseRegrasPlantao({ regras: [regraA] })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /regras de plantão/i }))
    expect(screen.getByRole('button', { name: /nova regra/i })).toBeInTheDocument()
  })

  it('atendente vê a lista de regras de plantão sem o botão "Nova regra"', async () => {
    mockarUseExames()
    mockarUseRegrasPlantao({ regras: [regraA] })
    mockarPapel('atendente')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /regras de plantão/i }))
    expect(screen.queryByRole('button', { name: /nova regra/i })).not.toBeInTheDocument()
  })

  it('admin cadastra uma regra de plantão nova abrindo o formulário', async () => {
    const criar = vi.fn()
    mockarUseExames()
    mockarUseRegrasPlantao({ criar })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /regras de plantão/i }))
    await userEvent.click(screen.getByRole('button', { name: /nova regra/i }))
    await userEvent.type(screen.getByLabelText('Horário de início'), '18:00')
    await userEvent.type(screen.getByLabelText('Horário de fim'), '06:00')
    await userEvent.type(screen.getByLabelText('Valor adicional'), '50')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ hora_inicio: '18:00', hora_fim: '06:00' }),
    )
  })

  it('admin vê ações "Editar"/"Inativar" por linha de regra de plantão; atendente não vê', async () => {
    mockarUseExames()
    mockarUseRegrasPlantao({ regras: [regraA] })
    mockarPapel('admin')
    const { rerender } = render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /regras de plantão/i }))
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inativar/i })).toBeInTheDocument()

    mockarPapel('atendente')
    rerender(<TelaExames />)
    await userEvent.click(screen.getByRole('button', { name: /regras de plantão/i }))
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /inativar/i })).not.toBeInTheDocument()
  })

  it('ação "Editar" por linha de regra de plantão abre o formulário preenchido e salva com editar', async () => {
    const editar = vi.fn()
    mockarUseExames()
    mockarUseRegrasPlantao({ regras: [regraA], editar })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /regras de plantão/i }))
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect(screen.getByLabelText('Horário de início')).toHaveValue('18:00')

    await userEvent.clear(screen.getByLabelText('Valor adicional'))
    await userEvent.type(screen.getByLabelText('Valor adicional'), '80')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(editar).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ hora_inicio: '18:00', valor_adicional: '80' }),
    )
  })

  it('ação "Inativar" por linha de regra de plantão chama inativar com o id da regra', async () => {
    const inativar = vi.fn()
    mockarUseExames()
    mockarUseRegrasPlantao({ regras: [regraA], inativar })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /regras de plantão/i }))
    await userEvent.click(screen.getByRole('button', { name: /inativar/i }))
    expect(inativar).toHaveBeenCalledWith('1')
  })

  it('ação "Reativar" por linha de regra de plantão chama reativar com o id da regra', async () => {
    const reativar = vi.fn()
    mockarUseExames()
    mockarUseRegrasPlantao({ regras: [{ ...regraA, ativo: false }], reativar })
    mockarPapel('admin')
    render(<TelaExames />)

    await userEvent.click(screen.getByRole('button', { name: /regras de plantão/i }))
    await userEvent.click(screen.getByRole('button', { name: /reativar/i }))
    expect(reativar).toHaveBeenCalledWith('1')
  })
})
