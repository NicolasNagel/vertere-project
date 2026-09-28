interface TelaEmConstrucaoProps {
  titulo: string
}

/** Placeholder para uma seção cuja tela real ainda não existe (FR-008) — cada seção listada em
 * `itensDeNavegacao` vira conteúdo de verdade numa spec futura própria. */
export function TelaEmConstrucao({ titulo }: TelaEmConstrucaoProps) {
  return (
    <div>
      <h1>{titulo}</h1>
      <p>Esta seção ainda está em construção.</p>
    </div>
  )
}
