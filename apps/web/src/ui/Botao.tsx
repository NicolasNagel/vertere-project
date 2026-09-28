import type { ButtonHTMLAttributes } from 'react'
import './botao.css'

type Variante = 'primario' | 'secundario' | 'fantasma'

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

export function Botao({ variante = 'primario', className, type = 'button', ...props }: BotaoProps) {
  const classes = ['botao', `botao--${variante}`, className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...props} />
}
