import { type FormEvent, useId, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import type { components } from '../api/tipos.gerados'

type CriarVeterinarioRequest = components['schemas']['CriarVeterinarioRequest']
type ClinicaResponse = components['schemas']['ClinicaResponse']

interface FormularioVeterinarioProps {
  clinicasAtivas: ClinicaResponse[]
  aoSalvar: (dados: CriarVeterinarioRequest) => void
}

export function FormularioVeterinario({ clinicasAtivas, aoSalvar }: FormularioVeterinarioProps) {
  const idClinica = useId()
  const [nome, setNome] = useState('')
  const [crmv, setCrmv] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [clinicaId, setClinicaId] = useState(clinicasAtivas[0]?.id ?? '')

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!clinicaId) return
    aoSalvar({ nome, crmv, telefone, email, clinica_id: clinicaId })
  }

  return (
    <form onSubmit={aoSubmeter}>
      <CampoTexto rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      <CampoTexto rotulo="CRMV" required value={crmv} onChange={(e) => setCrmv(e.target.value)} />
      <CampoTexto
        rotulo="Telefone"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
      />
      <CampoTexto
        rotulo="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor={idClinica}>Clínica</label>
      <select
        id={idClinica}
        required
        value={clinicaId}
        onChange={(e) => setClinicaId(e.target.value)}
      >
        {clinicasAtivas.map((clinica) => (
          <option key={clinica.id} value={clinica.id}>
            {clinica.nome}
          </option>
        ))}
      </select>
      <Botao type="submit" variante="primario">
        Salvar
      </Botao>
    </form>
  )
}
