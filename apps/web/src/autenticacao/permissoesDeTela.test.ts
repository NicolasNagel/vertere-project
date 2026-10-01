import { describe, expect, it } from 'vitest'
import type { Papel } from '../tipos'
import { type AcaoDeTela, podeExecutar } from './permissoesDeTela'

/** Tabela "Permissões de tela" de specs/014-polimento-telas-web/data-model.md. */
const ESPERADO: Record<AcaoDeTela, Papel[]> = {
  CLINICA_GERENCIAR: ['admin'],
  VETERINARIO_GERENCIAR: ['admin'],
  EXAME_GERENCIAR: ['admin'],
  REGRA_PLANTAO_VER: ['admin', 'atendente'],
  REGRA_PLANTAO_GERENCIAR: ['admin'],
}

const PAPEIS: Papel[] = ['admin', 'atendente', 'tecnico', 'clinica']

describe('podeExecutar', () => {
  for (const [acao, permitidos] of Object.entries(ESPERADO) as [AcaoDeTela, Papel[]][]) {
    for (const papel of PAPEIS) {
      const esperado = permitidos.includes(papel)
      it(`${papel} ${esperado ? 'pode' : 'não pode'} ${acao}`, () => {
        expect(podeExecutar(papel, acao)).toBe(esperado)
      })
    }
  }
})
