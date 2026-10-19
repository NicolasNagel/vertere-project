import { useId, useState } from 'react'
import { Botao } from '../ui/Botao'
import { formatarMoeda } from '../ui/formatacao'
import { useSessao } from '../autenticacao/SessaoContext'
import { podeExecutar } from '../autenticacao/permissoesDeTela'
import type { ResultadoAcao } from '../api/useColecaoCrud'
import type { components } from '../api/tipos.gerados'
import { FormularioExame } from './FormularioExame'
import { FormularioRegraPlantao } from './FormularioRegraPlantao'
import { DIAS_DA_SEMANA, paraHoraSemSegundos } from './regraPlantao'
import { useExames } from './useExames'
import { useRegrasPlantao } from './useRegrasPlantao'

type ExameResponse = components['schemas']['ExameResponse']
type CriarExameRequest = components['schemas']['CriarExameRequest']
type RegraPlantaoResponse = components['schemas']['RegraPlantaoResponse']
type CriarRegraPlantaoRequest = components['schemas']['CriarRegraPlantaoRequest']

function LinhaExame({
  exame,
  podeGerenciar,
  aoEditar,
  aoInativar,
  aoReativar,
}: {
  exame: ExameResponse
  podeGerenciar: boolean
  aoEditar: (dados: CriarExameRequest) => Promise<ResultadoAcao>
  aoInativar: () => void
  aoReativar: () => void
}) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <tr>
        <td colSpan={podeGerenciar ? 5 : 4}>
          <FormularioExame
            exame={exame}
            aoSalvar={aoEditar}
            aoFechar={() => setEditando(false)}
          />
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{exame.categoria}</td>
      <td>{exame.nome}</td>
      <td>{formatarMoeda(exame.preco_base)}</td>
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

