import { render, screen } from '@testing-library/react'
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
    recarregar: vi.fn(),
    criar: vi.fn(),
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
})
