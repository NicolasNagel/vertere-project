import { describe, expect, it } from 'vitest'
import { ErroHttp } from './clienteHttp'
import { extrairDetalheErro } from './erroApi'

describe('extrairDetalheErro', () => {
  it('extrai o campo detail do corpo JSON de erro do FastAPI', () => {
    const erro = new ErroHttp(422, '{"detail":"CNPJ inválido"}')
    expect(extrairDetalheErro(erro)).toBe('CNPJ inválido')
  })

  it('cai para a mensagem original quando o corpo não é JSON válido', () => {
    const erro = new ErroHttp(500, 'Internal Server Error')
    expect(extrairDetalheErro(erro)).toBe('Internal Server Error')
  })

  it('cai para a mensagem original quando o JSON não tem campo detail', () => {
    const erro = new ErroHttp(400, '{"outraCoisa":"x"}')
    expect(extrairDetalheErro(erro)).toBe('{"outraCoisa":"x"}')
  })
})
