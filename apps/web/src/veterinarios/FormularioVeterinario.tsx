import { type FormEvent, useId, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import { useEnvioFormulario } from '../ui/useEnvioFormulario'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'

type CriarVeterinarioRequest = components['schemas']['CriarVeterinarioRequest']
type ClinicaResponse = components['schemas']['ClinicaResponse']
type VeterinarioResponse = components['schemas']['VeterinarioResponse']

interface FormularioVeterinarioProps {
  clinicasAtivas: ClinicaResponse[]
  /** Presente em modo edição: pré-preenche os campos e torna CRMV/clínica somente leitura. */
  veterinario?: VeterinarioResponse
  aoSalvar: (dados: CriarVeterinarioRequest) => Promise<ResultadoAcao>
  /** Chamado no sucesso do salvamento e no "Cancelar". */
  aoFechar: () => void
}

export function FormularioVeterinario({
  clinicasAtivas,
  veterinario,
  aoSalvar,
  aoFechar,
}: FormularioVeterinarioProps) {
  const idClinica = useId()
  const [nome, setNome] = useState(veterinario?.nome ?? '')
  const [crmv, setCrmv] = useState(veterinario?.crmv ?? '')
  const [telefone, setTelefone] = useState(veterinario?.telefone ?? '')
  const [email, setEmail] = useState(veterinario?.email ?? '')
  const [clinicaId, setClinicaId] = useState(veterinario?.clinica_id ?? clinicasAtivas[0]?.id ?? '')
  const { salvando, erroEnvio, enviar } = useEnvioFormulario(
    () => aoSalvar({ nome, crmv, telefone, email, clinica_id: clinicaId }),
    aoFechar,
  )

  if (!veterinario && clinicasAtivas.length === 0) {
    return (
      <div>
        <p>
          Nenhuma clínica ativa cadastrada — cadastre uma clínica antes de cadastrar um veterinário.
        </p>
        <Botao variante="secundario" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    )
  }

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!clinicaId) return
    void enviar()
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erroEnvio ? <p role="alert">{erroEnvio}</p> : null}
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
      <Botao type="submit" variante="primario" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </Botao>
      <Botao variante="secundario" disabled={salvando} onClick={aoFechar}>
        Cancelar
      </Botao>
    </form>
  )
}
