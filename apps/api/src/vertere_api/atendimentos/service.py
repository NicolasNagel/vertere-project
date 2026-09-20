import uuid
from datetime import datetime
from decimal import Decimal
from typing import Protocol

from vertere_api.atendimentos.domain import (
    Atendimento,
    ItemExame,
    ItemExameEntrada,
    StatusAtendimento,
)
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
    clinica = clinicas.buscar_por_id(clinica_id)
    if clinica is None or not clinica.ativo:
        raise ClinicaInvalida(clinica_id)

    veterinario = veterinarios.buscar_por_id(veterinario_id)
    if veterinario is None or not veterinario.ativo:
        raise VeterinarioInvalido(veterinario_id)

    paciente = pacientes.buscar_por_id(paciente_id)
    if paciente is None or not paciente.ativo:
        raise PacienteInvalido(paciente_id)

    itens = _resolver_itens_exame(itens_exame, exames)

    regra_plantao_id: str | None = None
    if valor_adicional_plantao is None:
        regra = calcular_adicional_plantao(data_hora, regras_plantao.listar_todas())
        valor_adicional_plantao = regra.valor_adicional if regra else Decimal("0")
        regra_plantao_id = regra.id if regra else None

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
