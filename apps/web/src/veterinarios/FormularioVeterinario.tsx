import { type FormEvent, useId, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import type { components } from '../api/tipos.gerados'

type CriarVeterinarioRequest = components['schemas']['CriarVeterinarioRequest']
type ClinicaResponse = components['schemas']['ClinicaResponse']
type VeterinarioResponse = components['schemas']['VeterinarioResponse']

interface FormularioVeterinarioProps {
  clinicasAtivas: ClinicaResponse[]
  /** Presente em modo edição: pré-preenche os campos e torna CRMV/clínica somente leitura. */
  veterinario?: VeterinarioResponse
  aoSalvar: (dados: CriarVeterinarioRequest) => void
}

export function FormularioVeterinario({
  clinicasAtivas,
  veterinario,
  aoSalvar,
}: FormularioVeterinarioProps) {
  const idClinica = useId()
  const [nome, setNome] = useState(veterinario?.nome ?? '')
  const [crmv, setCrmv] = useState(veterinario?.crmv ?? '')
  const [telefone, setTelefone] = useState(veterinario?.telefone ?? '')
  const [email, setEmail] = useState(veterinario?.email ?? '')
  const [clinicaId, setClinicaId] = useState(veterinario?.clinica_id ?? clinicasAtivas[0]?.id ?? '')

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!clinicaId) return
    aoSalvar({ nome, crmv, telefone, email, clinica_id: clinicaId })
  }

  return (
    <form onSubmit={aoSubmeter}>
      <CampoTexto rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      <CampoTexto
        rotulo="CRMV"
        required
        readOnly={Boolean(veterinario)}
        value={crmv}
        onChange={(e) => setCrmv(e.target.value)}
      />
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
        disabled={Boolean(veterinario)}
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
