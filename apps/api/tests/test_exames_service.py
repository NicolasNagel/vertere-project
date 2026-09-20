from datetime import datetime, time
from decimal import Decimal

from vertere_api.exames.domain import RegraPlantao
from vertere_api.exames.service import calcular_adicional_plantao


def _regra(
    id_: str = "regra-1",
    dia_semana: int = 4,
    hora_inicio: time = time(18, 0),
    hora_fim: time = time(6, 0),
    valor_adicional: Decimal = Decimal("50.00"),
    ativo: bool = True,
) -> RegraPlantao:
    return RegraPlantao(
        id=id_,
        dia_semana=dia_semana,
        hora_inicio=hora_inicio,
        hora_fim=hora_fim,
        valor_adicional=valor_adicional,
        ativo=ativo,
    )


class TestCalcularAdicionalPlantao:
    def test_janela_simples_dentro_do_dia(self) -> None:
        regra = _regra(dia_semana=2, hora_inicio=time(12, 0), hora_fim=time(14, 0))
        # 2026-09-23 é uma quarta-feira (weekday() == 2)
        data_hora = datetime(2026, 9, 23, 13, 0)

        resultado = calcular_adicional_plantao(data_hora, [regra])

        assert resultado == regra

    def test_fora_da_janela_simples(self) -> None:
        regra = _regra(dia_semana=2, hora_inicio=time(12, 0), hora_fim=time(14, 0))
        data_hora = datetime(2026, 9, 23, 15, 0)

        resultado = calcular_adicional_plantao(data_hora, [regra])

        assert resultado is None

    def test_janela_cruzando_meia_noite_antes_da_meia_noite(self) -> None:
        # regra: sexta (4) 18:00 até sábado 06:00
        regra = _regra(dia_semana=4, hora_inicio=time(18, 0), hora_fim=time(6, 0))
        # 2026-09-25 é sexta-feira (weekday() == 4), 22:00
        data_hora = datetime(2026, 9, 25, 22, 0)

        resultado = calcular_adicional_plantao(data_hora, [regra])

        assert resultado == regra

    def test_janela_cruzando_meia_noite_depois_da_meia_noite(self) -> None:
        regra = _regra(dia_semana=4, hora_inicio=time(18, 0), hora_fim=time(6, 0))
        # 2026-09-26 é sábado (dia seguinte à sexta), 03:00
        data_hora = datetime(2026, 9, 26, 3, 0)

        resultado = calcular_adicional_plantao(data_hora, [regra])

        assert resultado == regra

    def test_fora_da_janela_cruzando_meia_noite(self) -> None:
        regra = _regra(dia_semana=4, hora_inicio=time(18, 0), hora_fim=time(6, 0))
        # sábado 10:00 — depois da janela do plantão de sexta à noite
        data_hora = datetime(2026, 9, 26, 10, 0)

        resultado = calcular_adicional_plantao(data_hora, [regra])

        assert resultado is None

    def test_dia_totalmente_diferente_da_janela_cruzando_meia_noite(self) -> None:
        # regra: sexta (4) 18:00 até sábado 06:00; domingo não pertence a nenhum dos dois dias
        regra = _regra(dia_semana=4, hora_inicio=time(18, 0), hora_fim=time(6, 0))
        # 2026-09-27 é domingo, 10:00
        data_hora = datetime(2026, 9, 27, 10, 0)

        resultado = calcular_adicional_plantao(data_hora, [regra])

        assert resultado is None

    def test_regra_inativa_e_ignorada(self) -> None:
        regra = _regra(dia_semana=2, hora_inicio=time(12, 0), hora_fim=time(14, 0), ativo=False)
        data_hora = datetime(2026, 9, 23, 13, 0)

        resultado = calcular_adicional_plantao(data_hora, [regra])

        assert resultado is None

    def test_nenhuma_regra_cadastrada_retorna_none(self) -> None:
        resultado = calcular_adicional_plantao(datetime(2026, 9, 23, 13, 0), [])

        assert resultado is None

    def test_regras_sobrepostas_retorna_maior_valor_adicional(self) -> None:
        regra_menor = _regra(
            id_="regra-menor",
            dia_semana=2,
            hora_inicio=time(12, 0),
            hora_fim=time(14, 0),
            valor_adicional=Decimal("30.00"),
        )
        regra_maior = _regra(
            id_="regra-maior",
            dia_semana=2,
            hora_inicio=time(13, 0),
            hora_fim=time(15, 0),
            valor_adicional=Decimal("80.00"),
        )
        data_hora = datetime(2026, 9, 23, 13, 30)

        resultado = calcular_adicional_plantao(data_hora, [regra_menor, regra_maior])

        assert resultado == regra_maior
