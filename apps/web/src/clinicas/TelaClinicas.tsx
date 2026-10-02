import { useState } from 'react'
import { useSessao } from '../autenticacao/SessaoContext'
import { podeExecutar } from '../autenticacao/permissoesDeTela'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import { FormularioClinica } from './FormularioClinica'
import { useClinicas } from './useClinicas'

type ClinicaResponse = components['schemas']['ClinicaResponse']
type CriarClinicaRequest = components['schemas']['CriarClinicaRequest']

function LinhaClinica({
  clinica,
  podeGerenciar,
  aoEditar,
  aoInativar,
  aoReativar,
  aoDefinirPrazoPagamento,
}: {
  clinica: ClinicaResponse
  podeGerenciar: boolean
  aoEditar: (dados: CriarClinicaRequest) => Promise<ResultadoAcao>
  aoInativar: () => void
  aoReativar: () => void
  aoDefinirPrazoPagamento: (dias: number) => void
}) {
  const [editando, setEditando] = useState(false)
  const [prazo, setPrazo] = useState(String(clinica.prazo_pagamento_dias ?? ''))

  if (editando) {
    return (
      <tr>
        <td colSpan={podeGerenciar ? 6 : 5}>
          <FormularioClinica
            clinica={clinica}
            aoSalvar={aoEditar}
            aoFechar={() => setEditando(false)}
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
      {podeGerenciar ? (
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
      ) : null}
    </tr>
  )
}

export function TelaClinicas() {
  const {
    clinicas,
    carregando,
    erro,
    aviso,
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
  const { papel } = useSessao()
  const [formularioAberto, setFormularioAberto] = useState(false)
  const podeGerenciar = podeExecutar(papel, 'CLINICA_GERENCIAR')

  return (
    <div>
      <h1>Clínicas</h1>
      {erro ? <p role="alert">{erro}</p> : null}
      {aviso ? <p role="status">{aviso}</p> : null}

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

      {podeGerenciar ? (
        <Botao onClick={() => setFormularioAberto(true)}>Nova clínica</Botao>
      ) : null}
      {formularioAberto ? (
        <FormularioClinica aoSalvar={criar} aoFechar={() => setFormularioAberto(false)} />
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
              {podeGerenciar ? <th>Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {clinicas.map((clinica) => (
              <LinhaClinica
                key={clinica.id}
                clinica={clinica}
                podeGerenciar={podeGerenciar}
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
