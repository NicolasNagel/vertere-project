import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import marcaVertere from '../assets/vertere-mark.png'
import { useSessao } from '../autenticacao/useSessao'
import { itensParaPapel } from './itensDeNavegacao'
import './shell-autenticado.css'

export function ShellAutenticado() {
  const { papel, email, sair } = useSessao()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)

  const itens = papel ? itensParaPapel(papel) : []
  const iniciais = email ? email.slice(0, 2).toUpperCase() : '??'

  return (
    <div className="shell-autenticado">
      <header className="shell-autenticado__cabecalho-mobile">
        <button
          type="button"
          className="shell-autenticado__botao-menu"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((atual) => !atual)}
        >
          <span />
          <span />
          <span />
        </button>
        <span>Vertere Lab</span>
      </header>

      {menuAberto ? (
        <button
          type="button"
          className="shell-autenticado__backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      ) : null}

      <nav className={`sidebar ${menuAberto ? 'sidebar--aberta' : ''}`} aria-label="Navegação principal">
        <div className="sidebar__marca">
          <img className="sidebar__marca-icone" src={marcaVertere} alt="" aria-hidden="true" />
          <span className="sidebar__marca-nome">Vertere Lab</span>
        </div>

        <div className="sidebar__nav">
          <p className="sidebar__rotulo-secao">Navegação</p>
          {itens.map((item) => (
            <Link
              key={item.rota}
              to={item.rota}
              className={`sidebar-item ${location.pathname === item.rota ? 'sidebar-item--ativo' : ''}`}
              onClick={() => setMenuAberto(false)}
            >
              {item.rotulo}
            </Link>
          ))}
        </div>

        <div className="sidebar__rodape">
          <span className="sidebar__avatar" aria-hidden="true">
            {iniciais}
          </span>
          <div className="sidebar__rodape-info">
            <p className="sidebar__rodape-email">{email}</p>
            <p className="sidebar__rodape-papel">{papel}</p>
          </div>
          <button type="button" className="sidebar__sair" onClick={sair}>
            Sair
          </button>
        </div>
      </nav>

      <main className="shell-autenticado__conteudo">
        <Outlet />
      </main>
    </div>
  )
}
