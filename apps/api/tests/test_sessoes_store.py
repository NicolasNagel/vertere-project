from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from vertere_api.auth import sessoes_store


class TestSessoesStore:
    def setup_method(self) -> None:
        sessoes_store.limpar_sessoes()

    def test_sessao_recem_criada_e_valida(self) -> None:
        sid = sessoes_store.criar_sessao("usuario-1")

        assert sessoes_store.tocar_sessao(sid) == "usuario-1"

    def test_sessao_inexistente_retorna_none(self) -> None:
        assert sessoes_store.tocar_sessao("sid-que-nao-existe") is None

    def test_sessao_expirada_por_inatividade_retorna_none_e_e_removida(self) -> None:
        sid = sessoes_store.criar_sessao("usuario-1")

        muito_depois = datetime.now(UTC) + timedelta(hours=2)
        with patch("vertere_api.auth.sessoes_store.datetime") as mock_datetime:
            mock_datetime.now.return_value = muito_depois
            assert sessoes_store.tocar_sessao(sid) is None

        assert sessoes_store.tocar_sessao(sid) is None

    def test_tocar_sessao_renova_ultima_atividade(self) -> None:
        sid = sessoes_store.criar_sessao("usuario-1")

        pouco_depois = datetime.now(UTC) + timedelta(minutes=29)
        with patch("vertere_api.auth.sessoes_store.datetime") as mock_datetime:
            mock_datetime.now.return_value = pouco_depois
            assert sessoes_store.tocar_sessao(sid) == "usuario-1"

        muito_depois_do_toque = pouco_depois + timedelta(minutes=29)
        with patch("vertere_api.auth.sessoes_store.datetime") as mock_datetime:
            mock_datetime.now.return_value = muito_depois_do_toque
            assert sessoes_store.tocar_sessao(sid) == "usuario-1"

    def test_encerrar_sessao_invalida_o_sid(self) -> None:
        sid = sessoes_store.criar_sessao("usuario-1")

        sessoes_store.encerrar_sessao(sid)

        assert sessoes_store.tocar_sessao(sid) is None
