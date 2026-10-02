import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usuario } from '../../tests/usuario'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import { FormularioRegraPlantao } from './FormularioRegraPlantao'

const regraA = {
  id: '1',
  dia_semana: 4,
  hora_inicio: '18:00:00',
  hora_fim: '06:00:00',
  valor_adicional: '50.00',
  ativo: true,
}

function renderizar(aoSalvar = vi.fn().mockResolvedValue({ ok: true }), aoFechar = vi.fn()) {
  render(<FormularioRegraPlantao aoSalvar={aoSalvar} aoFechar={aoFechar} />)
  return { aoSalvar, aoFechar }
}

async function preencherValido() {
  const u = usuario()
  await u.selectOptions(screen.getByLabelText('Dia da semana'), 'Sexta-feira')
  await u.type(screen.getByLabelText('Horário de início'), '18:00')
  await u.type(screen.getByLabelText('Horário de fim'), '06:00')
  await u.type(screen.getByLabelText('Valor adicional'), '50')
  return u
}

describe('FormularioRegraPlantao', () => {
  it('chama aoSalvar com os valores escolhidos e fecha no sucesso', async () => {
    const { aoSalvar, aoFechar } = renderizar()

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoSalvar).toHaveBeenCalledWith({
      dia_semana: 4,
      hora_inicio: '18:00',
      hora_fim: '06:00',
      valor_adicional: '50',
    })
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('aceita horário de início maior que horário de fim (plantão cruzando meia-noite)', async () => {
    const { aoSalvar } = renderizar()

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoSalvar).toHaveBeenCalled()
  })

  it('na falha, continua aberto com os valores escolhidos e mostra a mensagem', async () => {
    const { aoFechar } = renderizar(
      vi.fn().mockResolvedValue({ ok: false, mensagem: 'Servidor recusou.' }),
    )

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Servidor recusou.')
    expect(screen.getByLabelText('Dia da semana')).toHaveValue('4')
    expect(screen.getByLabelText('Horário de início')).toHaveValue('18:00')
    expect(screen.getByLabelText('Horário de fim')).toHaveValue('06:00')
    expect(screen.getByLabelText('Valor adicional')).toHaveValue(50)
  })

  it('enquanto salva, mostra "Salvando…", desabilita os botões e não envia de novo', async () => {
    let resolver!: (valor: ResultadoAcao) => void
    const aoSalvar = vi.fn(() => new Promise<ResultadoAcao>((r) => (resolver = r)))
    renderizar(aoSalvar)

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    const botaoSalvando = screen.getByRole('button', { name: 'Salvando…' })
    expect(botaoSalvando).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    await u.click(botaoSalvando)
    expect(aoSalvar).toHaveBeenCalledTimes(1)

    await act(async () => resolver({ ok: true }))
  })

  it('"Cancelar" fecha sem salvar', async () => {
    const { aoSalvar, aoFechar } = renderizar()

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(aoFechar).toHaveBeenCalledTimes(1)
    expect(aoSalvar).not.toHaveBeenCalled()
  })

  it.each(['0', '-5'])(
    'bloqueia submissão com valor adicional %s e mostra mensagem específica',
    async (valor) => {
      const { aoSalvar } = renderizar()

      const u = usuario()
      await u.type(screen.getByLabelText('Horário de início'), '18:00')
      await u.type(screen.getByLabelText('Horário de fim'), '06:00')
      await u.type(screen.getByLabelText('Valor adicional'), valor)
      await u.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(aoSalvar).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Valor adicional deve ser maior que zero.',
      )
    },
  )

  it('modo edição pré-preenche os campos', () => {
    render(<FormularioRegraPlantao regra={regraA} aoSalvar={vi.fn()} aoFechar={vi.fn()} />)

    expect(screen.getByLabelText('Dia da semana')).toHaveValue('4')
    expect(screen.getByLabelText('Horário de início')).toHaveValue('18:00')
    expect(screen.getByLabelText('Horário de fim')).toHaveValue('06:00')
    expect(screen.getByLabelText('Valor adicional')).toHaveValue(50)
  })
})
