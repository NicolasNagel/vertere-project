import { type FormEvent, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import { useEnvioFormulario } from '../ui/useEnvioFormulario'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'

type CriarExameRequest = components['schemas']['CriarExameRequest']
type ExameResponse = components['schemas']['ExameResponse']

interface FormularioExameProps {
  /** Presente em modo edição: pré-preenche os campos. */
  exame?: ExameResponse
  aoSalvar: (dados: CriarExameRequest) => Promise<ResultadoAcao>
  /** Chamado no sucesso do salvamento e no "Cancelar". */
  aoFechar: () => void
}

export function FormularioExame({ exame, aoSalvar, aoFechar }: FormularioExameProps) {
  const [categoria, setCategoria] = useState(exame?.categoria ?? '')
  const [nome, setNome] = useState(exame?.nome ?? '')
  const [precoBase, setPrecoBase] = useState(exame?.preco_base ?? '')
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const { salvando, erroEnvio, enviar } = useEnvioFormulario(
    () => aoSalvar({ categoria, nome, preco_base: precoBase }),
    aoFechar,
  )

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Validação local para resposta imediata; o backend também recusa desde S14 (FR-009).
    if (!(Number(precoBase) > 0)) {
      setErroValidacao('Preço-base deve ser maior que zero.')
      return
    }
    setErroValidacao(null)
    void enviar()
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erroValidacao || erroEnvio ? <p role="alert">{erroValidacao ?? erroEnvio}</p> : null}
      <CampoTexto
        rotulo="Categoria"
        required
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
      />
      <CampoTexto rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      <CampoTexto
        rotulo="Preço-base"
        type="number"
        step="0.01"
        required
        value={precoBase}
        onChange={(e) => setPrecoBase(e.target.value)}
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
