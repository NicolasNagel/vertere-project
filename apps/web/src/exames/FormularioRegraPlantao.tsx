import { useId, type FormEvent, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import { useEnvioFormulario } from '../ui/useEnvioFormulario'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import { DIAS_DA_SEMANA, paraHoraSemSegundos } from './regraPlantao'

type CriarRegraPlantaoRequest = components['schemas']['CriarRegraPlantaoRequest']
type RegraPlantaoResponse = components['schemas']['RegraPlantaoResponse']

interface FormularioRegraPlantaoProps {
  /** Presente em modo edição: pré-preenche os campos. */
  regra?: RegraPlantaoResponse
  aoSalvar: (dados: CriarRegraPlantaoRequest) => Promise<ResultadoAcao>
  /** Chamado no sucesso do salvamento e no "Cancelar". */
  aoFechar: () => void
}

export function FormularioRegraPlantao({ regra, aoSalvar, aoFechar }: FormularioRegraPlantaoProps) {
  const [diaSemana, setDiaSemana] = useState(regra?.dia_semana ?? 0)
  const [horaInicio, setHoraInicio] = useState(
    regra ? paraHoraSemSegundos(regra.hora_inicio) : '',
  )
  const [horaFim, setHoraFim] = useState(regra ? paraHoraSemSegundos(regra.hora_fim) : '')
  const [valorAdicional, setValorAdicional] = useState(regra?.valor_adicional ?? '')
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const { salvando, erroEnvio, enviar } = useEnvioFormulario(
    () =>
      aoSalvar({
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        valor_adicional: valorAdicional,
      }),
    aoFechar,
  )
  const idDiaSemana = useId()

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Validação local para resposta imediata; o backend também recusa desde S14 (FR-010).
    if (!(Number(valorAdicional) > 0)) {
      setErroValidacao('Valor adicional deve ser maior que zero.')
      return
    }
    setErroValidacao(null)
    void enviar()
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erroValidacao || erroEnvio ? <p role="alert">{erroValidacao ?? erroEnvio}</p> : null}
      <label htmlFor={idDiaSemana}>Dia da semana</label>
      <select
        id={idDiaSemana}
        value={diaSemana}
        onChange={(e) => setDiaSemana(Number(e.target.value))}
      >
        {DIAS_DA_SEMANA.map((rotulo, indice) => (
          <option key={rotulo} value={indice}>
            {rotulo}
          </option>
        ))}
      </select>
      <CampoTexto
        rotulo="Horário de início"
        type="time"
        required
        value={horaInicio}
        onChange={(e) => setHoraInicio(e.target.value)}
      />
      <CampoTexto
        rotulo="Horário de fim"
        type="time"
        required
        value={horaFim}
        onChange={(e) => setHoraFim(e.target.value)}
      />
      <CampoTexto
        rotulo="Valor adicional"
        type="number"
        step="0.01"
        required
        value={valorAdicional}
        onChange={(e) => setValorAdicional(e.target.value)}
      />
      <Botao type="submit" variante="primario" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </Botao>
      <Botao variante="secundario" disabled={salvando} onClick={aoFechar}>
        Cancelar
      </Botao>
    </form>
  )
}
