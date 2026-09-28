import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as useSessaoModulo from '../autenticacao/useSessao'
import { RotaProtegida } from './RotaProtegida'

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/financeiro']}>
      <Routes>
        <Route path="/login" element={<div>Tela de login</div>} />
        <Route
          path="/financeiro"
          element={
            <RotaProtegida papeisPermitidos={['admin']}>
              <div>Conteúdo do Financeiro</div>
            </RotaProtegida>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RotaProtegida', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza o conteúdo quando o papel do usuário está em papeisPermitidos', () => {
    vi.spyOn(useSessaoModulo, 'useSessao').mockReturnValue({
      autenticado: true,
      papel: 'admin',
      email: 'admin@vertere.com',
      erro: null,
      carregando: false,
      login: vi.fn(),
      sair: vi.fn(),
    })

    renderizar()

    expect(screen.getByText('Conteúdo do Financeiro')).toBeInTheDocument()
  })

  it('bloqueia e não renderiza o conteúdo quando o papel não está em papeisPermitidos', () => {
    vi.spyOn(useSessaoModulo, 'useSessao').mockReturnValue({
      autenticado: true,
      papel: 'atendente',
      email: 'atendente@vertere.com',
      erro: null,
      carregando: false,
      login: vi.fn(),
      sair: vi.fn(),
    })

    renderizar()

    expect(screen.queryByText('Conteúdo do Financeiro')).not.toBeInTheDocument()
  })

  it('redireciona ao login quando não há sessão autenticada', () => {
    vi.spyOn(useSessaoModulo, 'useSessao').mockReturnValue({
      autenticado: false,
      papel: null,
      email: null,
      erro: null,
      carregando: false,
      login: vi.fn(),
      sair: vi.fn(),
    })

    renderizar()

    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })
})
