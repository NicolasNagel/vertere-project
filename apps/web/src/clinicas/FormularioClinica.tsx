import { type FormEvent, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import { useEnvioFormulario } from '../ui/useEnvioFormulario'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'

type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']
type ClinicaResponse = components['schemas']['ClinicaResponse']

interface FormularioClinicaProps {
  /** Presente em modo edição: pré-preenche os campos e torna o CNPJ somente leitura. */
  clinica?: ClinicaResponse
  aoSalvar: (dados: CriarClinicaRequest) => Promise<ResultadoAcao>
  /** Chamado no sucesso do salvamento e no "Cancelar". */
  aoFechar: () => void
}

export function FormularioClinica({ clinica, aoSalvar, aoFechar }: FormularioClinicaProps) {
  const [nome, setNome] = useState(clinica?.nome ?? '')
  const [cnpj, setCnpj] = useState(clinica?.cnpj ?? '')
  const [endereco, setEndereco] = useState(clinica?.endereco ?? '')
  const [telefone, setTelefone] = useState(clinica?.telefone ?? '')
  const [email, setEmail] = useState(clinica?.email ?? '')
  const { salvando, erroEnvio, enviar } = useEnvioFormulario(
    () => aoSalvar({ nome, cnpj, endereco, telefone, email }),
    aoFechar,
  )

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    void enviar()
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erroEnvio ? <p role="alert">{erroEnvio}</p> : null}
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
      <Botao type="submit" variante="primario" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </Botao>
      <Botao variante="secundario" disabled={salvando} onClick={aoFechar}>
        Cancelar
      </Botao>
    </form>
  )
}
