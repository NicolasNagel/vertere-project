import { useId, type FormEvent, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import type { components } from '../api/tipos.gerados'
import { DIAS_DA_SEMANA, paraHoraSemSegundos } from './regraPlantao'

type CriarRegraPlantaoRequest = components['schemas']['CriarRegraPlantaoRequest']
type RegraPlantaoResponse = components['schemas']['RegraPlantaoResponse']

interface FormularioRegraPlantaoProps {
  /** Presente em modo edição: pré-preenche os campos. */
  regra?: RegraPlantaoResponse
  aoSalvar: (dados: CriarRegraPlantaoRequest) => void
}

export function FormularioRegraPlantao({ regra, aoSalvar }: FormularioRegraPlantaoProps) {
  const [diaSemana, setDiaSemana] = useState(regra?.dia_semana ?? 0)
  const [horaInicio, setHoraInicio] = useState(
    regra ? paraHoraSemSegundos(regra.hora_inicio) : '',
  )
  const [horaFim, setHoraFim] = useState(regra ? paraHoraSemSegundos(regra.hora_fim) : '')
  const [valorAdicional, setValorAdicional] = useState(regra?.valor_adicional ?? '')
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const idDiaSemana = useId()

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Mesmo motivo de FormularioExame: o backend (S5) não rejeita valor não positivo.
    if (!(Number(valorAdicional) > 0)) {
      setErroValidacao('Valor adicional deve ser maior que zero.')
      return
    }
    setErroValidacao(null)
    aoSalvar({
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      valor_adicional: valorAdicional,
    })
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erroValidacao ? <p role="alert">{erroValidacao}</p> : null}
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
      <Botao type="submit" variante="primario">
        Salvar
      </Botao>
    </form>
  )
}
