import { createBrowserRouter } from 'react-router'
import { TelaLogin } from './autenticacao/TelaLogin'

/**
 * `/` ainda é um placeholder — US2 substitui por `ShellAutenticado` + as rotas de
 * `itensDeNavegacao`, cada uma envolvida por `RotaProtegida`.
 */
export function criarRotas() {
  return createBrowserRouter([
    {
      path: '/login',
      element: <TelaLogin />,
    },
    {
      path: '/',
      element: <div>Vertere Lab</div>,
    },
  ])
}
