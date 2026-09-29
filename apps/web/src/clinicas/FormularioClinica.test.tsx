import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioClinica } from './FormularioClinica'

describe('FormularioClinica', () => {
  it('chama aoSalvar com os valores digitados ao submeter', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioClinica aoSalvar={aoSalvar} />)

    await userEvent.type(screen.getByLabelText('Nome'), 'Clínica A')
    await userEvent.type(screen.getByLabelText('CNPJ'), '12345678000199')
    await userEvent.type(screen.getByLabelText('Endereço'), 'Rua X, 100')
    await userEvent.type(screen.getByLabelText('Telefone'), '4730000000')
    await userEvent.type(screen.getByLabelText('E-mail'), 'a@clinica.com')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).toHaveBeenCalledWith({
      nome: 'Clínica A',
      cnpj: '12345678000199',
      endereco: 'Rua X, 100',
      telefone: '4730000000',
      email: 'a@clinica.com',
    })
  })

  it('bloqueia submissão sem nome ou CNPJ preenchidos', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioClinica aoSalvar={aoSalvar} />)

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).not.toHaveBeenCalled()
  })
})
