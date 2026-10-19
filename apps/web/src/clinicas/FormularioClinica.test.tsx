import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usuario } from '../../tests/usuario'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import { FormularioClinica } from './FormularioClinica'

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

function renderizar(aoSalvar = vi.fn().mockResolvedValue({ ok: true }), aoFechar = vi.fn()) {
  render(<FormularioClinica aoSalvar={aoSalvar} aoFechar={aoFechar} />)
  return { aoSalvar, aoFechar }
}

async function preencherValido() {
  const u = usuario()
  await u.type(screen.getByLabelText('Nome'), 'Clínica A')
  await u.type(screen.getByLabelText('CNPJ'), '12345678000199')
  await u.type(screen.getByLabelText('Endereço'), 'Rua X, 100')
  await u.type(screen.getByLabelText('Telefone'), '4730000000')
  await u.type(screen.getByLabelText('E-mail'), 'a@clinica.com')
  return u
}

describe('FormularioClinica', () => {
  it('chama aoSalvar com os valores digitados e fecha no sucesso', async () => {
    const { aoSalvar, aoFechar } = renderizar()

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoSalvar).toHaveBeenCalledWith({
      nome: 'Clínica A',
      cnpj: '12345678000199',
      endereco: 'Rua X, 100',
      telefone: '4730000000',
      email: 'a@clinica.com',
    })
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('na falha, continua aberto com os valores digitados e mostra a mensagem', async () => {
    const { aoFechar } = renderizar(
      vi.fn().mockResolvedValue({ ok: false, mensagem: 'Verifique o campo E-mail: valor inválido.' }),
    )

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Verifique o campo E-mail: valor inválido.')
    expect(screen.getByLabelText('Nome')).toHaveValue('Clínica A')
    expect(screen.getByLabelText('CNPJ')).toHaveValue('12345678000199')
    expect(screen.getByLabelText('Endereço')).toHaveValue('Rua X, 100')
    expect(screen.getByLabelText('Telefone')).toHaveValue('4730000000')
    expect(screen.getByLabelText('E-mail')).toHaveValue('a@clinica.com')
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

  it('bloqueia submissão sem nome ou CNPJ preenchidos', async () => {
    const { aoSalvar } = renderizar()

    await usuario().click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoSalvar).not.toHaveBeenCalled()
  })

  it('modo edição pré-preenche os campos e torna o CNPJ somente leitura', () => {
    render(<FormularioClinica clinica={clinicaA} aoSalvar={vi.fn()} aoFechar={vi.fn()} />)

    expect(screen.getByLabelText('Nome')).toHaveValue('Clínica A')
    expect(screen.getByLabelText('CNPJ')).toHaveValue('12345678000199')
    expect(screen.getByLabelText('CNPJ')).toHaveAttribute('readonly')
  })
})
