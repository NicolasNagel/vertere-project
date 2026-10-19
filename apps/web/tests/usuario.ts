import userEvent from '@testing-library/user-event'

/**
 * `userEvent` sem espera entre teclas. O padrão (`delay: 0`) agenda um `setTimeout` por tecla, e com
 * a máquina carregada isso somado a um render por tecla fazia testes de formulário estourarem o
 * timeout de 5 s (specs/014-polimento-telas-web/research.md, Decisão 7). Os eventos simulados são
 * os mesmos, na mesma ordem; só some a pausa entre eles.
 */
export function usuario() {
  return userEvent.setup({ delay: null })
}
