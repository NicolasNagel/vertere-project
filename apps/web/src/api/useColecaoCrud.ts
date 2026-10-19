import { useCallback, useEffect, useRef, useState } from 'react'
import { ErroHttp } from './clienteHttp'

const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com o servidor. Tente novamente.'
const AVISO_FORA_DO_FILTRO =
  'Cadastro salvo. Ele não aparece na lista por causa dos filtros ativos.'

/** Retorno de toda ação disparada por formulário: o formulário decide fechar ou mostrar a mensagem. */
export type ResultadoAcao = { ok: true } | { ok: false; mensagem: string }

/**
 * Esqueleto de carregamento/erro compartilhado pelos hooks de domínio das telas de cadastro
 * (`useClinicas`, `useVeterinarios`, `useExames`, `useRegrasPlantao`). Extraído em S13 e estendido
 * em S14 (specs/014-polimento-telas-web/research.md, Decisão 3):
 * - ações de formulário (`criar`, `salvarItem`) devolvem `ResultadoAcao` e não usam `erro`, que
 *   fica para a lista e as ações de linha (`executarAcaoSobreItem`);
 * - toda ação bem-sucedida recarrega a lista do servidor, que já aplica os filtros ativos, sem
 *   voltar ao estado "carregando";
 * - um item criado que não volta na recarga (filtrado) gera `aviso`.
 */
export function useColecaoCrud<T extends { id: string }>(
  carregarLista: () => Promise<T[]>,
  mensagemDeErro: (erro: ErroHttp) => string,
) {
  const [itens, setItens] = useState<T[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const carregarListaAtual = useRef(carregarLista)
  const versaoDaCarga = useRef(0)

  useEffect(() => {
    carregarListaAtual.current = carregarLista
  }, [carregarLista])

  // Falha sem resposta HTTP (rede fora, servidor desligado — o `fetch` rejeita com `TypeError`)
  // precisa virar erro visível: engolida, a tela mostraria a lista vazia como se não houvesse itens.
  const mensagemParaFalha = useCallback(
    (falha: unknown) =>
      falha instanceof ErroHttp ? mensagemDeErro(falha) : MENSAGEM_SEM_CONEXAO,
    [mensagemDeErro],
  )

  const recarregar = useCallback(async () => {
    const versao = ++versaoDaCarga.current
    const carregar = carregarListaAtual.current
    setCarregando(true)
    setErro(null)
    setAviso(null)
    try {
      const lista = await carregar()
      if (versao === versaoDaCarga.current) {
        setItens(lista)
      }
    } catch (erroRequisicao) {
      if (versao === versaoDaCarga.current) {
        setErro(mensagemParaFalha(erroRequisicao))
      }
    } finally {
      if (versao === versaoDaCarga.current) {
        setCarregando(false)
      }
    }
  }, [mensagemParaFalha])

  useEffect(() => {
    recarregar()
  }, [carregarLista, recarregar])

  /** Recarga depois de uma ação: sem "carregando", e com a falha indo para o erro de tela. */
  const recarregarDepoisDeAcao = useCallback(async (): Promise<T[] | null> => {
    const versao = ++versaoDaCarga.current
    const carregar = carregarListaAtual.current
    try {
      const lista = await carregar()
      if (versao === versaoDaCarga.current) {
        setItens(lista)
        return lista
      }
      return null
    } catch (erroRequisicao) {
      if (versao === versaoDaCarga.current) {
        setErro(mensagemParaFalha(erroRequisicao))
      }
      return null
    }
  }, [mensagemParaFalha])

  const criar = useCallback(
    async (acao: () => Promise<T>): Promise<ResultadoAcao> => {
      setErro(null)
      setAviso(null)
      let criado: T
      try {
        criado = await acao()
      } catch (erroRequisicao) {
        return { ok: false, mensagem: mensagemParaFalha(erroRequisicao) }
      }
      const lista = await recarregarDepoisDeAcao()
      if (lista && !lista.some((item) => item.id === criado.id)) {
        setAviso(AVISO_FORA_DO_FILTRO)
      }
      return { ok: true }
    },
    [mensagemParaFalha, recarregarDepoisDeAcao],
  )

  const salvarItem = useCallback(
    async (acao: () => Promise<T>): Promise<ResultadoAcao> => {
      setErro(null)
      setAviso(null)
      try {
        await acao()
      } catch (erroRequisicao) {
        return { ok: false, mensagem: mensagemParaFalha(erroRequisicao) }
      }
      await recarregarDepoisDeAcao()
      return { ok: true }
    },
    [mensagemParaFalha, recarregarDepoisDeAcao],
  )

  const executarAcaoSobreItem = useCallback(
    async (acao: () => Promise<T>) => {
      setErro(null)
      setAviso(null)
      try {
        await acao()
      } catch (erroRequisicao) {
        setErro(mensagemParaFalha(erroRequisicao))
        return
      }
      await recarregarDepoisDeAcao()
    },
    [mensagemParaFalha, recarregarDepoisDeAcao],
  )

  return { itens, carregando, erro, aviso, recarregar, criar, salvarItem, executarAcaoSobreItem }
}
