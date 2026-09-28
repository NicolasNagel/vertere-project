import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import './campo-texto.css'

interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  rotulo: string
  icone?: ReactNode
  /** Quando `true`, mostra o botão acessível de alternar mostrar/ocultar senha (melhoria de UI/UX
   * sobre o mock de referência, que usava um `<span>` sem função nenhuma — ver research.md). */
  comAlternarSenha?: boolean
}

export function CampoTexto({
  rotulo,
  icone,
  comAlternarSenha = false,
  type = 'text',
  ...props
}: CampoTextoProps) {
  const id = useId()
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const tipoReal = comAlternarSenha ? (senhaVisivel ? 'text' : 'password') : type

  return (
    <div className="campo-texto">
      <label className="campo-texto__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <div className="campo-texto__caixa">
        {icone ? <span className="campo-texto__icone">{icone}</span> : null}
        <input id={id} type={tipoReal} className="campo-texto__input" {...props} />
        {comAlternarSenha ? (
          <button
            type="button"
            className="campo-texto__alternar-senha"
            aria-pressed={senhaVisivel}
            onClick={() => setSenhaVisivel((atual) => !atual)}
          >
            {senhaVisivel ? 'ocultar' : 'mostrar'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
