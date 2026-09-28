import { createBrowserRouter } from 'react-router'
import { TelaLogin } from './autenticacao/TelaLogin'
import { itensDeNavegacao } from './shell/itensDeNavegacao'
import { RotaProtegida } from './shell/RotaProtegida'
import { ShellAutenticado } from './shell/ShellAutenticado'
import { TelaEmConstrucao } from './shell/TelaEmConstrucao'
import type { Papel } from './tipos'

const TODOS_OS_PAPEIS: Papel[] = ['admin', 'atendente', 'tecnico', 'clinica']

export function criarRotas() {
  return createBrowserRouter([
    {
      path: '/login',
      element: <TelaLogin />,
    },
    {
      path: '/',
      element: (
        <RotaProtegida papeisPermitidos={TODOS_OS_PAPEIS}>
          <ShellAutenticado />
        </RotaProtegida>
      ),
      children: [
        {
          index: true,
          element: <TelaEmConstrucao titulo="Vertere Lab" />,
        },
        ...itensDeNavegacao.map((item) => ({
          path: item.rota.replace(/^\//, ''),
          element: (
            <RotaProtegida papeisPermitidos={item.papeisPermitidos}>
              <TelaEmConstrucao titulo={item.rotulo} />
            </RotaProtegida>
          ),
        })),
      ],
    },
  ])
}
