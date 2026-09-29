import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

describe('FormularioVeterinario', () => {
  it('renderiza um select com as clínicas ativas recebidas por prop', () => {
    render(<FormularioVeterinario clinicasAtivas={clinicas} aoSalvar={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'Clínica A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Clínica B' })).toBeInTheDocument()
  })

  it('submissão válida chama aoSalvar com os valores e a clínica escolhida', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioVeterinario clinicasAtivas={clinicas} aoSalvar={aoSalvar} />)

    await userEvent.type(screen.getByLabelText('Nome'), 'Dr. João')
    await userEvent.type(screen.getByLabelText('CRMV'), '1234')
    await userEvent.selectOptions(screen.getByLabelText('Clínica'), 'c2')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Dr. João', crmv: '1234', clinica_id: 'c2' }),
    )
  })

  it('bloqueia submissão sem CRMV preenchido', async () => {
    const aoSalvar = vi.fn()
    render(<FormularioVeterinario clinicasAtivas={clinicas} aoSalvar={aoSalvar} />)

    await userEvent.type(screen.getByLabelText('Nome'), 'Dr. João')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(aoSalvar).not.toHaveBeenCalled()
  })

  it('modo edição pré-preenche os campos e torna CRMV e clínica somente leitura', () => {
    const veterinario = {
      id: '1',
      nome: 'Dr. João',
      crmv: '1234',
      telefone: '4730000000',
      email: 'joao@vet.com',
      clinica_id: 'c1',
      ativo: true,
    }
    render(
      <FormularioVeterinario
        clinicasAtivas={clinicas}
        veterinario={veterinario}
        aoSalvar={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Nome')).toHaveValue('Dr. João')
    expect(screen.getByLabelText('CRMV')).toHaveValue('1234')
    expect(screen.getByLabelText('CRMV')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Clínica')).toBeDisabled()
  })

  it('sem clínicas ativas (cadastro novo), orienta a cadastrar uma clínica em vez de mostrar o formulário', () => {
    render(<FormularioVeterinario clinicasAtivas={[]} aoSalvar={vi.fn()} />)

    expect(screen.getByText(/nenhuma clínica ativa cadastrada/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('CRMV')).not.toBeInTheDocument()
  })
})
