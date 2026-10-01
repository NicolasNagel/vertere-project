/** Índice = `dia_semana` da API: `0 = Segunda`, igual a `datetime.weekday()` do backend (S5). */
export const DIAS_DA_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
]

/** `RegraPlantaoResponse.hora_inicio`/`hora_fim` vêm como `"HH:MM:SS"`; a tela e o
 * `<input type="time">` usam `"HH:MM"` sem segundos. */
export function paraHoraSemSegundos(hora: string): string {
  return hora.slice(0, 5)
}
