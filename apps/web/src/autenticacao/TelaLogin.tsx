import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router'
import { Botao } from '../ui/Botao'
import { CampoTexto } from '../ui/CampoTexto'
import { PainelMarca } from './PainelMarca'
import './tela-login.css'
import { useSessao } from './useSessao'

function IconeUsuario() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconeSenha() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export function TelaLogin() {
  const { autenticado, erro, carregando, login } = useSessao()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  if (autenticado) {
    return <Navigate to="/" replace />
  }

  async function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await login(email, senha)
  }

  return (
    <div className="tela-login">
      <div className="tela-login__cartao">
        <PainelMarca />
        <div className="tela-login__painel-formulario">
          <form className="tela-login__formulario" onSubmit={aoSubmeter}>
            <p className="tela-login__eyebrow">Acesso ao sistema</p>
            <h1 className="tela-login__titulo">
              Bem-vinda
              <br />
              <em>de volta.</em>
            </h1>

            <CampoTexto
              rotulo="Usuário"
              icone={<IconeUsuario />}
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
            <CampoTexto
              rotulo="Senha"
              icone={<IconeSenha />}
              comAlternarSenha
              autoComplete="current-password"
              required
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />

            {erro ? (
              <p className="tela-login__erro" role="alert">
                {erro}
              </p>
            ) : null}

            <Botao type="submit" variante="primario" disabled={carregando}>
              {carregando ? 'Entrando…' : 'Entrar no sistema'}
            </Botao>

            <p className="tela-login__ajuda">Problemas para acessar? Fale com o administrador.</p>
          </form>
        </div>
      </div>
    </div>
  )
}
