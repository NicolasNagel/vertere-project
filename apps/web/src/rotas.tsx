import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { TelaLogin } from './autenticacao/TelaLogin'
import { itensDeNavegacao } from './shell/itensDeNavegacao'
import { RotaProtegida } from './shell/RotaProtegida'
import { ShellAutenticado } from './shell/ShellAutenticado'
import { TelaEmConstrucao } from './shell/TelaEmConstrucao'
import { TelaClinicas } from './clinicas/TelaClinicas'
import type { Papel } from './tipos'

const TODOS_OS_PAPEIS: Papel[] = ['admin', 'atendente', 'tecnico', 'clinica']

/**
 * Rotas com tela de conteúdo real (S12+) entram aqui. Toda rota de `itensDeNavegacao` que não
 * aparecer neste mapa continua caindo no fallback `TelaEmConstrucao` — o placeholder não é
 * removido item a item, é sobrescrito conforme cada seção ganha sua tela real.
 */
const componentePorRota: Partial<Record<string, ReactNode>> = {
  '/clinicas': <TelaClinicas />,
}

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
              {componentePorRota[item.rota] ?? <TelaEmConstrucao titulo={item.rotulo} />}
            </RotaProtegida>
          ),
        })),
      ],
    },
  ])
}
