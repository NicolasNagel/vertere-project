from collections import defaultdict
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from uuid import uuid5

from vertere_api.importacao.domain import (
    AtendimentoPlanejado,
    CodigoInconsistencia,
    ClinicaPlanejada,
    ContadoresImportacao,
    DadosPlanilha,
    ExamePlanejado,
    InconsistenciaImportacao,
    LinhaAtendimentoPlanilha,
    NAMESPACE_ATENDIMENTOS,
    NAMESPACE_CLINICAS,
    NAMESPACE_EXAMES,
    NAMESPACE_PACIENTES,
    NAMESPACE_VETERINARIOS,
    PacientePlanejado,
    PlanoImportacao,
    SeveridadeInconsistencia,
    ValorCelula,
    VeterinarioPlanejado,
)
from vertere_api.importacao.normalizacao import (
    chave_texto as _chave_texto,
    somente_digitos as _somente_digitos,
    texto as _texto,
)


def _interpretar_status(valor: ValorCelula) -> bool | None:
    normalizado = _chave_texto(valor)
    if normalizado == "ativo":
        return True
    if normalizado == "inativo":
        return False
    return None


def _inconsistencia(
    severidade: SeveridadeInconsistencia,
    codigo: CodigoInconsistencia,
    aba: str,
    linha: int,
    coluna: str,
    mensagem: str,
) -> InconsistenciaImportacao:
    return InconsistenciaImportacao(
        severidade=severidade,
        codigo=codigo,
        aba=aba,
        linha=linha,
        coluna=coluna,
        mensagem=mensagem,
    )


def _erro(
    codigo: CodigoInconsistencia,
    aba: str,
    linha: int,
    coluna: str,
    mensagem: str,
) -> InconsistenciaImportacao:
    return _inconsistencia(
        SeveridadeInconsistencia.ERRO, codigo, aba, linha, coluna, mensagem
    )


def _aviso(
    codigo: CodigoInconsistencia,
    aba: str,
    linha: int,
    coluna: str,
    mensagem: str,
) -> InconsistenciaImportacao:
    return _inconsistencia(
        SeveridadeInconsistencia.AVISO, codigo, aba, linha, coluna, mensagem
    )


def _exigir(
    condicao: bool,
    codigo: CodigoInconsistencia,
    aba: str,
    linha: int,
    coluna: str,
    mensagem: str,
    inconsistencias: list[InconsistenciaImportacao],
) -> bool:
    """Valida `condicao`; se falsa, registra um erro em `inconsistencias`.

    Retorna a própria `condicao`. Sempre roda (não é de curto-circuito) para
    que o chamador componha `valido = _exigir(...) and valido` sem perder a
    coleta de inconsistências de checagens seguintes na mesma linha.
    """
    if not condicao:
        inconsistencias.append(_erro(codigo, aba, linha, coluna, mensagem))
    return condicao


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


def _decimal(valor: ValorCelula, *, vazio_como_zero: bool = False) -> Decimal | None:
    if valor is None or _texto(valor) == "":
        return Decimal("0") if vazio_como_zero else None
    if isinstance(valor, Decimal):
        resultado = valor
    elif isinstance(valor, (int, float)) and not isinstance(valor, bool):
        resultado = Decimal(str(valor))
    else:
        texto = _texto(valor).replace("R$", "").replace(" ", "")
        if "," in texto:
            texto = texto.replace(".", "").replace(",", ".")
        try:
            resultado = Decimal(texto)
        except InvalidOperation:
            return None
    return resultado.quantize(Decimal("0.01"))


