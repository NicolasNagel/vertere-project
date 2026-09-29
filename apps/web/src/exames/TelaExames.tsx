import { useState } from 'react'
import { Botao } from '../ui/Botao'
import { useSessao } from '../autenticacao/SessaoContext'
import type { components } from '../api/tipos.gerados'
import { FormularioExame } from './FormularioExame'
import { useExames } from './useExames'

type ExameResponse = components['schemas']['ExameResponse']
type CriarExameRequest = components['schemas']['CriarExameRequest']

function LinhaExame({ exame }: { exame: ExameResponse }) {
  return (
    <tr>
      <td>{exame.categoria}</td>
      <td>{exame.nome}</td>
      <td>{exame.preco_base}</td>
      <td>{exame.ativo ? 'Ativo' : 'Inativo'}</td>
    </tr>
  )
}

function CatalogoDeExames() {
  const { exames, carregando, erro, criar } = useExames()
  const { papel } = useSessao()
  const [formularioAberto, setFormularioAberto] = useState(false)
  const podeGerenciar = papel === 'admin'

  return (
    <div>
      {erro ? <p role="alert">{erro}</p> : null}

      {podeGerenciar ? (
        <Botao onClick={() => setFormularioAberto(true)}>Novo exame</Botao>
      ) : null}
      {formularioAberto ? (
        <FormularioExame
          aoSalvar={(dados: CriarExameRequest) => {
            criar(dados)
            setFormularioAberto(false)
          }}
        />
      ) : null}

      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Nome</th>
              <th>Preço-base</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {exames.map((exame) => (
              <LinhaExame key={exame.id} exame={exame} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function TelaExames() {
  return (
    <div>
      <h1>Exames</h1>
      <CatalogoDeExames />
    </div>
  )
}