function categoriasDistintas(exames: ExameResponse[]): string[] {
  return [...new Set(exames.map((exame) => exame.categoria))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
}

function CatalogoDeExames() {
  const {
    exames,
    carregando,
    erro,
    aviso,
    categoria,
    definirCategoria,
    apenasAtivos,
    definirApenasAtivos,
    criar,
    editar,
    inativar,
    reativar,
  } = useExames()
  const { papel } = useSessao()
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [categoriasConhecidas, setCategoriasConhecidas] = useState<string[]>([])
  const idFiltroCategoria = useId()
  const podeGerenciar = podeExecutar(papel, 'EXAME_GERENCIAR')

  // Com o filtro de categoria ativo a lista só traz aquela categoria (o backend filtra por igualdade
  // exata), então as opções do select vêm da última listagem sem filtro — senão não daria para
  // trocar de uma categoria para outra direto.
  const categoriasDaLista = categoriasDistintas(exames)
  if (
    categoria === undefined &&
    !carregando &&
    categoriasDaLista.join('\n') !== categoriasConhecidas.join('\n')
  ) {
    setCategoriasConhecidas(categoriasDaLista)
  }
  const opcoesDeCategoria =
    categoria !== undefined && !categoriasConhecidas.includes(categoria)
      ? [...categoriasConhecidas, categoria]
      : categoriasConhecidas

  return (
    <div>
      {erro ? <p role="alert">{erro}</p> : null}
      {aviso ? <p role="status">{aviso}</p> : null}

      <label htmlFor={idFiltroCategoria}>Filtrar por categoria</label>
      <select
        id={idFiltroCategoria}
        value={categoria ?? ''}
        onChange={(e) => definirCategoria(e.target.value || undefined)}
      >
        <option value="">Todas as categorias</option>
        {opcoesDeCategoria.map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
      </select>
      <label>
        <input
          type="checkbox"
          checked={apenasAtivos}
          onChange={(e) => definirApenasAtivos(e.target.checked)}
        />
        Apenas ativos
      </label>

      {podeGerenciar ? (
        <Botao onClick={() => setFormularioAberto(true)}>Novo exame</Botao>
      ) : null}
      {formularioAberto ? (
        <FormularioExame aoSalvar={criar} aoFechar={() => setFormularioAberto(false)} />
      ) : null}

      {carregando ? (
        <p>Carregando…</p>
      ) : exames.length === 0 ? (
        erro ? null : (
          <p>Nenhum exame encontrado.</p>
        )
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

function LinhaRegraPlantao({
  regra,
  podeGerenciar,
  aoEditar,
  aoInativar,
  aoReativar,
}: {
  regra: RegraPlantaoResponse
  podeGerenciar: boolean
  aoEditar: (dados: CriarRegraPlantaoRequest) => Promise<ResultadoAcao>
  aoInativar: () => void
  aoReativar: () => void
}) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <tr>
        <td colSpan={podeGerenciar ? 5 : 4}>
          <FormularioRegraPlantao
            regra={regra}
            aoSalvar={aoEditar}
            aoFechar={() => setEditando(false)}
          />
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{DIAS_DA_SEMANA[regra.dia_semana]}</td>
      <td>
        {paraHoraSemSegundos(regra.hora_inicio)}–{paraHoraSemSegundos(regra.hora_fim)}
      </td>
      <td>{formatarMoeda(regra.valor_adicional)}</td>
      <td>{regra.ativo ? 'Ativa' : 'Inativa'}</td>
      {podeGerenciar ? (
        <td>
          <Botao onClick={() => setEditando(true)}>Editar</Botao>
          {regra.ativo ? (
            <Botao onClick={aoInativar}>Inativar</Botao>
          ) : (
            <Botao onClick={aoReativar}>Reativar</Botao>
          )}
        </td>
      ) : null}
    </tr>
  )
}

function RegrasDePlantao() {
  const {
    regras,
    carregando,
    erro,
    aviso,
    apenasAtivos,
    definirApenasAtivos,
    criar,
    editar,
    inativar,
    reativar,
  } = useRegrasPlantao()
  const { papel } = useSessao()
  const [formularioAberto, setFormularioAberto] = useState(false)
  const podeGerenciar = podeExecutar(papel, 'REGRA_PLANTAO_GERENCIAR')

  return (
    <div>
      {erro ? <p role="alert">{erro}</p> : null}
      {aviso ? <p role="status">{aviso}</p> : null}

      <label>
        <input
          type="checkbox"
          checked={apenasAtivos}
          onChange={(e) => definirApenasAtivos(e.target.checked)}
        />
        Apenas ativas
      </label>

      {podeGerenciar ? (
        <Botao onClick={() => setFormularioAberto(true)}>Nova regra</Botao>
      ) : null}
      {formularioAberto ? (
        <FormularioRegraPlantao aoSalvar={criar} aoFechar={() => setFormularioAberto(false)} />
      ) : null}

      {carregando ? (
        <p>Carregando…</p>
      ) : regras.length === 0 ? (
        erro ? null : (
          <p>Nenhuma regra de plantão encontrada.</p>
        )
      ) : (
        <table>
          <thead>
            <tr>
              <th>Dia da semana</th>
              <th>Horário</th>
              <th>Valor adicional</th>
              <th>Status</th>
              {podeGerenciar ? <th>Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {regras.map((regra) => (
              <LinhaRegraPlantao
                key={regra.id}
                regra={regra}
                podeGerenciar={podeGerenciar}
                aoEditar={(dados) => editar(regra.id, dados)}
                aoInativar={() => inativar(regra.id)}
                aoReativar={() => reativar(regra.id)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function TelaExames() {
  const { papel } = useSessao()
  const [abaAtiva, setAbaAtiva] = useState<'exames' | 'regras-plantao'>('exames')
  const podeVerRegrasPlantao = podeExecutar(papel, 'REGRA_PLANTAO_VER')

  return (
    <div>
      <h1>Exames</h1>
      <div role="tablist">
        <Botao onClick={() => setAbaAtiva('exames')}>Catálogo de Exames</Botao>
        {podeVerRegrasPlantao ? (
          <Botao onClick={() => setAbaAtiva('regras-plantao')}>Regras de Plantão</Botao>
        ) : null}
      </div>
      {abaAtiva === 'exames' || !podeVerRegrasPlantao ? (
        <CatalogoDeExames />
      ) : (
        <RegrasDePlantao />
      )}
    </div>
  )
}
