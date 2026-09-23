import re
import unicodedata
from collections import defaultdict
from uuid import uuid5

from vertere_api.importacao.domain import (
    CodigoInconsistencia,
    ClinicaPlanejada,
    ContadoresImportacao,
    DadosPlanilha,
    InconsistenciaImportacao,
    NAMESPACE_CLINICAS,
    NAMESPACE_VETERINARIOS,
    PlanoImportacao,
    SeveridadeInconsistencia,
    ValorCelula,
    VeterinarioPlanejado,
)


def _texto(valor: ValorCelula) -> str:
    if valor is None:
        return ""
    return " ".join(str(valor).strip().split())


def _chave_texto(valor: ValorCelula) -> str:
    texto = unicodedata.normalize("NFKD", _texto(valor))
    sem_acentos = "".join(caractere for caractere in texto if not unicodedata.combining(caractere))
    return sem_acentos.casefold()


def _somente_digitos(valor: ValorCelula) -> str:
    return re.sub(r"\D", "", _texto(valor))


def _interpretar_status(valor: ValorCelula) -> bool | None:
    normalizado = _chave_texto(valor)
    if normalizado == "ativo":
        return True
    if normalizado == "inativo":
        return False
    return None


def _erro(
    codigo: CodigoInconsistencia,
    aba: str,
    linha: int,
    coluna: str,
    mensagem: str,
) -> InconsistenciaImportacao:
    return InconsistenciaImportacao(
        severidade=SeveridadeInconsistencia.ERRO,
        codigo=codigo,
        aba=aba,
        linha=linha,
        coluna=coluna,
        mensagem=mensagem,
    )


def planejar_importacao(dados_planilha: DadosPlanilha) -> PlanoImportacao:
    """Normaliza e valida toda a fonte antes que qualquer adapter persista dados."""
    inconsistencias: list[InconsistenciaImportacao] = []
    clinicas: list[ClinicaPlanejada] = []
    clinicas_por_nome: dict[str, list[ClinicaPlanejada]] = defaultdict(list)
    cnpjs_vistos: set[str] = set()

    for linha in dados_planilha.clinicas:
        nome = _texto(linha.nome)
        chave_nome = _chave_texto(linha.nome)
        cnpj = _somente_digitos(linha.cnpj)
        valido = True

        if not nome:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.CAMPO_OBRIGATORIO,
                    "Cadastro Clínicas",
                    linha.linha,
                    "Clínica",
                    "Nome da clínica é obrigatório",
                )
            )
            valido = False
        if len(cnpj) != 14:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.CNPJ_INVALIDO,
                    "Cadastro Clínicas",
                    linha.linha,
                    "CNPJ",
                    "CNPJ deve conter 14 dígitos",
                )
            )
            valido = False
        elif cnpj in cnpjs_vistos:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.CHAVE_DUPLICADA,
                    "Cadastro Clínicas",
                    linha.linha,
                    "CNPJ",
                    "CNPJ duplicado na fonte",
                )
            )
            valido = False

        ativo = _interpretar_status(linha.status)
        if ativo is None:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.STATUS_INVALIDO,
                    "Cadastro Clínicas",
                    linha.linha,
                    "Status",
                    "Status deve ser Ativo ou Inativo",
                )
            )
            valido = False

        if chave_nome and chave_nome in clinicas_por_nome:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.CHAVE_DUPLICADA,
                    "Cadastro Clínicas",
                    linha.linha,
                    "Clínica",
                    "Nome de clínica colide após normalização",
                )
            )

        if not valido:
            continue

        clinica = ClinicaPlanejada(
            id=str(uuid5(NAMESPACE_CLINICAS, cnpj)),
            nome=nome,
            cnpj=cnpj,
            endereco=_texto(linha.endereco),
            telefone=_texto(linha.telefone),
            email=_texto(linha.email),
            ativo=ativo,
        )
        clinicas.append(clinica)
        clinicas_por_nome[chave_nome].append(clinica)
        cnpjs_vistos.add(cnpj)

    veterinarios: list[VeterinarioPlanejado] = []
    crmvs_vistos: set[str] = set()
    for linha in dados_planilha.veterinarios:
        nome = _texto(linha.nome)
        crmv = _texto(linha.crmv)
        chave_clinica = _chave_texto(linha.clinica)
        candidatas = clinicas_por_nome.get(chave_clinica, [])
        valido = True

        if not nome:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.CAMPO_OBRIGATORIO,
                    "Cadastro Veterinários",
                    linha.linha,
                    "Nome",
                    "Nome do veterinário é obrigatório",
                )
            )
            valido = False
        if not crmv:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.CAMPO_OBRIGATORIO,
                    "Cadastro Veterinários",
                    linha.linha,
                    "CRMV",
                    "CRMV é obrigatório",
                )
            )
            valido = False
        elif crmv in crmvs_vistos:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.CHAVE_DUPLICADA,
                    "Cadastro Veterinários",
                    linha.linha,
                    "CRMV",
                    "CRMV duplicado na fonte",
                )
            )
            valido = False

        if not candidatas:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.REFERENCIA_INEXISTENTE,
                    "Cadastro Veterinários",
                    linha.linha,
                    "Clínica",
                    "Clínica do veterinário não encontrada",
                )
            )
            valido = False
        elif len(candidatas) > 1:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.REFERENCIA_AMBIGUA,
                    "Cadastro Veterinários",
                    linha.linha,
                    "Clínica",
                    "Clínica do veterinário é ambígua após normalização",
                )
            )
            valido = False

        ativo = _interpretar_status(linha.status)
        if ativo is None:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.STATUS_INVALIDO,
                    "Cadastro Veterinários",
                    linha.linha,
                    "Status",
                    "Status deve ser Ativo ou Inativo",
                )
            )
            valido = False

        if not valido:
            continue

        veterinario = VeterinarioPlanejado(
            id=str(uuid5(NAMESPACE_VETERINARIOS, crmv.casefold())),
            nome=nome,
            crmv=crmv,
            telefone=_texto(linha.telefone),
            email=_texto(linha.email),
            clinica_id=candidatas[0].id,
            ativo=ativo,
        )
        veterinarios.append(veterinario)
        crmvs_vistos.add(crmv)

    contadores = ContadoresImportacao(
        clinicas=len(clinicas),
        veterinarios=len(veterinarios),
    )
    return PlanoImportacao(
        clinicas=tuple(clinicas),
        veterinarios=tuple(veterinarios),
        inconsistencias=tuple(inconsistencias),
        contadores=contadores,
    )
