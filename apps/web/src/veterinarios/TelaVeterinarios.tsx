import { useId, useState } from 'react'
import { Botao } from '../ui/Botao'
import { useClinicas } from '../clinicas/useClinicas'
import type { components } from '../api/tipos.gerados'
import { FormularioVeterinario } from './FormularioVeterinario'
import { useVeterinarios } from './useVeterinarios'

type ClinicaResponse = components['schemas']['ClinicaResponse']
type VeterinarioResponse = components['schemas']['VeterinarioResponse']

function LinhaVeterinario({
  veterinario,
  clinicasAtivas,
  aoEditar,
  aoInativar,
  aoReativar,
}: {
  veterinario: VeterinarioResponse
  clinicasAtivas: ClinicaResponse[]
  aoEditar: (dados: Parameters<typeof FormularioVeterinario>[0]['aoSalvar']) => void
  aoInativar: () => void
  aoReativar: () => void
}) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <tr>
        <td colSpan={5}>
          <FormularioVeterinario
            clinicasAtivas={clinicasAtivas}
            veterinario={veterinario}
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
      <td>{veterinario.nome}</td>
      <td>{veterinario.crmv}</td>
      <td>{veterinario.telefone}</td>
      <td>{veterinario.email}</td>
      <td>{veterinario.ativo ? 'Ativo' : 'Inativo'}</td>
      <td>
        <Botao onClick={() => setEditando(true)}>Editar</Botao>
        {veterinario.ativo ? (
          <Botao onClick={aoInativar}>Inativar</Botao>
        ) : (
          <Botao onClick={aoReativar}>Reativar</Botao>
        )}
      </td>
    </tr>
  )
}

export function TelaVeterinarios() {
  const { clinicas } = useClinicas()
  const { veterinarios, carregando, erro, definirFiltroClinicaId, criar, editar, inativar, reativar } =
    useVeterinarios()
  const [formularioAberto, setFormularioAberto] = useState(false)
  const idFiltro = useId()
  const clinicasAtivas = clinicas.filter((clinica) => clinica.ativo)

  return (
    <div>
      <h1>Veterinários</h1>
      {erro ? <p role="alert">{erro}</p> : null}

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

      <Botao onClick={() => setFormularioAberto(true)}>Novo veterinário</Botao>
      {formularioAberto ? (
        <FormularioVeterinario
          clinicasAtivas={clinicasAtivas}
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
              <th>CRMV</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {veterinarios.map((veterinario) => (
              <LinhaVeterinario
                key={veterinario.id}
                veterinario={veterinario}
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
