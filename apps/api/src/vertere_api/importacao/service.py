import re
import unicodedata
from collections import defaultdict
from datetime import date, datetime, time
from uuid import uuid5

from vertere_api.importacao.domain import (
    CodigoInconsistencia,
    ClinicaPlanejada,
    ContadoresImportacao,
    DadosPlanilha,
    InconsistenciaImportacao,
    NAMESPACE_CLINICAS,
    NAMESPACE_PACIENTES,
    NAMESPACE_VETERINARIOS,
    PacientePlanejado,
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


def _aviso(
    codigo: CodigoInconsistencia,
    aba: str,
    linha: int,
    coluna: str,
    mensagem: str,
) -> InconsistenciaImportacao:
    return InconsistenciaImportacao(
        severidade=SeveridadeInconsistencia.AVISO,
        codigo=codigo,
        aba=aba,
        linha=linha,
        coluna=coluna,
        mensagem=mensagem,
    )


def _data_hora(data_valor: ValorCelula, hora_valor: ValorCelula) -> datetime | None:
    if isinstance(data_valor, datetime):
        data_convertida = data_valor.date()
    elif isinstance(data_valor, date):
        data_convertida = data_valor
    elif isinstance(data_valor, str):
        data_convertida = None
        for formato in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                data_convertida = datetime.strptime(data_valor.strip(), formato).date()
                break
            except ValueError:
                continue
    else:
        data_convertida = None

    if isinstance(hora_valor, datetime):
        hora_convertida = hora_valor.time()
    elif isinstance(hora_valor, time):
        hora_convertida = hora_valor
    elif isinstance(hora_valor, str):
        hora_convertida = None
        for formato in ("%H:%M:%S", "%H:%M"):
            try:
                hora_convertida = datetime.strptime(hora_valor.strip(), formato).time()
                break
            except ValueError:
                continue
    else:
        hora_convertida = None

    if data_convertida is None or hora_convertida is None:
        return None
    return datetime.combine(data_convertida, hora_convertida)


def _idade(valor: ValorCelula) -> int | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, int):
        return valor if valor >= 0 else None
    if isinstance(valor, float) and valor.is_integer():
        inteiro = int(valor)
        return inteiro if inteiro >= 0 else None
    texto = _texto(valor)
    if texto.isdigit():
        return int(texto)
    return None


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

    pacientes_por_chave: dict[
        tuple[str, str, str], list[tuple[datetime, object]]
    ] = defaultdict(list)
    for linha in dados_planilha.atendimentos:
        chave_clinica = _chave_texto(linha.clinica)
        candidatas = clinicas_por_nome.get(chave_clinica, [])
        nome = _texto(linha.paciente)
        proprietario = _texto(linha.proprietario)
        campos_texto = {
            "Paciente": nome,
            "Espécie": _texto(linha.especie),
            "Raça": _texto(linha.raca),
            "Sexo": _texto(linha.sexo),
            "Proprietário": proprietario,
        }
        valido = True
        for coluna, valor in campos_texto.items():
            if not valor:
                inconsistencias.append(
                    _erro(
                        CodigoInconsistencia.CAMPO_OBRIGATORIO,
                        "Dados",
                        linha.linha,
                        coluna,
                        f"{coluna} é obrigatório para formar o cadastro do paciente",
                    )
                )
                valido = False

        idade = _idade(linha.idade)
        if idade is None:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.VALOR_INVALIDO,
                    "Dados",
                    linha.linha,
                    "Idade",
                    "Idade deve ser um inteiro não negativo",
                )
            )
            valido = False

        instante = _data_hora(linha.data, linha.hora)
        if instante is None:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.VALOR_INVALIDO,
                    "Dados",
                    linha.linha,
                    "Data/Hora",
                    "Data e hora devem formar um instante válido",
                )
            )
            valido = False

        if len(candidatas) != 1:
            codigo = (
                CodigoInconsistencia.REFERENCIA_AMBIGUA
                if len(candidatas) > 1
                else CodigoInconsistencia.REFERENCIA_INEXISTENTE
            )
            inconsistencias.append(
                _erro(
                    codigo,
                    "Dados",
                    linha.linha,
                    "Clínica",
                    "Clínica do paciente não pôde ser resolvida unicamente",
                )
            )
            valido = False

        if not valido:
            continue

        chave = (candidatas[0].id, _chave_texto(nome), _chave_texto(proprietario))
        pacientes_por_chave[chave].append((instante, linha))

    pacientes: list[PacientePlanejado] = []
    for chave, ocorrencias in pacientes_por_chave.items():
        ocorrencias.sort(key=lambda item: (item[0], item[1].linha))
        _, linha_canonica = ocorrencias[-1]
        atributos = {
            (
                _chave_texto(item.especie),
                _chave_texto(item.raca),
                _chave_texto(item.sexo),
                _idade(item.idade),
            )
            for _, item in ocorrencias
        }
        if len(atributos) > 1:
            inconsistencias.append(
                _aviso(
                    CodigoInconsistencia.DADO_HISTORICO_DIVERGENTE,
                    "Dados",
                    linha_canonica.linha,
                    "Paciente",
                    "Ocorrências do paciente divergem; usada a mais recente",
                )
            )

        clinica_id, chave_nome, chave_proprietario = chave
        pacientes.append(
            PacientePlanejado(
                id=str(
                    uuid5(
                        NAMESPACE_PACIENTES,
                        f"{clinica_id}|{chave_nome}|{chave_proprietario}",
                    )
                ),
                nome=_texto(linha_canonica.paciente),
                especie=_texto(linha_canonica.especie),
                raca=_texto(linha_canonica.raca),
                sexo=_texto(linha_canonica.sexo),
                idade=_idade(linha_canonica.idade),
                proprietario=_texto(linha_canonica.proprietario),
                clinica_id=clinica_id,
            )
        )

    contadores = ContadoresImportacao(
        clinicas=len(clinicas),
        veterinarios=len(veterinarios),
        pacientes=len(pacientes),
    )
    return PlanoImportacao(
        clinicas=tuple(clinicas),
        veterinarios=tuple(veterinarios),
        pacientes=tuple(pacientes),
        inconsistencias=tuple(inconsistencias),
        contadores=contadores,
    )
