import { useState } from 'react'
import { Botao } from '../ui/Botao'
import { FormularioClinica } from './FormularioClinica'
import { useClinicas } from './useClinicas'

export function TelaClinicas() {
  const { clinicas, carregando, erro, criar } = useClinicas()
  const [formularioAberto, setFormularioAberto] = useState(false)

  return (
    <div>
      <h1>Clínicas</h1>
      {erro ? <p role="alert">{erro}</p> : null}
      <Botao onClick={() => setFormularioAberto(true)}>Nova clínica</Botao>
      {formularioAberto ? (
        <FormularioClinica
          aoSalvar={(dados) => {
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
              <th>Nome</th>
              <th>CNPJ</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {clinicas.map((clinica) => (
              <tr key={clinica.id}>
                <td>{clinica.nome}</td>
                <td>{clinica.cnpj}</td>
                <td>{clinica.telefone}</td>
                <td>{clinica.email}</td>
                <td>{clinica.ativo ? 'Ativa' : 'Inativa'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
