import pytest

from vertere_api.auth.tokens import TokenInvalido, codificar_token, decodificar_token


class TestTokens:
    def test_token_valido_decodifica_para_o_mesmo_sid(self) -> None:
        token = codificar_token("sid-123")

        assert decodificar_token(token) == "sid-123"

    def test_token_adulterado_e_rejeitado(self) -> None:
        token = codificar_token("sid-123")
        adulterado = token[:-1] + ("a" if token[-1] != "a" else "b")

        with pytest.raises(TokenInvalido):
            decodificar_token(adulterado)

    def test_token_com_lixo_e_rejeitado(self) -> None:
        with pytest.raises(TokenInvalido):
            decodificar_token("isto-nao-e-um-jwt")
