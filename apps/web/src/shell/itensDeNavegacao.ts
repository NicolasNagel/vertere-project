import type { ItemDeNavegacao, Papel } from '../tipos'

/**
 * Espelha `auth/service.py::_PERMISSOES` para os papéis de staff (admin/atendente/tecnico) — cada
 * seção aparece para quem tem a `Acao` de leitura correspondente no backend.
 *
 * `clinica` é um caso à parte, deliberadamente: o papel navega pelo namespace `/portal/*` (S9), que
 * é mais restrito do que as `Acao` que o backend concede a ele para operações internas (ex:
 * `CLINICA_VER`, que existe só para permitir a um usuário clínica participar de fluxos internos,
 * não para ele navegar a tela de gestão de clínicas). Por isso os itens de clínica têm rótulo igual
 * a alguns itens de staff, mas rota e permissão próprias — nunca o mesmo `ItemDeNavegacao`.
 */
export const itensDeNavegacao: ItemDeNavegacao[] = [
  { rotulo: 'Clínicas', rota: '/clinicas', papeisPermitidos: ['admin', 'atendente', 'tecnico'], implementado: true },
  {
    rotulo: 'Veterinários',
    rota: '/veterinarios',
    papeisPermitidos: ['admin', 'atendente', 'tecnico'],
    implementado: true,
  },
  {
    rotulo: 'Pacientes',
    rota: '/pacientes',
    papeisPermitidos: ['admin', 'atendente', 'tecnico'],
    implementado: false,
  },
  { rotulo: 'Exames', rota: '/exames', papeisPermitidos: ['admin', 'atendente', 'tecnico'], implementado: true },
  {
    rotulo: 'Atendimentos',
    rota: '/atendimentos',
    papeisPermitidos: ['admin', 'atendente', 'tecnico'],
    implementado: false,
  },
  { rotulo: 'Laudos', rota: '/laudos', papeisPermitidos: ['admin', 'tecnico'], implementado: false },
  { rotulo: 'Financeiro', rota: '/financeiro', papeisPermitidos: ['admin'], implementado: false },
  { rotulo: 'Usuários', rota: '/usuarios', papeisPermitidos: ['admin'], implementado: false },

  // Namespace /portal/* — exclusivo do papel clínica (S9).
  { rotulo: 'Pacientes', rota: '/portal/pacientes', papeisPermitidos: ['clinica'], implementado: false },
  { rotulo: 'Atendimentos', rota: '/portal/atendimentos', papeisPermitidos: ['clinica'], implementado: false },
  { rotulo: 'Laudos', rota: '/portal/laudos', papeisPermitidos: ['clinica'], implementado: false },
]

export function itensParaPapel(papel: Papel): ItemDeNavegacao[] {
  return itensDeNavegacao.filter((item) => item.papeisPermitidos.includes(papel))
}
