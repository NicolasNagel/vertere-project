from datetime import UTC, datetime
from decimal import Decimal

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.laudos.domain import CampoTemplate, Laudo, StatusLaudo, TemplateLaudo, ValorCampo
from vertere_api.laudos.service import montar_dados_laudo


def _atendimento() -> Atendimento:
    return Atendimento(
        id="atendimento-1",
        clinica_id="clinica-1",
        veterinario_id="vet-1",
        paciente_id="paciente-1",
        itens_exame=[ItemExame(exame_id="exame-1", preco_unitario=Decimal("45.00"), quantidade=1)],
        metodo_coleta="Venosa",
        data_hora=datetime(2026, 9, 20, 10, 0, tzinfo=UTC),
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal("45.00"),
        status=StatusAtendimento.ATIVO,
    )


def _template() -> TemplateLaudo:
    return TemplateLaudo(
        id="tpl-1",
        categoria="Hematologia",
        campos=[
            CampoTemplate(nome="Hemácias", unidade="milhões/µL", faixa_referencia="5.5 – 8.5"),
            CampoTemplate(nome="Leucócitos", unidade=None, faixa_referencia=None),
        ],
        ativo=True,
    )


def _laudo(valores: list[ValorCampo] | None = None) -> Laudo:
    return Laudo(
        id="laudo-1",
        atendimento_id="atendimento-1",
        exame_id="exame-1",
        template_id="tpl-1",
        valores=valores or [],
        status=StatusLaudo.RASCUNHO,
        criado_por="usuario-1",
        criado_em=datetime(2026, 9, 20, 11, 0, tzinfo=UTC),
    )


class TestMontarDadosLaudo:
    def test_monta_identificacao_e_campos_preenchidos(self) -> None:
        laudo = _laudo([ValorCampo(nome_campo="Hemácias", valor="7.2"), ValorCampo(nome_campo="Leucócitos", valor="9000")])

        dados = montar_dados_laudo(
            laudo=laudo,
            template=_template(),
            atendimento=_atendimento(),
            exame_nome="Hemograma completo",
            exame_categoria="Hematologia",
            paciente_nome="Rex",
            veterinario_nome="Dr. João",
            veterinario_crmv="SC-1234",
            clinica_nome="Clínica Central",
        )

        assert dados.laudo_id == "laudo-1"
        assert dados.paciente_nome == "Rex"
        assert dados.clinica_nome == "Clínica Central"
        assert dados.veterinario_nome == "Dr. João"
        assert dados.veterinario_crmv == "SC-1234"
        assert dados.exame_nome == "Hemograma completo"
        assert dados.exame_categoria == "Hematologia"
        assert dados.data_atendimento == _atendimento().data_hora
        assert len(dados.campos) == 2
        assert dados.campos[0].nome == "Hemácias"
        assert dados.campos[0].valor == "7.2"
        assert dados.campos[0].unidade == "milhões/µL"
        assert dados.campos[0].faixa_referencia == "5.5 – 8.5"
        assert dados.campos[1].nome == "Leucócitos"
        assert dados.campos[1].valor == "9000"
        assert dados.campos[1].unidade is None
        assert dados.campos[1].faixa_referencia is None

    def test_valores_vazio_produz_campos_com_valor_vazio(self) -> None:
        dados = montar_dados_laudo(
            laudo=_laudo(),
            template=_template(),
            atendimento=_atendimento(),
            exame_nome="Hemograma completo",
            exame_categoria="Hematologia",
            paciente_nome="Rex",
            veterinario_nome="Dr. João",
            veterinario_crmv="SC-1234",
            clinica_nome="Clínica Central",
        )

        assert len(dados.campos) == 2
        assert all(campo.valor == "" for campo in dados.campos)
