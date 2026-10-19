import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usuario } from '../../tests/usuario'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import { FormularioExame } from './FormularioExame'

const exameA = {
  id: '1',
  categoria: 'Hematologia',
  nome: 'Hemograma completo',
  preco_base: '50.00',
  ativo: true,
}

function renderizar(aoSalvar = vi.fn().mockResolvedValue({ ok: true }), aoFechar = vi.fn()) {
  render(<FormularioExame aoSalvar={aoSalvar} aoFechar={aoFechar} />)
  return { aoSalvar, aoFechar }
}

async function preencherValido() {
  const u = usuario()
  await u.type(screen.getByLabelText('Categoria'), 'Hematologia')
  await u.type(screen.getByLabelText('Nome'), 'Hemograma completo')
  await u.type(screen.getByLabelText('Preço-base'), '50.00')
  return u
}

describe('FormularioExame', () => {
  it('chama aoSalvar com os valores digitados e fecha no sucesso', async () => {
    const { aoSalvar, aoFechar } = renderizar()

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoSalvar).toHaveBeenCalledWith({
      categoria: 'Hematologia',
      nome: 'Hemograma completo',
      preco_base: '50',
    })
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('na falha, continua aberto com os valores digitados e mostra a mensagem', async () => {
    const { aoFechar } = renderizar(
      vi.fn().mockResolvedValue({ ok: false, mensagem: 'Servidor recusou.' }),
    )

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Servidor recusou.')
    expect(screen.getByLabelText('Categoria')).toHaveValue('Hematologia')
    expect(screen.getByLabelText('Nome')).toHaveValue('Hemograma completo')
    expect(screen.getByLabelText('Preço-base')).toHaveValue(50)
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

  it('bloqueia submissão sem categoria ou nome preenchidos', async () => {
    const { aoSalvar } = renderizar()

    const u = usuario()
    await u.type(screen.getByLabelText('Preço-base'), '50.00')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoSalvar).not.toHaveBeenCalled()
  })

  it.each(['0', '-5'])(
    'bloqueia submissão com preço-base %s e mostra mensagem específica',
    async (valor) => {
      const { aoSalvar } = renderizar()

      const u = usuario()
      await u.type(screen.getByLabelText('Categoria'), 'Hematologia')
      await u.type(screen.getByLabelText('Nome'), 'Hemograma completo')
      await u.type(screen.getByLabelText('Preço-base'), valor)
      await u.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(aoSalvar).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('Preço-base deve ser maior que zero.')
    },
  )

  it('modo edição pré-preenche os campos', () => {
    render(<FormularioExame exame={exameA} aoSalvar={vi.fn()} aoFechar={vi.fn()} />)

    expect(screen.getByLabelText('Categoria')).toHaveValue('Hematologia')
    expect(screen.getByLabelText('Nome')).toHaveValue('Hemograma completo')
    expect(screen.getByLabelText('Preço-base')).toHaveValue(50)
  })
})
