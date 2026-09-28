import { RouterProvider } from 'react-router'
import { SessaoProvider } from './autenticacao/SessaoContext'
import { criarRotas } from './rotas'

const roteador = criarRotas()

export function App() {
  return (
    <SessaoProvider>
      <RouterProvider router={roteador} />
    </SessaoProvider>
  )
}
