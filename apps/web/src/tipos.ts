import type { components } from './api/tipos.gerados'

export type Papel = components['schemas']['Papel']

/** Espelho, no navegador, do que a API já retorna no login (ver data-model.md). */
export interface SessaoUsuario {
  token: string
  papel: Papel
  clinicaId: string | null
}

/**
 * Usado tanto para montar o menu do shell quanto para o guard de rota — a mesma lista alimenta as
 * duas decisões, para que nunca divirjam (ver data-model.md, "Nota de sincronização").
 */
export interface ItemDeNavegacao {
  rotulo: string
  rota: string
  papeisPermitidos: Papel[]
  implementado: boolean
}
