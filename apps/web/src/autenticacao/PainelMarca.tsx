import logoVertere from '../assets/vertere-logo-white.png'
import './painel-marca.css'

export function PainelMarca() {
  return (
    <div className="painel-marca">
      <span className="painel-marca__circulo painel-marca__circulo--topo" aria-hidden="true" />
      <span className="painel-marca__circulo painel-marca__circulo--base" aria-hidden="true" />
      <div className="painel-marca__conteudo">
        <img
          className="painel-marca__logo"
          src={logoVertere}
          alt="Vertere — Laboratório Veterinário"
        />
        <p className="painel-marca__slogan">
          Cada amostra,
          <br />
          <em>uma história.</em>
          <br />
          Cada resultado,
          <br />
          <em>um cuidado.</em>
        </p>
      </div>
      <p className="painel-marca__rodape">JARAGUÁ DO SUL — SC</p>
    </div>
  )
}
