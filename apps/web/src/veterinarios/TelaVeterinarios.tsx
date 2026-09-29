import { useId, useState } from 'react'
import { Botao } from '../ui/Botao'
import { useClinicas } from '../clinicas/useClinicas'
import { FormularioVeterinario } from './FormularioVeterinario'
import { useVeterinarios } from './useVeterinarios'

export function TelaVeterinarios() {
  const { clinicas } = useClinicas()
  const { veterinarios, carregando, erro, definirFiltroClinicaId, criar } = useVeterinarios()
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
            </tr>
          </thead>
          <tbody>
            {veterinarios.map((veterinario) => (
              <tr key={veterinario.id}>
                <td>{veterinario.nome}</td>
                <td>{veterinario.crmv}</td>
                <td>{veterinario.telefone}</td>
                <td>{veterinario.email}</td>
                <td>{veterinario.ativo ? 'Ativo' : 'Inativo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
