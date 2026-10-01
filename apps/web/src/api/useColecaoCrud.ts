import { useCallback, useEffect, useState } from 'react'
import { ErroHttp } from './clienteHttp'

const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com o servidor. Tente novamente.'

/**
 * Esqueleto de carregamento/erro compartilhado por hooks de domínio (`useExames`,
 * `useRegrasPlantao`, ...) que expõem uma coleção de itens identificados por `id` sobre um CRUD
 * simples. Extraído em S13 depois de se repetir em `useClinicas.ts`/`useVeterinarios.ts` (S12) e
 * de novo nas duas entidades desta spec — ver `research.md` (Decisão 3). Retrofit de S12 para usar
 * este hook está deliberadamente fora do escopo desta spec.
 */
export function useColecaoCrud<T extends { id: string }>(
  carregarLista: () => Promise<T[]>,
  mensagemDeErro: (erro: ErroHttp) => string,
) {
  const [itens, setItens] = useState<T[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Falha sem resposta HTTP (rede fora, servidor desligado — o `fetch` rejeita com `TypeError`)
  // precisa virar erro visível: engolida, a tela mostraria a lista vazia como se não houvesse itens.
  const mensagemParaFalha = useCallback(
    (falha: unknown) =>
      falha instanceof ErroHttp ? mensagemDeErro(falha) : MENSAGEM_SEM_CONEXAO,
    [mensagemDeErro],
  )

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setItens(await carregarLista())
    } catch (erroRequisicao) {
      setErro(mensagemParaFalha(erroRequisicao))
    } finally {
      setCarregando(false)
    }
  }, [carregarLista, mensagemParaFalha])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const criar = useCallback(
    async (acao: () => Promise<T>) => {
      setErro(null)
      try {
        const item = await acao()
        setItens((atual) => [...atual, item])
      } catch (erroRequisicao) {
        setErro(mensagemParaFalha(erroRequisicao))
      }
    },
    [mensagemParaFalha],
  )

  const executarAcaoSobreItem = useCallback(
    async (acao: () => Promise<T>) => {
      setErro(null)
      try {
        const item = await acao()
        setItens((atual) => atual.map((i) => (i.id === item.id ? item : i)))
      } catch (erroRequisicao) {
        setErro(mensagemParaFalha(erroRequisicao))
      }
    },
    [mensagemParaFalha],
  )

  return { itens, carregando, erro, recarregar, criar, executarAcaoSobreItem }
}
