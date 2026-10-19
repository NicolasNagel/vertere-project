import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usuario } from '../../tests/usuario'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import { FormularioVeterinario } from './FormularioVeterinario'

const clinicas = [
  {
    id: 'c1',
    nome: 'Clínica A',
    cnpj: '1',
    endereco: '',
    telefone: '',
    email: '',
    ativo: true,
    prazo_pagamento_dias: null,
  },
  {
    id: 'c2',
    nome: 'Clínica B',
    cnpj: '2',
    endereco: '',
    telefone: '',
    email: '',
    ativo: true,
    prazo_pagamento_dias: null,
  },
]

const veterinarioA = {
  id: '1',
  nome: 'Dr. João',
  crmv: '1234',
  telefone: '4730000000',
  email: 'joao@vet.com',
  clinica_id: 'c1',
  ativo: true,
}

function renderizar(aoSalvar = vi.fn().mockResolvedValue({ ok: true }), aoFechar = vi.fn()) {
  render(<FormularioVeterinario clinicasAtivas={clinicas} aoSalvar={aoSalvar} aoFechar={aoFechar} />)
  return { aoSalvar, aoFechar }
}

async function preencherValido() {
  const u = usuario()
  await u.type(screen.getByLabelText('Nome'), 'Dr. João')
  await u.type(screen.getByLabelText('CRMV'), '1234')
  await u.selectOptions(screen.getByLabelText('Clínica'), 'c2')
  return u
}

describe('FormularioVeterinario', () => {
  it('renderiza um select com as clínicas ativas recebidas por prop', () => {
    renderizar()
    expect(screen.getByRole('option', { name: 'Clínica A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Clínica B' })).toBeInTheDocument()
  })

  it('submissão válida chama aoSalvar com os valores e a clínica escolhida, e fecha no sucesso', async () => {
    const { aoSalvar, aoFechar } = renderizar()

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Dr. João', crmv: '1234', clinica_id: 'c2' }),
    )
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('na falha, continua aberto com os valores digitados e mostra a mensagem', async () => {
    const { aoFechar } = renderizar(
      vi.fn().mockResolvedValue({ ok: false, mensagem: 'Já existe um veterinário cadastrado com esse CRMV.' }),
    )

    const u = await preencherValido()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Já existe um veterinário cadastrado com esse CRMV.',
    )
    expect(screen.getByLabelText('Nome')).toHaveValue('Dr. João')
    expect(screen.getByLabelText('CRMV')).toHaveValue('1234')
    expect(screen.getByLabelText('Clínica')).toHaveValue('c2')
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

  it('bloqueia submissão sem CRMV preenchido', async () => {
    const { aoSalvar } = renderizar()

    const u = usuario()
    await u.type(screen.getByLabelText('Nome'), 'Dr. João')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(aoSalvar).not.toHaveBeenCalled()
  })

  it('modo edição pré-preenche os campos e torna CRMV e clínica somente leitura', () => {
    render(
      <FormularioVeterinario
        clinicasAtivas={clinicas}
        veterinario={veterinarioA}
        aoSalvar={vi.fn()}
        aoFechar={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Nome')).toHaveValue('Dr. João')
    expect(screen.getByLabelText('CRMV')).toHaveValue('1234')
    expect(screen.getByLabelText('CRMV')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Clínica')).toBeDisabled()
  })

  it('sem clínicas ativas (cadastro novo), orienta a cadastrar uma clínica e "Cancelar" fecha', async () => {
    const aoFechar = vi.fn()
    render(<FormularioVeterinario clinicasAtivas={[]} aoSalvar={vi.fn()} aoFechar={aoFechar} />)

    expect(screen.getByText(/nenhuma clínica ativa cadastrada/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('CRMV')).not.toBeInTheDocument()

    await usuario().click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })
})
