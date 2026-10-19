import { describe, expect, it } from 'vitest'
import { formatarMoeda } from './formatacao'

// O `Intl` separa "R$" do número com espaço não separável (U+00A0), não com espaço comum.
describe('formatarMoeda', () => {
  it.each([
    ['50.00', 'R$ 50,00'],
    ['1234.5', 'R$ 1.234,50'],
    [40, 'R$ 40,00'],
    ['10.005', 'R$ 10,01'],
    ['0.1', 'R$ 0,10'],
  ])('%s vira %s', (valor, esperado) => {
    expect(formatarMoeda(valor)).toBe(esperado)
  })
})
