import uuid
from dataclasses import replace
from datetime import datetime
from decimal import Decimal
from typing import Protocol

from vertere_api.atendimentos.domain import (
    Atendimento,
    ItemExame,
    ItemExameEntrada,
    StatusAtendimento,
)
from vertere_api.auth.domain import Papel, Usuario
from vertere_api.clinicas.service import ClinicaRepository
from vertere_api.exames.service import (
    ExameRepository,
    RegraPlantaoRepository,
    calcular_adicional_plantao,
)
from vertere_api.pacientes.service import PacienteRepository
from vertere_api.veterinarios.service import VeterinarioRepository


class AtendimentoRepository(Protocol):
    def buscar_por_id(self, atendimento_id: str) -> Atendimento | None: ...
    def listar_todas(self) -> list[Atendimento]: ...
    def salvar(self, atendimento: Atendimento) -> None: ...


class DescontoInvalido(Exception):
    def __init__(self, desconto: Decimal, subtotal: Decimal) -> None:
        super().__init__(f"Desconto {desconto} excede o subtotal {subtotal}")


class ClinicaInvalida(Exception):
    def __init__(self, clinica_id: str) -> None:
        super().__init__(f"Clínica {clinica_id} inexistente ou inativa")


class VeterinarioInvalido(Exception):
    def __init__(self, veterinario_id: str) -> None:
        super().__init__(f"Veterinário {veterinario_id} inexistente ou inativo")


class PacienteInvalido(Exception):
    def __init__(self, paciente_id: str) -> None:
        super().__init__(f"Paciente {paciente_id} inexistente ou inativo")


class ExameInvalido(Exception):
    def __init__(self, exame_id: str) -> None:
        super().__init__(f"Exame {exame_id} inexistente ou inativo")


class AtendimentoSemItens(Exception):
    def __init__(self) -> None:
        super().__init__("Atendimento precisa de ao menos um item de exame")


class AtendimentoNaoEncontrado(Exception):
    def __init__(self, atendimento_id: str) -> None:
        super().__init__(f"Atendimento {atendimento_id} não encontrado")


class AtendimentoCancelado(Exception):
    def __init__(self, atendimento_id: str) -> None:
        super().__init__(f"Atendimento {atendimento_id} está cancelado e não pode ser editado")


def calcular_valor_total(
    itens_exame: list[ItemExame], valor_adicional_plantao: Decimal, desconto: Decimal
) -> Decimal:
    """Soma os itens de exame, aplica o adicional de plantão e subtrai o desconto.

    Rejeita um desconto que exceda a soma de itens + adicional, para nunca
    persistir um valor total negativo.
    """
    subtotal = sum((item.preco_unitario * item.quantidade for item in itens_exame), Decimal("0"))
    subtotal += valor_adicional_plantao
    if desconto > subtotal:
        raise DescontoInvalido(desconto, subtotal)
    return subtotal - desconto


def _resolver_itens_exame(
    entradas: list[ItemExameEntrada], exames: ExameRepository
) -> list[ItemExame]:
    if not entradas:
        raise AtendimentoSemItens()
    itens = []
    for entrada in entradas:
        exame = exames.buscar_por_id(entrada.exame_id)
        if exame is None or not exame.ativo:
            raise ExameInvalido(entrada.exame_id)
        itens.append(
            ItemExame(
                exame_id=entrada.exame_id,
                preco_unitario=exame.preco_base,
                quantidade=entrada.quantidade,
            )
        )
    return itens


def _validar_referencias(
    clinica_id: str,
    veterinario_id: str,
    paciente_id: str,
    itens_exame: list[ItemExameEntrada],
    clinicas: ClinicaRepository,
    veterinarios: VeterinarioRepository,
    pacientes: PacienteRepository,
    exames: ExameRepository,
) -> list[ItemExame]:
    clinica = clinicas.buscar_por_id(clinica_id)
    if clinica is None or not clinica.ativo:
        raise ClinicaInvalida(clinica_id)

    veterinario = veterinarios.buscar_por_id(veterinario_id)
    if veterinario is None or not veterinario.ativo:
        raise VeterinarioInvalido(veterinario_id)

    paciente = pacientes.buscar_por_id(paciente_id)
    if paciente is None or not paciente.ativo:
        raise PacienteInvalido(paciente_id)

    return _resolver_itens_exame(itens_exame, exames)


def _resolver_adicional_plantao(
    data_hora: datetime,
    regras_plantao: RegraPlantaoRepository,
    valor_adicional_plantao: Decimal | None,
) -> tuple[Decimal, str | None]:
    if valor_adicional_plantao is not None:
        return valor_adicional_plantao, None
    regra = calcular_adicional_plantao(data_hora, regras_plantao.listar_todas())
    valor = regra.valor_adicional if regra else Decimal("0")
    regra_id = regra.id if regra else None
    return valor, regra_id


