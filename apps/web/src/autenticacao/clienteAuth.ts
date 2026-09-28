import { requisitar } from '../api/clienteHttp'
import type { components } from '../api/tipos.gerados'
import type { SessaoUsuario } from '../tipos'

type LoginResponse = components['schemas']['LoginResponse']
type UsuarioResponse = components['schemas']['UsuarioResponse']

/**
 * `POST /auth/login` só retorna o token — nunca o papel do usuário (ver `auth/schemas.py`). Duas
 * chamadas em sequência, não uma: login para obter o token, `GET /auth/me` para resolver
 * papel/clínica com esse token recém-emitido (ver data-model.md).
 */
export async function login(email: string, senha: string): Promise<SessaoUsuario> {
  const resposta = await requisitar<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  })

  const usuario = await requisitar<UsuarioResponse>('/auth/me', {}, resposta.access_token)

  return {
    token: resposta.access_token,
    papel: usuario.papel,
    email: usuario.email,
    clinicaId: usuario.clinica_id ?? null,
  }
}
