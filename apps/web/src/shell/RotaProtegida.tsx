import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useSessao } from '../autenticacao/useSessao'
import type { Papel } from '../tipos'

interface RotaProtegidaProps {
  papeisPermitidos: Papel[]
  children: ReactNode
}

/**
 * Bloqueia a navegação direta por URL a uma seção não permitida ao papel do usuário (FR-005) — a
 * ausência do link no menu (`itensDeNavegacao`) é só UX; isto aqui é o que de fato impede o acesso,
 * mesmo digitando a rota manualmente. A autoridade real continua sendo o backend (`authorize()`);
 * isto só evita oferecer uma navegação que a API rejeitaria de qualquer forma.
 */
export function RotaProtegida({ papeisPermitidos, children }: RotaProtegidaProps) {
  const { autenticado, papel } = useSessao()

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  if (!papel || !papeisPermitidos.includes(papel)) {
    return (
      <div role="alert">
        <p>Acesso negado. Você não tem permissão para ver esta seção.</p>
      </div>
    )
  }

  return <>{children}</>
}
