import { RouterProvider } from 'react-router'
import { criarRotas } from './rotas'

const roteador = criarRotas()

export function App() {
  return <RouterProvider router={roteador} />
}
