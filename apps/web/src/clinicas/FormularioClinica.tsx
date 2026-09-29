import { type FormEvent, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import type { components } from '../api/tipos.gerados'

type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']
type ClinicaResponse = components['schemas']['ClinicaResponse']

interface FormularioClinicaProps {
  /** Presente em modo edição: pré-preenche os campos e torna o CNPJ somente leitura. */
  clinica?: ClinicaResponse
  aoSalvar: (dados: CriarClinicaRequest) => void
}

export function FormularioClinica({ clinica, aoSalvar }: FormularioClinicaProps) {
  const [nome, setNome] = useState(clinica?.nome ?? '')
  const [cnpj, setCnpj] = useState(clinica?.cnpj ?? '')
  const [endereco, setEndereco] = useState(clinica?.endereco ?? '')
  const [telefone, setTelefone] = useState(clinica?.telefone ?? '')
  const [email, setEmail] = useState(clinica?.email ?? '')

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    aoSalvar({ nome, cnpj, endereco, telefone, email })
  }

  return (
    <form onSubmit={aoSubmeter}>
      <CampoTexto rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      <CampoTexto
        rotulo="CNPJ"
        required
        readOnly={Boolean(clinica)}
        value={cnpj}
        onChange={(e) => setCnpj(e.target.value)}
      />
      <CampoTexto
        rotulo="Endereço"
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
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
      <Botao type="submit" variante="primario">
        Salvar
      </Botao>
    </form>
  )
}
