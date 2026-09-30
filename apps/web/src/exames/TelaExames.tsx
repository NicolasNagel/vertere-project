import { useState } from 'react'
import { Botao } from '../ui/Botao'
import { useSessao } from '../autenticacao/SessaoContext'
import type { components } from '../api/tipos.gerados'
import { FormularioExame } from './FormularioExame'
import { useExames } from './useExames'

type ExameResponse = components['schemas']['ExameResponse']
type CriarExameRequest = components['schemas']['CriarExameRequest']

function LinhaExame({
  exame,
  podeGerenciar,
  aoEditar,
  aoInativar,
  aoReativar,
}: {
  exame: ExameResponse
  podeGerenciar: boolean
  aoEditar: (dados: CriarExameRequest) => void
  aoInativar: () => void
  aoReativar: () => void
}) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <tr>
        <td colSpan={4}>
          <FormularioExame
            exame={exame}
            aoSalvar={(dados) => {
              aoEditar(dados)
              setEditando(false)
            }}
          />
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{exame.categoria}</td>
      <td>{exame.nome}</td>
      <td>{exame.preco_base}</td>
      <td>{exame.ativo ? 'Ativo' : 'Inativo'}</td>
      {podeGerenciar ? (
        <td>
          <Botao onClick={() => setEditando(true)}>Editar</Botao>
          {exame.ativo ? (
            <Botao onClick={aoInativar}>Inativar</Botao>
          ) : (
            <Botao onClick={aoReativar}>Reativar</Botao>
          )}
        </td>
      ) : null}
    </tr>
  )
}

function CatalogoDeExames() {
  const { exames, carregando, erro, criar, editar, inativar, reativar } = useExames()
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
              {podeGerenciar ? <th>Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {exames.map((exame) => (
              <LinhaExame
                key={exame.id}
                exame={exame}
                podeGerenciar={podeGerenciar}
                aoEditar={(dados) => editar(exame.id, dados)}
                aoInativar={() => inativar(exame.id)}
                aoReativar={() => reativar(exame.id)}
              />
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
