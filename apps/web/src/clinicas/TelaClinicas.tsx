import { useState } from 'react'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import type { components } from '../api/tipos.gerados'
import { FormularioClinica } from './FormularioClinica'
import { useClinicas } from './useClinicas'

type ClinicaResponse = components['schemas']['ClinicaResponse']
type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']

function LinhaClinica({
  clinica,
  aoEditar,
  aoInativar,
  aoReativar,
  aoDefinirPrazoPagamento,
}: {
  clinica: ClinicaResponse
  aoEditar: (dados: CriarClinicaRequest) => void
  aoInativar: () => void
  aoReativar: () => void
  aoDefinirPrazoPagamento: (dias: number) => void
}) {
  const [editando, setEditando] = useState(false)
  const [prazo, setPrazo] = useState(String(clinica.prazo_pagamento_dias ?? ''))

  if (editando) {
    return (
      <tr>
        <td colSpan={5}>
          <FormularioClinica
            clinica={clinica}
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
      <td>{clinica.nome}</td>
      <td>{clinica.cnpj}</td>
      <td>{clinica.telefone}</td>
      <td>{clinica.email}</td>
      <td>{clinica.ativo ? 'Ativa' : 'Inativa'}</td>
      <td>
        <Botao onClick={() => setEditando(true)}>Editar</Botao>
        {clinica.ativo ? (
          <Botao onClick={aoInativar}>Inativar</Botao>
        ) : (
          <Botao onClick={aoReativar}>Reativar</Botao>
        )}
        <CampoTexto
          rotulo="Prazo de pagamento (dias)"
          type="number"
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
        />
        <Botao onClick={() => aoDefinirPrazoPagamento(Number(prazo))}>Salvar prazo</Botao>
      </td>
    </tr>
  )
}

export function TelaClinicas() {
  const {
    clinicas,
    carregando,
    erro,
    termoBusca,
    definirTermoBusca,
    apenasAtivas,
    definirApenasAtivas,
    criar,
    editar,
    inativar,
    reativar,
    definirPrazoPagamento,
  } = useClinicas()
  const [formularioAberto, setFormularioAberto] = useState(false)

  return (
    <div>
      <h1>Clínicas</h1>
      {erro ? <p role="alert">{erro}</p> : null}

      <CampoTexto
        rotulo="Buscar por nome"
        value={termoBusca}
        onChange={(e) => definirTermoBusca(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={apenasAtivas}
          onChange={(e) => definirApenasAtivas(e.target.checked)}
        />
        Apenas ativas
      </label>

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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clinicas.map((clinica) => (
              <LinhaClinica
                key={clinica.id}
                clinica={clinica}
                aoEditar={(dados) => editar(clinica.id, dados)}
                aoInativar={() => inativar(clinica.id)}
                aoReativar={() => reativar(clinica.id)}
                aoDefinirPrazoPagamento={(dias) => definirPrazoPagamento(clinica.id, dias)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
