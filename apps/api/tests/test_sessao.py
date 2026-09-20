from datetime import UTC, datetime, timedelta

from vertere_api.auth.sessao import sessao_expirada


class TestSessaoExpirada:
    def test_sessao_dentro_do_limite_nao_esta_expirada(self) -> None:
        ultima_atividade = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
        agora = ultima_atividade + timedelta(minutes=10)

        assert sessao_expirada(ultima_atividade, agora, limite=timedelta(minutes=30)) is False

    def test_sessao_exatamente_no_limite_nao_esta_expirada(self) -> None:
        ultima_atividade = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
        agora = ultima_atividade + timedelta(minutes=30)

        assert sessao_expirada(ultima_atividade, agora, limite=timedelta(minutes=30)) is False

    def test_sessao_alem_do_limite_esta_expirada(self) -> None:
        ultima_atividade = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
        agora = ultima_atividade + timedelta(minutes=31)

        assert sessao_expirada(ultima_atividade, agora, limite=timedelta(minutes=30)) is True

    def test_usa_limite_padrao_quando_nao_especificado(self) -> None:
        ultima_atividade = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
        muito_depois = ultima_atividade + timedelta(hours=5)

        assert sessao_expirada(ultima_atividade, muito_depois) is True
