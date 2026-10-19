import type { Papel } from '../tipos'

/**
 * Ações que as telas de cadastro usam para decidir quais controles mostrar. Os nomes são os mesmos
 * do enum `Acao` do backend, para achar os dois lados por busca.
 */
export type AcaoDeTela =
  | 'CLINICA_GERENCIAR'
  | 'VETERINARIO_GERENCIAR'
  | 'EXAME_GERENCIAR'
  | 'REGRA_PLANTAO_VER'
  | 'REGRA_PLANTAO_GERENCIAR'

/**
 * Espelha, para as ações acima, `apps/api/src/vertere_api/auth/service.py::_PERMISSOES`. Mudou lá,
 * muda aqui (mesmo acordo de `shell/itensDeNavegacao.ts` para rotas). Serve só para **ocultar**
 * controles que o servidor recusaria: quem decide de verdade continua sendo `authorize()` no
 * backend (constituição, Princípio II).
 */
const PAPEIS_POR_ACAO: Record<AcaoDeTela, readonly Papel[]> = {
  CLINICA_GERENCIAR: ['admin'],
  VETERINARIO_GERENCIAR: ['admin'],
  EXAME_GERENCIAR: ['admin'],
  REGRA_PLANTAO_VER: ['admin', 'atendente'],
  REGRA_PLANTAO_GERENCIAR: ['admin'],
}

export function podeExecutar(papel: Papel | null | undefined, acao: AcaoDeTela): boolean {
  return papel != null && PAPEIS_POR_ACAO[acao].includes(papel)
}
