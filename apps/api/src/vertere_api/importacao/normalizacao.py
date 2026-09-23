import re
import unicodedata

from vertere_api.importacao.domain import ValorCelula


def texto(valor: ValorCelula) -> str:
    if valor is None:
        return ""
    return " ".join(str(valor).strip().split())


def chave_texto(valor: ValorCelula) -> str:
    normalizado = unicodedata.normalize("NFKD", texto(valor))
    sem_acentos = "".join(
        caractere for caractere in normalizado if not unicodedata.combining(caractere)
    )
    return sem_acentos.casefold()


def somente_digitos(valor: ValorCelula) -> str:
    return re.sub(r"\D", "", texto(valor))
