import { describe, expect, it } from 'vitest'
import type { Papel } from '../tipos'
import { itensDeNavegacao, itensParaPapel } from './itensDeNavegacao'

/**
 * Espelha `apps/api/src/vertere_api/auth/service.py::_PERMISSOES` para os papéis de staff
 * (admin/atendente/tecnico). `clinica` não é comparado 1:1 contra `_PERMISSOES` aqui — o papel
 * `clinica` navega pelo namespace `/portal/*` (S9), que é deliberadamente mais restrito do que as
 * `Acao` que o backend concede a ele para operações internas (ver ItemDeNavegacao em data-model.md
 * e o Acceptance Scenario 3 de spec.md, que é a fonte de verdade para o menu de clínica).
 */
const ROTULOS_ESPERADOS_POR_PAPEL: Record<Papel, string[]> = {
  admin: [
    'Clínicas',
    'Veterinários',
    'Pacientes',
    'Exames',
    'Atendimentos',
    'Laudos',
    'Financeiro',
    'Usuários',
  ],
  atendente: ['Clínicas', 'Veterinários', 'Pacientes', 'Exames', 'Atendimentos'],
  tecnico: ['Clínicas', 'Veterinários', 'Pacientes', 'Exames', 'Atendimentos', 'Laudos'],
  clinica: ['Pacientes', 'Atendimentos', 'Laudos'],
}

describe('itensDeNavegacao', () => {
  it.each(Object.entries(ROTULOS_ESPERADOS_POR_PAPEL))(
    'retorna exatamente os itens esperados para o papel %s',
    (papel, rotulosEsperados) => {
      const rotulos = itensParaPapel(papel as Papel).map((item) => item.rotulo)
      expect(new Set(rotulos)).toEqual(new Set(rotulosEsperados))
    },
  )

  it('rotas de clínica usam o namespace /portal/*, distinto das rotas internas de staff', () => {
    const itensClinica = itensParaPapel('clinica')
    for (const item of itensClinica) {
      expect(item.rota.startsWith('/portal/')).toBe(true)
    }

    const itensAdmin = itensParaPapel('admin')
    const itemPacientesAdmin = itensAdmin.find((item) => item.rotulo === 'Pacientes')
    expect(itemPacientesAdmin?.rota).toBe('/pacientes')
  })

  it('Clínicas é a única seção implementada até aqui (S12, US1) — as demais continuam placeholder', () => {
    const implementados = itensDeNavegacao.filter((item) => item.implementado).map((item) => item.rotulo)
    expect(implementados).toEqual(['Clínicas'])
  })
})
