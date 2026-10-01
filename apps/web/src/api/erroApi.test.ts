import { describe, expect, it } from 'vitest'
import { ErroHttp } from './clienteHttp'
import { extrairDetalheErro, mensagemDeErroPadrao } from './erroApi'

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

function erro422(itens: unknown[]): ErroHttp {
  return new ErroHttp(422, JSON.stringify({ detail: itens }))
}

describe('mensagemDeErroPadrao', () => {
  const SERVIDOR = 'Problema no servidor. Tente novamente em instantes.'

  it('erro 500 vira mensagem genérica de servidor', () => {
    expect(mensagemDeErroPadrao(new ErroHttp(500, 'Internal Server Error'))).toBe(SERVIDOR)
  })

  it('corpo que não é JSON vira mensagem genérica de servidor, mesmo com status 4xx', () => {
    expect(mensagemDeErroPadrao(new ErroHttp(400, '<html>Bad Request</html>'))).toBe(SERVIDOR)
  })

  it('detail string é mensagem de negócio e passa como está', () => {
    const erro = new ErroHttp(404, '{"detail":"Exame x não encontrado"}')
    expect(mensagemDeErroPadrao(erro)).toBe('Exame x não encontrado')
  })

  it('422 do Pydantic cita o campo pelo rótulo da tela', () => {
    const erro = erro422([{ loc: ['body', 'email'], type: 'value_error', msg: 'not an email' }])
    expect(mensagemDeErroPadrao(erro, { email: 'E-mail' })).toBe(
      'Verifique o campo E-mail: valor inválido.',
    )
  })

  it.each([
    [{ type: 'missing' }, 'preenchimento obrigatório'],
    [{ type: 'greater_than', ctx: { gt: 0 } }, 'deve ser maior que 0'],
    [{ type: 'string_too_short' }, 'não pode ficar vazio'],
    [{ type: 'decimal_parsing' }, 'precisa ser um número'],
    [{ type: 'float_parsing' }, 'precisa ser um número'],
    [{ type: 'int_parsing' }, 'precisa ser um número'],
    [{ type: 'time_parsing' }, 'horário inválido'],
    [{ type: 'algo_desconhecido' }, 'valor inválido'],
  ])('422 do tipo %o vira o motivo "%s"', (item, motivo) => {
    const erro = erro422([{ loc: ['body', 'preco_base'], msg: 'x', ...item }])
    expect(mensagemDeErroPadrao(erro, { preco_base: 'Preço-base' })).toBe(
      `Verifique o campo Preço-base: ${motivo}.`,
    )
  })

  it('campo sem rótulo conhecido vira "informado"', () => {
    const erro = erro422([{ loc: ['body', 'campo_interno'], type: 'missing', msg: 'x' }])
    expect(mensagemDeErroPadrao(erro)).toBe(
      'Verifique o campo informado: preenchimento obrigatório.',
    )
  })

  it('vários erros de validação viram várias frases unidas por espaço', () => {
    const erro = erro422([
      { loc: ['body', 'nome'], type: 'missing', msg: 'x' },
      { loc: ['body', 'email'], type: 'value_error', msg: 'x' },
    ])
    expect(mensagemDeErroPadrao(erro, { nome: 'Nome', email: 'E-mail' })).toBe(
      'Verifique o campo Nome: preenchimento obrigatório. Verifique o campo E-mail: valor inválido.',
    )
  })

  it('JSON sem detail utilizável vira mensagem genérica de operação', () => {
    expect(mensagemDeErroPadrao(new ErroHttp(400, '{"outraCoisa":"x"}'))).toBe(
      'Não foi possível concluir a operação. Tente novamente.',
    )
  })
})
