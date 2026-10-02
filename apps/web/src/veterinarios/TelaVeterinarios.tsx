import { useId, useState } from 'react'
import { useSessao } from '../autenticacao/SessaoContext'
import { podeExecutar } from '../autenticacao/permissoesDeTela'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import { useClinicas } from '../clinicas/useClinicas'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import { FormularioVeterinario } from './FormularioVeterinario'
import { useVeterinarios } from './useVeterinarios'

type ClinicaResponse = components['schemas']['ClinicaResponse']
type VeterinarioResponse = components['schemas']['VeterinarioResponse']
type CriarVeterinarioRequest = components['schemas']['CriarVeterinarioRequest']

function LinhaVeterinario({
  veterinario,
  clinicasAtivas,
  podeGerenciar,
  aoEditar,
  aoInativar,
  aoReativar,
}: {
  veterinario: VeterinarioResponse
  clinicasAtivas: ClinicaResponse[]
  podeGerenciar: boolean
  aoEditar: (dados: CriarVeterinarioRequest) => Promise<ResultadoAcao>
  aoInativar: () => void
  aoReativar: () => void
}) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <tr>
        <td colSpan={podeGerenciar ? 6 : 5}>
          <FormularioVeterinario
            clinicasAtivas={clinicasAtivas}
            veterinario={veterinario}
            aoSalvar={aoEditar}
            aoFechar={() => setEditando(false)}
          />
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{veterinario.nome}</td>
      <td>{veterinario.crmv}</td>
      <td>{veterinario.telefone}</td>
      <td>{veterinario.email}</td>
      <td>{veterinario.ativo ? 'Ativo' : 'Inativo'}</td>
      {podeGerenciar ? (
        <td>
          <Botao onClick={() => setEditando(true)}>Editar</Botao>
          {veterinario.ativo ? (
            <Botao onClick={aoInativar}>Inativar</Botao>
          ) : (
            <Botao onClick={aoReativar}>Reativar</Botao>
          )}
        </td>
      ) : null}
    </tr>
  )
}

export function TelaVeterinarios() {
  const { clinicas } = useClinicas()
  const {
    veterinarios,
    carregando,
    erro,
    aviso,
    definirFiltroClinicaId,
    termoBusca,
    definirTermoBusca,
    apenasAtivos,
    definirApenasAtivos,
    criar,
    editar,
    inativar,
    reativar,
  } = useVeterinarios()
  const { papel } = useSessao()
  const podeGerenciar = podeExecutar(papel, 'VETERINARIO_GERENCIAR')
  const [formularioAberto, setFormularioAberto] = useState(false)
  const idFiltro = useId()
  const clinicasAtivas = clinicas.filter((clinica) => clinica.ativo)

  return (
    <div>
      <h1>Veterinários</h1>
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
          checked={apenasAtivos}
          onChange={(e) => definirApenasAtivos(e.target.checked)}
        />
        Apenas ativos
      </label>

      <label htmlFor={idFiltro}>Filtrar por clínica</label>
      <select
        id={idFiltro}
        onChange={(e) => definirFiltroClinicaId(e.target.value || undefined)}
      >
        <option value="">Todas</option>
        {clinicasAtivas.map((clinica) => (
          <option key={clinica.id} value={clinica.id}>
            {clinica.nome}
          </option>
        ))}
      </select>

      {podeGerenciar ? (
        <Botao onClick={() => setFormularioAberto(true)}>Novo veterinário</Botao>
      ) : null}
      {formularioAberto ? (
        <FormularioVeterinario
          clinicasAtivas={clinicasAtivas}
          aoSalvar={criar}
          aoFechar={() => setFormularioAberto(false)}
        />
      ) : null}

      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CRMV</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Status</th>
              {podeGerenciar ? <th>Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {veterinarios.map((veterinario) => (
              <LinhaVeterinario
                key={veterinario.id}
                veterinario={veterinario}
                podeGerenciar={podeGerenciar}
                clinicasAtivas={clinicasAtivas}
                aoEditar={(dados) => editar(veterinario.id, dados)}
                aoInativar={() => inativar(veterinario.id)}
                aoReativar={() => reativar(veterinario.id)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
