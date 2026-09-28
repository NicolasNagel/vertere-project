import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as useSessaoModulo from '../autenticacao/SessaoContext'
import { ShellAutenticado } from './ShellAutenticado'

function renderizarComoPapel(papel: 'admin' | 'atendente' | 'tecnico' | 'clinica', sair = vi.fn()) {
  vi.spyOn(useSessaoModulo, 'useSessao').mockReturnValue({
    autenticado: true,
    papel,
    email: `${papel}@vertere.com`,
    erro: null,
    carregando: false,
    login: vi.fn(),
    sair,
  })

  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ShellAutenticado />}>
          <Route index element={<div>Início</div>} />
        </Route>
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ShellAutenticado', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mostra exatamente os itens de menu esperados para o papel admin', () => {
    renderizarComoPapel('admin')

    for (const rotulo of ['Clínicas', 'Veterinários', 'Pacientes', 'Exames', 'Atendimentos', 'Laudos', 'Financeiro', 'Usuários']) {
      expect(screen.getByRole('link', { name: rotulo })).toBeInTheDocument()
    }
  })

  it('não mostra Financeiro nem Usuários para o papel atendente', () => {
    renderizarComoPapel('atendente')

    expect(screen.queryByRole('link', { name: 'Financeiro' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pacientes' })).toBeInTheDocument()
  })

  it('mostra só Pacientes/Atendimentos/Laudos (namespace /portal/*) para o papel clínica', () => {
    renderizarComoPapel('clinica')

    const links = screen.getAllByRole('link').map((link) => link.textContent)
    expect(new Set(links)).toEqual(new Set(['Pacientes', 'Atendimentos', 'Laudos']))
  })

  it('"Sair" chama useSessao.sair', async () => {
    const sair = vi.fn()
    renderizarComoPapel('admin', sair)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: /sair/i }))

    expect(sair).toHaveBeenCalledTimes(1)
  })
})
