import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioExame } from './FormularioExame'

describe('FormularioExame', () => {
  it('chama aoSalvar com os valores digitados ao submeter', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioExame aoSalvar={aoSalvar} />)

    await userEvent.type(screen.getByLabelText('Categoria'), 'Hematologia')
    await userEvent.type(screen.getByLabelText('Nome'), 'Hemograma completo')
    await userEvent.type(screen.getByLabelText('Preço-base'), '50.00')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).toHaveBeenCalledWith({
      categoria: 'Hematologia',
      nome: 'Hemograma completo',
      preco_base: '50',
    })
  })

  it('bloqueia submissão sem categoria ou nome preenchidos', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioExame aoSalvar={aoSalvar} />)

    await userEvent.type(screen.getByLabelText('Preço-base'), '50.00')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).not.toHaveBeenCalled()
  })

  it('bloqueia submissão com preço-base zero ou negativo', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioExame aoSalvar={aoSalvar} />)

    await userEvent.type(screen.getByLabelText('Categoria'), 'Hematologia')
    await userEvent.type(screen.getByLabelText('Nome'), 'Hemograma completo')
    await userEvent.type(screen.getByLabelText('Preço-base'), '0')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).not.toHaveBeenCalled()
  })

  it('modo edição pré-preenche os campos', () => {
    const exame = {
      id: '1',
      categoria: 'Hematologia',
      nome: 'Hemograma completo',
      preco_base: '50.00',
      ativo: true,
    }
    render(<FormularioExame exame={exame} aoSalvar={vi.fn()} />)

    expect(screen.getByLabelText('Categoria')).toHaveValue('Hematologia')
    expect(screen.getByLabelText('Nome')).toHaveValue('Hemograma completo')
    expect(screen.getByLabelText('Preço-base')).toHaveValue(50)
  })
})
