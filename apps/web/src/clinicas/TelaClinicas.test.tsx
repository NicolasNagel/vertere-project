import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usuario } from '../../tests/usuario'
import * as SessaoContextModulo from '../autenticacao/SessaoContext'
import * as useClinicasModulo from './useClinicas'
import { TelaClinicas } from './TelaClinicas'

vi.mock('./useClinicas')
vi.mock('../autenticacao/SessaoContext')

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

// Os testes anteriores à S14 assumem quem pode gerenciar clínicas.
beforeEach(() => {
  mockarPapel('admin')
})

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

describe('TelaClinicas', () => {
  it('renderiza a lista de clínicas vinda do hook', () => {
    mockarHook({ clinicas: [clinicaA] })
    render(<TelaClinicas />)
    expect(screen.getByText('Clínica A')).toBeInTheDocument()
    expect(screen.getByText('12345678000199')).toBeInTheDocument()
  })

  it('abre o formulário e cadastra uma clínica nova ao confirmar', async () => {
    const criar = vi.fn().mockResolvedValue({ ok: true })
    mockarHook({ criar })
    render(<TelaClinicas />)

    await usuario().click(screen.getByRole('button', { name: /nova clínica/i }))
    await usuario().type(screen.getByLabelText('Nome'), 'Clínica Nova')
    await usuario().type(screen.getByLabelText('CNPJ'), '99988877000111')
    await usuario().click(screen.getByRole('button', { name: /salvar/i }))

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
    const editar = vi.fn().mockResolvedValue({ ok: true })
    mockarHook({ clinicas: [clinicaA], editar })
    render(<TelaClinicas />)

    await usuario().click(screen.getByRole('button', { name: /editar/i }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Clínica A')

    await usuario().clear(screen.getByLabelText('Telefone'))
    await usuario().type(screen.getByLabelText('Telefone'), '999')
    await usuario().click(screen.getByRole('button', { name: /salvar/i }))

    expect(editar).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ nome: 'Clínica A', telefone: '999' }),
    )
  })

  it('ação "Inativar" por linha chama inativar com o id da clínica', async () => {
    const inativar = vi.fn()
    mockarHook({ clinicas: [clinicaA], inativar })
    render(<TelaClinicas />)

    await usuario().click(screen.getByRole('button', { name: /inativar/i }))
    expect(inativar).toHaveBeenCalledWith('1')
  })

  it('ação "Reativar" por linha chama reativar com o id da clínica', async () => {
    const reativar = vi.fn()
    mockarHook({ clinicas: [{ ...clinicaA, ativo: false }], reativar })
    render(<TelaClinicas />)

    await usuario().click(screen.getByRole('button', { name: /reativar/i }))
    expect(reativar).toHaveBeenCalledWith('1')
  })

  it('campo de prazo de pagamento por linha salva o novo valor', async () => {
    const definirPrazoPagamento = vi.fn()
    mockarHook({ clinicas: [clinicaA], definirPrazoPagamento })
    render(<TelaClinicas />)

    const campoPrazo = screen.getByLabelText(/prazo de pagamento/i)
    await usuario().clear(campoPrazo)
    await usuario().type(campoPrazo, '45')
    await usuario().click(screen.getByRole('button', { name: /salvar prazo/i }))

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

    await usuario().click(screen.getByLabelText(/apenas ativas/i))

    expect(definirApenasAtivas).toHaveBeenCalledWith(true)
  })
})

describe('TelaClinicas — formulários fecham só com sucesso (US1)', () => {
  it('criar com falha mantém o formulário aberto, com os valores e a mensagem', async () => {
    mockarHook({ criar: vi.fn().mockResolvedValue({ ok: false, mensagem: 'm' }) })
    render(<TelaClinicas />)
    const u = usuario()

    await u.click(screen.getByRole('button', { name: 'Nova clínica' }))
    await u.type(screen.getByLabelText('Nome'), 'Clínica Nova')
    await u.type(screen.getByLabelText('CNPJ'), '99988877000111')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('m')
    expect(screen.getByLabelText('Nome')).toHaveValue('Clínica Nova')
  })

  it('criar com sucesso fecha o formulário', async () => {
    mockarHook()
    render(<TelaClinicas />)
    const u = usuario()

    await u.click(screen.getByRole('button', { name: 'Nova clínica' }))
    await u.type(screen.getByLabelText('Nome'), 'Clínica Nova')
    await u.type(screen.getByLabelText('CNPJ'), '99988877000111')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.queryByLabelText('CNPJ')).not.toBeInTheDocument()
  })

  it('"Cancelar" no formulário novo fecha sem chamar criar', async () => {
    const criar = vi.fn().mockResolvedValue({ ok: true })
    mockarHook({ criar })
    render(<TelaClinicas />)
    const u = usuario()

    await u.click(screen.getByRole('button', { name: 'Nova clínica' }))
    await u.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('CNPJ')).not.toBeInTheDocument()
    expect(criar).not.toHaveBeenCalled()
  })

  it('editar com falha mantém a linha em edição com os valores e a mensagem', async () => {
    mockarHook({
      clinicas: [clinicaA],
      editar: vi.fn().mockResolvedValue({ ok: false, mensagem: 'm' }),
    })
    render(<TelaClinicas />)
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
    mockarHook({ clinicas: [clinicaA], editar })
    render(<TelaClinicas />)
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
    mockarHook({ clinicas: [clinicaA] })
    render(<TelaClinicas />)

    await usuario().click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByLabelText('CNPJ').closest('td')).toHaveAttribute('colspan', '6')
  })
})

describe('TelaClinicas — aviso de item fora do filtro (US4)', () => {
  it('mostra o aviso do hook em role="status", distinto do alerta de erro', () => {
    mockarHook({ aviso: 'Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.' })
    render(<TelaClinicas />)

    expect(screen.getByRole('status')).toHaveTextContent('Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('TelaClinicas — cada papel vê só o que pode fazer (US6)', () => {
  it.each(['atendente', 'tecnico'] as const)(
    '%s vê lista, busca e filtro, mas nenhum controle de escrita',
    (papel) => {
      mockarPapel(papel)
      mockarHook({ clinicas: [clinicaA] })
      render(<TelaClinicas />)

      expect(screen.getByText('Clínica A')).toBeInTheDocument()
      expect(screen.getByLabelText('Buscar por nome')).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /apenas ativas/i })).toBeInTheDocument()
      for (const nome of ['Nova clínica', 'Editar', 'Inativar', 'Reativar', 'Salvar prazo']) {
        expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument()
      }
      expect(screen.queryByLabelText(/prazo de pagamento/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument()
    },
  )

  it('admin vê todos os controles de escrita', () => {
    mockarHook({ clinicas: [clinicaA] })
    render(<TelaClinicas />)

    for (const nome of ['Nova clínica', 'Editar', 'Inativar', 'Salvar prazo']) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument()
    }
    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()
  })
})
