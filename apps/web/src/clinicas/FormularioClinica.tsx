import { type FormEvent, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import type { components } from '../api/tipos.gerados'

type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']

interface FormularioClinicaProps {
  aoSalvar: (dados: CriarClinicaRequest) => void
}

export function FormularioClinica({ aoSalvar }: FormularioClinicaProps) {
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')

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