def _validar_ocorrencia_canonica_paciente(
    linha: LinhaAtendimentoPlanilha,
) -> tuple[int | None, list[InconsistenciaImportacao]]:
    inconsistencias: list[InconsistenciaImportacao] = []
    for coluna, valor in {
        "Espécie": _texto(linha.especie),
        "Raça": _texto(linha.raca),
        "Sexo": _texto(linha.sexo),
    }.items():
        _exigir(
            bool(valor),
            CodigoInconsistencia.CAMPO_OBRIGATORIO,
            "Dados",
            linha.linha,
            coluna,
            f"{coluna} é obrigatório na ocorrência canônica do paciente",
            inconsistencias,
        )
    idade = _idade(linha.idade)
    _exigir(
        idade is not None,
        CodigoInconsistencia.VALOR_INVALIDO,
        "Dados",
        linha.linha,
        "Idade",
        "Idade deve ser um inteiro não negativo na ocorrência canônica",
        inconsistencias,
    )
    return idade, inconsistencias


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

        valido = _exigir(
            bool(nome),
            CodigoInconsistencia.CAMPO_OBRIGATORIO,
            "Cadastro Clínicas",
            linha.linha,
            "Clínica",
            "Nome da clínica é obrigatório",
            inconsistencias,
        ) and valido
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
        if len(cnpj) == 14:
            cnpjs_vistos.add(cnpj)

        ativo = _interpretar_status(linha.status)
        valido = _exigir(
            ativo is not None,
            CodigoInconsistencia.STATUS_INVALIDO,
            "Cadastro Clínicas",
            linha.linha,
            "Status",
            "Status deve ser Ativo ou Inativo",
            inconsistencias,
        ) and valido

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

    veterinarios: list[VeterinarioPlanejado] = []
    crmvs_vistos: set[str] = set()
    for linha in dados_planilha.veterinarios:
        nome = _texto(linha.nome)
        crmv = _texto(linha.crmv)
        chave_crmv = _chave_texto(linha.crmv)
        chave_clinica = _chave_texto(linha.clinica)
        candidatas = clinicas_por_nome.get(chave_clinica, [])
        valido = True

        valido = _exigir(
            bool(nome),
            CodigoInconsistencia.CAMPO_OBRIGATORIO,
            "Cadastro Veterinários",
            linha.linha,
            "Nome",
            "Nome do veterinário é obrigatório",
            inconsistencias,
        ) and valido
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
        elif chave_crmv in crmvs_vistos:
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
        if chave_crmv:
            crmvs_vistos.add(chave_crmv)

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
        valido = _exigir(
            ativo is not None,
            CodigoInconsistencia.STATUS_INVALIDO,
            "Cadastro Veterinários",
            linha.linha,
            "Status",
            "Status deve ser Ativo ou Inativo",
            inconsistencias,
        ) and valido

        if not valido:
            continue

        veterinario = VeterinarioPlanejado(
            id=str(uuid5(NAMESPACE_VETERINARIOS, chave_crmv)),
            nome=nome,
            crmv=crmv,
            telefone=_texto(linha.telefone),
            email=_texto(linha.email),
            clinica_id=candidatas[0].id,
            ativo=ativo,
        )
        veterinarios.append(veterinario)

    pacientes_por_chave: dict[
        tuple[str, str, str], list[tuple[datetime, LinhaAtendimentoPlanilha]]
    ] = defaultdict(list)
    for linha in dados_planilha.atendimentos:
        chave_clinica = _chave_texto(linha.clinica)
        candidatas = clinicas_por_nome.get(chave_clinica, [])
        nome = _texto(linha.paciente)
        proprietario = _texto(linha.proprietario)
        campos_texto = {
            "Paciente": nome,
            "Proprietário": proprietario,
        }
        valido = True
        for coluna, valor in campos_texto.items():
            valido = _exigir(
                bool(valor),
                CodigoInconsistencia.CAMPO_OBRIGATORIO,
                "Dados",
                linha.linha,
                coluna,
                f"{coluna} é obrigatório para formar o cadastro do paciente",
                inconsistencias,
            ) and valido

        instante = _data_hora(linha.data, linha.hora)
        valido = _exigir(
            instante is not None,
            CodigoInconsistencia.VALOR_INVALIDO,
            "Dados",
            linha.linha,
            "Data/Hora",
            "Data e hora devem formar um instante válido",
            inconsistencias,
        ) and valido

        codigo_referencia_clinica = (
            CodigoInconsistencia.REFERENCIA_AMBIGUA
            if len(candidatas) > 1
            else CodigoInconsistencia.REFERENCIA_INEXISTENTE
        )
        valido = _exigir(
            len(candidatas) == 1,
            codigo_referencia_clinica,
            "Dados",
            linha.linha,
            "Clínica",
            "Clínica do paciente não pôde ser resolvida unicamente",
            inconsistencias,
        ) and valido

        if not valido:
            _, erros_canonicos = _validar_ocorrencia_canonica_paciente(linha)
            inconsistencias.extend(erros_canonicos)
            continue

        chave = (candidatas[0].id, _chave_texto(nome), _chave_texto(proprietario))
        pacientes_por_chave[chave].append((instante, linha))

    pacientes: list[PacientePlanejado] = []
    for chave, ocorrencias in pacientes_por_chave.items():
        ocorrencias.sort(key=lambda item: (item[0], item[1].linha))
        _, linha_canonica = ocorrencias[-1]
        idade_canonica, erros_canonicos = _validar_ocorrencia_canonica_paciente(
            linha_canonica
        )
        inconsistencias.extend(erros_canonicos)
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

        if erros_canonicos:
            continue

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
                idade=idade_canonica,
                proprietario=_texto(linha_canonica.proprietario),
                clinica_id=clinica_id,
            )
        )

    veterinarios_por_nome_clinica: dict[
        tuple[str, str], list[VeterinarioPlanejado]
    ] = defaultdict(list)
    for veterinario in veterinarios:
        veterinarios_por_nome_clinica[
            (veterinario.clinica_id, _chave_texto(veterinario.nome))
        ].append(veterinario)
    pacientes_por_identidade = {
        (paciente.clinica_id, _chave_texto(paciente.nome), _chave_texto(paciente.proprietario)): paciente
        for paciente in pacientes
    }

    ocorrencias_exame: dict[
        tuple[str, str], list[tuple[datetime, LinhaAtendimentoPlanilha, Decimal]]
    ] = defaultdict(list)
    atendimentos: list[AtendimentoPlanejado] = []
    protocolos_vistos: set[str] = set()
    for linha in dados_planilha.atendimentos:
        valido = True
        candidatas_clinica = clinicas_por_nome.get(_chave_texto(linha.clinica), [])
        clinica = candidatas_clinica[0] if len(candidatas_clinica) == 1 else None
        if clinica is None:
            valido = False

        veterinarios_candidatos = (
            veterinarios_por_nome_clinica.get(
                (clinica.id, _chave_texto(linha.veterinario)), []
            )
            if clinica is not None
            else []
        )
        codigo_referencia_veterinario = (
            CodigoInconsistencia.REFERENCIA_AMBIGUA
            if len(veterinarios_candidatos) > 1
            else CodigoInconsistencia.REFERENCIA_INEXISTENTE
        )
        valido = _exigir(
            len(veterinarios_candidatos) == 1,
            codigo_referencia_veterinario,
            "Dados",
            linha.linha,
            "Veterinário",
            "Veterinário não pôde ser resolvido unicamente na clínica",
            inconsistencias,
        ) and valido

        paciente = (
            pacientes_por_identidade.get(
                (
                    clinica.id,
                    _chave_texto(linha.paciente),
                    _chave_texto(linha.proprietario),
                )
            )
            if clinica is not None
            else None
        )
        if paciente is None:
            valido = False

        instante = _data_hora(linha.data, linha.hora)
        if instante is None:
            valido = False

        categoria = _texto(linha.categoria_exame)
        nome_exame = _texto(linha.exame)
        valido = _exigir(
            bool(categoria) and bool(nome_exame),
            CodigoInconsistencia.CAMPO_OBRIGATORIO,
            "Dados",
            linha.linha,
            "Tipo de Exame/Exame",
            "Categoria e nome do exame são obrigatórios",
            inconsistencias,
        ) and valido

        preco = _decimal(linha.valor)
        desconto = _decimal(linha.desconto, vazio_como_zero=True)
        adicional = _decimal(linha.adicional, vazio_como_zero=True)
        total = _decimal(linha.valor_total)
        financeiros = {
            "Valor": preco,
            "Desconto": desconto,
            "Adicional": adicional,
            "Valor Total": total,
        }
        for coluna, valor in financeiros.items():
            valido = _exigir(
                valor is not None and valor >= 0,
                CodigoInconsistencia.VALOR_INVALIDO,
                "Dados",
                linha.linha,
                coluna,
                f"{coluna} deve ser um valor monetário não negativo",
                inconsistencias,
            ) and valido
        if all(valor is not None and valor >= 0 for valor in financeiros.values()):
            if preco + adicional - desconto != total:
                inconsistencias.append(
                    _erro(
                        CodigoInconsistencia.TOTAL_DIVERGENTE,
                        "Dados",
                        linha.linha,
                        "Valor Total",
                        "Valor Total diverge de Valor + Adicional - Desconto",
                    )
                )
                valido = False

        numero = _texto(linha.numero)
        protocolo = _texto(linha.protocolo)
        for coluna, valor in (("Nº", numero), ("Protocolo", protocolo)):
            valido = _exigir(
                bool(valor),
                CodigoInconsistencia.CAMPO_OBRIGATORIO,
                "Dados",
                linha.linha,
                coluna,
                f"{coluna} é obrigatório para identificar o atendimento",
                inconsistencias,
            ) and valido
        if protocolo and protocolo in protocolos_vistos:
            inconsistencias.append(
                _erro(
                    CodigoInconsistencia.CHAVE_DUPLICADA,
                    "Dados",
                    linha.linha,
                    "Protocolo",
                    "Protocolo duplicado na fonte",
                )
            )
            valido = False
        if protocolo:
            protocolos_vistos.add(protocolo)

        metodo_coleta = _texto(linha.metodo_coleta)
        valido = _exigir(
            bool(metodo_coleta),
            CodigoInconsistencia.CAMPO_OBRIGATORIO,
            "Dados",
            linha.linha,
            "Método de Coleta",
            "Método de coleta é obrigatório",
            inconsistencias,
        ) and valido

        if preco is not None and instante is not None and categoria and nome_exame:
            chave_exame = (_chave_texto(categoria), _chave_texto(nome_exame))
            ocorrencias_exame[chave_exame].append((instante, linha, preco))
        else:
            chave_exame = None

        if not valido or chave_exame is None:
            continue

        exame_id = str(uuid5(NAMESPACE_EXAMES, "|".join(chave_exame)))
        atendimentos.append(
            AtendimentoPlanejado(
                id=str(uuid5(NAMESPACE_ATENDIMENTOS, protocolo)),
                clinica_id=clinica.id,
                veterinario_id=veterinarios_candidatos[0].id,
                paciente_id=paciente.id,
                exame_id=exame_id,
                preco_unitario=preco,
                metodo_coleta=metodo_coleta,
                data_hora=instante,
                valor_adicional_plantao=adicional,
                desconto=desconto,
                valor_total=total,
                numero_origem=numero,
                protocolo_origem=protocolo,
            )
        )

    exames: list[ExamePlanejado] = []
    for chave_exame, ocorrencias in ocorrencias_exame.items():
        ocorrencias.sort(key=lambda item: (item[0], item[1].linha))
        _, linha_canonica, preco_canonico = ocorrencias[-1]
        if len({preco for _, _, preco in ocorrencias}) > 1:
            inconsistencias.append(
                _aviso(
                    CodigoInconsistencia.DADO_HISTORICO_DIVERGENTE,
                    "Dados",
                    linha_canonica.linha,
                    "Valor",
                    "Preços históricos do exame divergem; usado o mais recente no catálogo",
                )
            )
        exames.append(
            ExamePlanejado(
                id=str(uuid5(NAMESPACE_EXAMES, "|".join(chave_exame))),
                categoria=_texto(linha_canonica.categoria_exame),
                nome=_texto(linha_canonica.exame),
                preco_base=preco_canonico,
            )
        )

    contadores = ContadoresImportacao(
        clinicas=len(clinicas),
        veterinarios=len(veterinarios),
        pacientes=len(pacientes),
        exames=len(exames),
        atendimentos=len(atendimentos),
    )
    return PlanoImportacao(
        clinicas=tuple(clinicas),
        veterinarios=tuple(veterinarios),
        pacientes=tuple(pacientes),
        exames=tuple(exames),
        atendimentos=tuple(atendimentos),
        inconsistencias=tuple(inconsistencias),
        contadores=contadores,
    )
