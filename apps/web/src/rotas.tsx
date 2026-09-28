import { createBrowserRouter } from 'react-router'

/**
 * Esqueleto do roteador (fase Foundational) — sem guard de papel ainda (US2 adiciona
 * `RotaProtegida`) e sem a tela de login de verdade ainda (US1 adiciona `/login`).
 */
export function criarRotas() {
  return createBrowserRouter([
    {
      path: '/',
      element: <div>Vertere Lab</div>,
    },
  ])
}