def registrar_atendimento(
    clinica_id: str,
    veterinario_id: str,
    paciente_id: str,
    itens_exame: list[ItemExameEntrada],
    metodo_coleta: str,
    data_hora: datetime,
    repo: AtendimentoRepository,
    clinicas: ClinicaRepository,
    veterinarios: VeterinarioRepository,
    pacientes: PacienteRepository,
    exames: ExameRepository,
    regras_plantao: RegraPlantaoRepository,
    desconto: Decimal = Decimal("0"),
    valor_adicional_plantao: Decimal | None = None,
) -> Atendimento:
    """Registra um atendimento, validando clínica/veterinário/paciente/exames ativos.

    Se `valor_adicional_plantao` não for informado, o adicional é sugerido
    automaticamente a partir de `data_hora` e das regras de plantão
    cadastradas (`calcular_adicional_plantao`, S5), e `regra_plantao_id`
    registra qual regra originou a sugestão. Se informado, o valor passado
    é gravado como final e `regra_plantao_id` fica `None` — o sistema não
    guarda sugestão e valor aplicado separados.
    """
    itens = _validar_referencias(
        clinica_id, veterinario_id, paciente_id, itens_exame, clinicas, veterinarios, pacientes, exames
    )
    valor_adicional_plantao, regra_plantao_id = _resolver_adicional_plantao(
        data_hora, regras_plantao, valor_adicional_plantao
    )
    valor_total = calcular_valor_total(itens, valor_adicional_plantao, desconto)

    atendimento = Atendimento(
        id=str(uuid.uuid4()),
        clinica_id=clinica_id,
        veterinario_id=veterinario_id,
        paciente_id=paciente_id,
        itens_exame=itens,
        metodo_coleta=metodo_coleta,
        data_hora=data_hora,
        regra_plantao_id=regra_plantao_id,
        valor_adicional_plantao=valor_adicional_plantao,
        desconto=desconto,
        valor_total=valor_total,
        status=StatusAtendimento.ATIVO,
    )
    repo.salvar(atendimento)
    return atendimento


def _buscar_atendimento_ou_levantar(atendimento_id: str, repo: AtendimentoRepository) -> Atendimento:
    atendimento = repo.buscar_por_id(atendimento_id)
    if atendimento is None:
        raise AtendimentoNaoEncontrado(atendimento_id)
    return atendimento


def editar_atendimento(
    atendimento_id: str,
    clinica_id: str,
    veterinario_id: str,
    paciente_id: str,
    itens_exame: list[ItemExameEntrada],
    metodo_coleta: str,
    data_hora: datetime,
    repo: AtendimentoRepository,
    clinicas: ClinicaRepository,
    veterinarios: VeterinarioRepository,
    pacientes: PacienteRepository,
    exames: ExameRepository,
    regras_plantao: RegraPlantaoRepository,
    desconto: Decimal = Decimal("0"),
    valor_adicional_plantao: Decimal | None = None,
) -> Atendimento:
    """Edita um atendimento com `status=ativo`, recalculando `valor_total`.

    Rejeita edição de atendimento inexistente ou já cancelado (cancelamento
    é terminal nesta spec — não existe mecanismo de bloqueio por fechamento
    de período ainda, ver "Implementation Decisions" da spec).
    """
    atual = _buscar_atendimento_ou_levantar(atendimento_id, repo)
    if atual.status == StatusAtendimento.CANCELADO:
        raise AtendimentoCancelado(atendimento_id)

    itens = _validar_referencias(
        clinica_id, veterinario_id, paciente_id, itens_exame, clinicas, veterinarios, pacientes, exames
    )
    valor_adicional_plantao, regra_plantao_id = _resolver_adicional_plantao(
        data_hora, regras_plantao, valor_adicional_plantao
    )
    valor_total = calcular_valor_total(itens, valor_adicional_plantao, desconto)

    atualizado = replace(
        atual,
        clinica_id=clinica_id,
        veterinario_id=veterinario_id,
        paciente_id=paciente_id,
        itens_exame=itens,
        metodo_coleta=metodo_coleta,
        data_hora=data_hora,
        regra_plantao_id=regra_plantao_id,
        valor_adicional_plantao=valor_adicional_plantao,
        desconto=desconto,
        valor_total=valor_total,
    )
    repo.salvar(atualizado)
    return atualizado


def cancelar_atendimento(atendimento_id: str, repo: AtendimentoRepository) -> Atendimento:
    """Cancela um atendimento, preservando o registro para auditoria.

    Cancelamento é terminal nesta spec: não há operação de reabertura.
    """
    atual = _buscar_atendimento_ou_levantar(atendimento_id, repo)
    cancelado = replace(atual, status=StatusAtendimento.CANCELADO)
    repo.salvar(cancelado)
    return cancelado


def listar_atendimentos(
    repo: AtendimentoRepository,
    usuario: Usuario,
    *,
    clinica_id: str | None = None,
    veterinario_id: str | None = None,
    status: StatusAtendimento | None = None,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
) -> list[Atendimento]:
    """Lista atendimentos, filtrando por período, clínica, veterinário e status.

    Um usuário com `papel=clinica` só enxerga atendimentos da própria
    clínica (`usuario.clinica_id`), independente de `clinica_id` informado
    — escopo de dados aplicado pelo service a partir do papel do usuário
    autenticado, não uma checagem de acesso nova fora de `authorize()`.
    """
    atendimentos = repo.listar_todas()

    if usuario.papel == Papel.CLINICA:
        atendimentos = [a for a in atendimentos if a.clinica_id == usuario.clinica_id]
    elif clinica_id is not None:
        atendimentos = [a for a in atendimentos if a.clinica_id == clinica_id]

    if veterinario_id is not None:
        atendimentos = [a for a in atendimentos if a.veterinario_id == veterinario_id]
    if status is not None:
        atendimentos = [a for a in atendimentos if a.status == status]
    if data_inicio is not None:
        atendimentos = [a for a in atendimentos if a.data_hora >= data_inicio]
    if data_fim is not None:
        atendimentos = [a for a in atendimentos if a.data_hora <= data_fim]

    return atendimentos
