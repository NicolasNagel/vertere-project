import { useCallback, useRef, useState } from 'react'
import type { ResultadoAcao } from '../api/useColecaoCrud'

/**
 * Máquina de envio compartilhada pelos formulários de cadastro (S14, FR-001–FR-003): só fecha com
 * sucesso, guarda a mensagem da falha e ignora um novo envio enquanto o anterior não terminou. Os
 * valores digitados continuam como estado do próprio formulário, que só desmonta em sucesso ou
 * "Cancelar", por isso uma falha não os perde.
 */
export function useEnvioFormulario(aoSalvar: () => Promise<ResultadoAcao>, aoFechar: () => void) {
  const [salvando, setSalvando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  // `ref`, não o estado: dois cliques no mesmo render ainda veriam `salvando === false`.
  const emAndamento = useRef(false)

  const enviar = useCallback(async () => {
    if (emAndamento.current) return
    emAndamento.current = true
    setSalvando(true)
    try {
      const resultado = await aoSalvar()
      if (resultado.ok) {
        setErroEnvio(null)
        aoFechar()
      } else {
        setErroEnvio(resultado.mensagem)
      }
    } finally {
      emAndamento.current = false
      setSalvando(false)
    }
  }, [aoSalvar, aoFechar])

  return { salvando, erroEnvio, enviar }
}
