const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Valor monetário no formato brasileiro ("R$ 1.234,50"). Só para exibição: a API manda o `Decimal`
 * como string e nenhum cálculo é feito aqui (constituição, Princípio I).
 */
export function formatarMoeda(valor: string | number): string {
  return MOEDA.format(Number(valor))
}
