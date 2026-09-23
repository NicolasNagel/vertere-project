from vertere_api.importacao.domain import (
    CodigoInconsistencia,
    DadosPlanilha,
    LinhaClinicaPlanilha,
    LinhaVeterinarioPlanilha,
    SeveridadeInconsistencia,
)
from vertere_api.importacao.service import planejar_importacao


def _clinica(
    *,
    linha: int = 3,
    nome: object = "Clínica São Francisco",
    cnpj: object = "12.345.678/0001-90",
    status: object = "Ativo",
) -> LinhaClinicaPlanilha:
    return LinhaClinicaPlanilha(
        linha=linha,
        nome=nome,
        cnpj=cnpj,
        endereco="Rua Central, 10",
        telefone="(47) 99999-0000",
        email="contato@clinica.test",
        status=status,
    )


def _veterinario(
    *,
    linha: int = 3,
    clinica: object = " clinica  sao   francisco ",
    crmv: object = "12345",
) -> LinhaVeterinarioPlanilha:
    return LinhaVeterinarioPlanilha(
        linha=linha,
        clinica=clinica,
        nome="Dra. Ana",
        crmv=crmv,
        telefone=None,
        email=None,
        status="ATIVO",
    )


def _dados(
    clinicas: tuple[LinhaClinicaPlanilha, ...],
    veterinarios: tuple[LinhaVeterinarioPlanilha, ...],
) -> DadosPlanilha:
    return DadosPlanilha(clinicas=clinicas, veterinarios=veterinarios, atendimentos=())


def test_normaliza_cadastros_e_resolve_clinica_do_veterinario() -> None:
    plano = planejar_importacao(_dados((_clinica(),), (_veterinario(),)))

    assert plano.aplicavel
    assert plano.contadores.clinicas == 1
    assert plano.contadores.veterinarios == 1
    assert plano.clinicas[0].cnpj == "12345678000190"
    assert plano.veterinarios[0].clinica_id == plano.clinicas[0].id
    assert plano.veterinarios[0].telefone == ""
    assert plano.veterinarios[0].email == ""


def test_ids_sao_deterministicos_para_o_mesmo_conteudo_normalizado() -> None:
    primeiro = planejar_importacao(_dados((_clinica(),), (_veterinario(),)))
    segundo = planejar_importacao(
        _dados(
            (_clinica(nome="  CLINICA SAO FRANCISCO  ", cnpj="12345678000190"),),
            (_veterinario(clinica="Clínica São Francisco"),),
        )
    )

    assert primeiro.clinicas[0].id == segundo.clinicas[0].id
    assert primeiro.veterinarios[0].id == segundo.veterinarios[0].id


def test_coleta_multiplos_erros_sem_marcar_plano_como_aplicavel() -> None:
    plano = planejar_importacao(
        _dados(
            (_clinica(nome=None, cnpj="123"),),
            (_veterinario(clinica="Inexistente", crmv=None),),
        )
    )

    assert not plano.aplicavel
    assert all(i.severidade is SeveridadeInconsistencia.ERRO for i in plano.inconsistencias)
    assert {i.codigo for i in plano.inconsistencias} >= {
        CodigoInconsistencia.CAMPO_OBRIGATORIO,
        CodigoInconsistencia.CNPJ_INVALIDO,
        CodigoInconsistencia.REFERENCIA_INEXISTENTE,
    }
    assert {(i.aba, i.linha) for i in plano.inconsistencias} >= {
        ("Cadastro Clínicas", 3),
        ("Cadastro Veterinários", 3),
    }


def test_colisao_de_nome_normalizado_bloqueia_referencia_ambigua() -> None:
    plano = planejar_importacao(
        _dados(
            (
                _clinica(linha=3, nome="Clínica A", cnpj="12345678000190"),
                _clinica(linha=4, nome=" clinica a ", cnpj="98765432000110"),
            ),
            (_veterinario(clinica="CLÍNICA A"),),
        )
    )

    codigos = [i.codigo for i in plano.inconsistencias]
    assert CodigoInconsistencia.CHAVE_DUPLICADA in codigos
    assert CodigoInconsistencia.REFERENCIA_AMBIGUA in codigos


def test_detecta_cnpj_repetido_quando_primeira_linha_tem_outro_erro() -> None:
    plano = planejar_importacao(
        _dados(
            (
                _clinica(linha=3, status="desconhecido"),
                _clinica(linha=4, nome="Clínica B"),
            ),
            (),
        )
    )

    erros = {(item.codigo, item.linha, item.coluna) for item in plano.inconsistencias}
    assert (CodigoInconsistencia.STATUS_INVALIDO, 3, "Status") in erros
    assert (CodigoInconsistencia.CHAVE_DUPLICADA, 4, "CNPJ") in erros


def test_detecta_crmv_repetido_quando_primeira_linha_tem_outro_erro() -> None:
    plano = planejar_importacao(
        _dados(
            (_clinica(),),
            (
                _veterinario(linha=3, clinica="Inexistente"),
                _veterinario(linha=4),
            ),
        )
    )

    erros = {(item.codigo, item.linha, item.coluna) for item in plano.inconsistencias}
    assert (CodigoInconsistencia.REFERENCIA_INEXISTENTE, 3, "Clínica") in erros
    assert (CodigoInconsistencia.CHAVE_DUPLICADA, 4, "CRMV") in erros


def test_detecta_crmv_repetido_com_variacao_de_caixa() -> None:
    plano = planejar_importacao(
        _dados(
            (_clinica(),),
            (
                _veterinario(linha=3, crmv="ABC123"),
                _veterinario(linha=4, crmv="abc123"),
            ),
        )
    )

    assert any(
        item.codigo is CodigoInconsistencia.CHAVE_DUPLICADA
        and item.linha == 4
        and item.coluna == "CRMV"
        for item in plano.inconsistencias
    )
