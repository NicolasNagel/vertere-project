import { type FormEvent, useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import type { components } from '../api/tipos.gerados'

type CriarExameRequest = components['schemas']['CriarExameRequest']
type ExameResponse = components['schemas']['ExameResponse']

interface FormularioExameProps {
  /** Presente em modo edição: pré-preenche os campos. */
  exame?: ExameResponse
  aoSalvar: (dados: CriarExameRequest) => void
}

export function FormularioExame({ exame, aoSalvar }: FormularioExameProps) {
  const [categoria, setCategoria] = useState(exame?.categoria ?? '')
  const [nome, setNome] = useState(exame?.nome ?? '')
  const [precoBase, setPrecoBase] = useState(exame?.preco_base ?? '')

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    aoSalvar({ categoria, nome, preco_base: precoBase })
  }

  return (
    <form onSubmit={aoSubmeter}>
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
        min="0.01"
        required
        value={precoBase}
        onChange={(e) => setPrecoBase(e.target.value)}
      />
      <Botao type="submit" variante="primario">
        Salvar
      </Botao>
    </form>
  )
}
