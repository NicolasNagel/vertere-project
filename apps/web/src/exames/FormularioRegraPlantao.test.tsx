import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioRegraPlantao } from './FormularioRegraPlantao'

describe('FormularioRegraPlantao', () => {
  it('chama aoSalvar com os valores escolhidos ao submeter', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioRegraPlantao aoSalvar={aoSalvar} />)

    await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), 'Sexta-feira')
    await userEvent.type(screen.getByLabelText('Horário de início'), '18:00')
    await userEvent.type(screen.getByLabelText('Horário de fim'), '06:00')
    await userEvent.type(screen.getByLabelText('Valor adicional'), '50')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).toHaveBeenCalledWith({
      dia_semana: 4,
      hora_inicio: '18:00',
      hora_fim: '06:00',
      valor_adicional: '50',
    })
  })

  it('aceita horário de início maior que horário de fim (plantão cruzando meia-noite)', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioRegraPlantao aoSalvar={aoSalvar} />)

    await userEvent.type(screen.getByLabelText('Horário de início'), '18:00')
    await userEvent.type(screen.getByLabelText('Horário de fim'), '06:00')
    await userEvent.type(screen.getByLabelText('Valor adicional'), '50')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).toHaveBeenCalled()
  })

  it.each(['0', '-5'])(
    'bloqueia submissão com valor adicional %s e mostra mensagem específica',
    async (valor) => {
      const aoSalvar = vi.fn()
      render(<FormularioRegraPlantao aoSalvar={aoSalvar} />)

      await userEvent.type(screen.getByLabelText('Horário de início'), '18:00')
      await userEvent.type(screen.getByLabelText('Horário de fim'), '06:00')
      await userEvent.type(screen.getByLabelText('Valor adicional'), valor)
      await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

      expect(aoSalvar).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Valor adicional deve ser maior que zero.',
      )
    },
  )

  it('modo edição pré-preenche os campos', () => {
    const regra = {
      id: '1',
      dia_semana: 4,
      hora_inicio: '18:00:00',
      hora_fim: '06:00:00',
      valor_adicional: '50.00',
      ativo: true,
    }
    render(<FormularioRegraPlantao regra={regra} aoSalvar={vi.fn()} />)

    expect(screen.getByLabelText('Dia da semana')).toHaveValue('4')
    expect(screen.getByLabelText('Horário de início')).toHaveValue('18:00')
    expect(screen.getByLabelText('Horário de fim')).toHaveValue('06:00')
    expect(screen.getByLabelText('Valor adicional')).toHaveValue(50)
  })
})
