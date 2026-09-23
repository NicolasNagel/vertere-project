from datetime import date, time
from decimal import Decimal

from vertere_api.importacao.domain import (
    CodigoInconsistencia,
    DadosPlanilha,
    LinhaAtendimentoPlanilha,
    LinhaClinicaPlanilha,
    LinhaVeterinarioPlanilha,
    SeveridadeInconsistencia,
)
from vertere_api.importacao.service import planejar_importacao


def _clinica() -> LinhaClinicaPlanilha:
    return LinhaClinicaPlanilha(
        linha=3, nome="Clínica A", cnpj="12345678000190", endereco="Rua A",
        telefone="", email="", status="Ativo",
    )


def _veterinario() -> LinhaVeterinarioPlanilha:
    return LinhaVeterinarioPlanilha(
        linha=3, clinica="Clínica A", nome="Dra. Ana", crmv="12345",
        telefone="", email="", status="Ativo",
    )


def _atendimento(
    *,
    linha: int,
    data: date,
    valor: object,
    adicional: object = None,
    desconto: object = None,
    total: object | None = None,
) -> LinhaAtendimentoPlanilha:
    return LinhaAtendimentoPlanilha(
        linha=linha,
        clinica="clinica a",
        data=data,
        hora=time(10, 0),
        numero=linha - 4,
        protocolo=f"PROTO-{linha - 4}",
        metodo_coleta="Motoboy",
        veterinario="dra. ana",
        paciente="Tobias",
        especie="Canino",
        raca="SRD",
        sexo="Macho",
        idade=4,
        proprietario="José",
        categoria_exame="Hematológicos",
        exame="Hemograma",
        tipo_atendimento="Normal",
        valor=valor,
        desconto=desconto,
        adicional=adicional,
        valor_total=total if total is not None else valor,
    )


def _dados(*atendimentos: LinhaAtendimentoPlanilha) -> DadosPlanilha:
    return DadosPlanilha(
        clinicas=(_clinica(),),
        veterinarios=(_veterinario(),),
        atendimentos=atendimentos,
    )


def test_preserva_financeiro_proveniencia_e_preco_historico() -> None:
    plano = planejar_importacao(
        _dados(
            _atendimento(linha=5, data=date(2026, 1, 10), valor="50,00"),
            _atendimento(
                linha=6,
                data=date(2026, 7, 10),
                valor="55,00",
                adicional="10,00",
                desconto="5,00",
                total="60,00",
            ),
        )
    )

    assert plano.aplicavel
    assert len(plano.exames) == 1
    assert plano.exames[0].preco_base == Decimal("55.00")
    assert [item.preco_unitario for item in plano.atendimentos] == [
        Decimal("50.00"),
        Decimal("55.00"),
    ]
    assert plano.atendimentos[1].valor_adicional_plantao == Decimal("10.00")
    assert plano.atendimentos[1].desconto == Decimal("5.00")
    assert plano.atendimentos[1].valor_total == Decimal("60.00")
    assert plano.atendimentos[1].numero_origem == "2"
    assert plano.atendimentos[1].protocolo_origem == "PROTO-2"
    assert any(
        item.codigo is CodigoInconsistencia.DADO_HISTORICO_DIVERGENTE
        and item.severidade is SeveridadeInconsistencia.AVISO
        for item in plano.inconsistencias
    )


def test_total_divergente_e_protocolo_duplicado_bloqueiam_plano() -> None:
    primeira = _atendimento(
        linha=5,
        data=date(2026, 1, 10),
        valor="50,00",
        adicional="10,00",
        desconto="5,00",
        total="99,00",
    )
    segunda = _atendimento(linha=6, data=date(2026, 1, 11), valor="50,00")
    segunda = LinhaAtendimentoPlanilha(**{**segunda.__dict__, "protocolo": "PROTO-1"})

    plano = planejar_importacao(_dados(primeira, segunda))

    assert not plano.aplicavel
    codigos = {item.codigo for item in plano.inconsistencias}
    assert CodigoInconsistencia.TOTAL_DIVERGENTE in codigos
    assert CodigoInconsistencia.CHAVE_DUPLICADA in codigos
