import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as useSessaoModulo from './useSessao'
import { TelaLogin } from './TelaLogin'

function renderizarNaRota() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<TelaLogin />} />
        <Route path="/" element={<div>Área autenticada</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TelaLogin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('submete e-mail e senha preenchidos para useSessao.login', async () => {
    const login = vi.fn()
    vi.spyOn(useSessaoModulo, 'useSessao').mockReturnValue({
      autenticado: false,
      papel: null,
      erro: null,
      carregando: false,
      login,
      sair: vi.fn(),
    })

    renderizarNaRota()
    const usuario = userEvent.setup()

    await usuario.type(screen.getByLabelText(/usuário/i), 'admin@vertere.com')
    await usuario.type(screen.getByLabelText(/senha/i), 'senha-correta')
    await usuario.click(screen.getByRole('button', { name: /entrar no sistema/i }))

    expect(login).toHaveBeenCalledWith('admin@vertere.com', 'senha-correta')
  })

  it('mostra o erro genérico anunciado por role=alert quando useSessao reporta erro', () => {
    vi.spyOn(useSessaoModulo, 'useSessao').mockReturnValue({
      autenticado: false,
      papel: null,
      erro: 'E-mail ou senha inválidos',
      carregando: false,
      login: vi.fn(),
      sair: vi.fn(),
    })

    renderizarNaRota()

    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha inválidos')
  })

  it('redireciona para a área autenticada quando autenticado=true', () => {
    vi.spyOn(useSessaoModulo, 'useSessao').mockReturnValue({
      autenticado: true,
      papel: 'admin',
      erro: null,
      carregando: false,
      login: vi.fn(),
      sair: vi.fn(),
    })

    renderizarNaRota()

    expect(screen.getByText('Área autenticada')).toBeInTheDocument()
  })
})
