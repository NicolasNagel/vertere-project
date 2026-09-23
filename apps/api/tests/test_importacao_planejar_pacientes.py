from datetime import date, time

from vertere_api.importacao.domain import (
    CodigoInconsistencia,
    DadosPlanilha,
    LinhaAtendimentoPlanilha,
    LinhaClinicaPlanilha,
    SeveridadeInconsistencia,
)
from vertere_api.importacao.service import planejar_importacao


def _clinica() -> LinhaClinicaPlanilha:
    return LinhaClinicaPlanilha(
        linha=3,
        nome="Clínica São Francisco",
        cnpj="12.345.678/0001-90",
        endereco="Rua Central",
        telefone="",
        email="",
        status="Ativo",
    )


def _atendimento(
    *,
    linha: int,
    data: date,
    paciente: object = "Tobias",
    proprietario: object = "José da Silva",
    especie: object = "Canino",
    raca: object = "SRD",
    sexo: object = "Macho",
    idade: object = 4,
) -> LinhaAtendimentoPlanilha:
    return LinhaAtendimentoPlanilha(
        linha=linha,
        clinica="clinica sao francisco",
        data=data,
        hora=time(10, 30),
        numero=str(linha),
        protocolo=f"PROTO-{linha}",
        metodo_coleta="Motoboy",
        veterinario="Dra. Ana",
        paciente=paciente,
        especie=especie,
        raca=raca,
        sexo=sexo,
        idade=idade,
        proprietario=proprietario,
        categoria_exame="Hematológicos",
        exame="Hemograma",
        tipo_atendimento="Normal",
        valor="50,00",
        desconto=None,
        adicional=None,
        valor_total="50,00",
    )


def test_deduplica_paciente_e_usa_dados_da_ocorrencia_mais_recente() -> None:
    dados = DadosPlanilha(
        clinicas=(_clinica(),),
        veterinarios=(),
        atendimentos=(
            _atendimento(linha=5, data=date(2026, 1, 10), idade=3, raca="Sem raça definida"),
            _atendimento(
                linha=6,
                data=date(2026, 7, 10),
                paciente="  TOBÍAS ",
                proprietario="JOSE   DA SILVA",
                idade=4,
                raca="SRD",
            ),
        ),
    )

    plano = planejar_importacao(dados)

    assert len(plano.pacientes) == 1
    assert plano.pacientes[0].nome == "TOBÍAS"
    assert plano.pacientes[0].proprietario == "JOSE DA SILVA"
    assert plano.pacientes[0].idade == 4
    assert plano.pacientes[0].raca == "SRD"
    assert plano.contadores.pacientes == 1
    assert any(
        item.codigo is CodigoInconsistencia.DADO_HISTORICO_DIVERGENTE
        and item.severidade is SeveridadeInconsistencia.AVISO
        for item in plano.inconsistencias
    )


def test_paciente_com_campo_obrigatorio_ausente_bloqueia_plano() -> None:
    dados = DadosPlanilha(
        clinicas=(_clinica(),),
        veterinarios=(),
        atendimentos=(
            _atendimento(
                linha=5,
                data=date(2026, 1, 10),
                proprietario=None,
                especie=None,
                idade=-1,
            ),
        ),
    )

    plano = planejar_importacao(dados)

    assert not plano.aplicavel
    erros_paciente = [
        item
        for item in plano.inconsistencias
        if item.aba == "Dados" and item.linha == 5
    ]
    assert {item.coluna for item in erros_paciente} >= {"Espécie", "Idade", "Proprietário"}
    assert all(item.severidade is SeveridadeInconsistencia.ERRO for item in erros_paciente)
