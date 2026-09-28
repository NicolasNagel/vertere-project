from dataclasses import dataclass, field
from datetime import date, datetime, time
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


ValorCelula = str | int | float | Decimal | date | datetime | time | None

NAMESPACE_CLINICAS = UUID("6116c7f4-f1a2-52a7-a238-058327291a4c")
NAMESPACE_VETERINARIOS = UUID("99975269-381c-5f90-bcc7-ce094833e32e")
NAMESPACE_PACIENTES = UUID("8d7bc83d-477e-54ff-8da7-2c6fc55fa163")
NAMESPACE_EXAMES = UUID("f2f50fd3-23b0-52d8-9fe2-ac9e5c248c1d")
NAMESPACE_ATENDIMENTOS = UUID("aef2e640-419e-5ea1-9a99-a03285968ee5")


class SeveridadeInconsistencia(StrEnum):
    ERRO = "erro"
    AVISO = "aviso"


class CodigoInconsistencia(StrEnum):
    ABA_AUSENTE = "aba_ausente"
    CABECALHO_AUSENTE = "cabecalho_ausente"
    CAMPO_OBRIGATORIO = "campo_obrigatorio"
    CNPJ_INVALIDO = "cnpj_invalido"
    CHAVE_DUPLICADA = "chave_duplicada"
    REFERENCIA_INEXISTENTE = "referencia_inexistente"
    REFERENCIA_AMBIGUA = "referencia_ambigua"
    STATUS_INVALIDO = "status_invalido"
    VALOR_INVALIDO = "valor_invalido"
    TOTAL_DIVERGENTE = "total_divergente"
    DADO_HISTORICO_DIVERGENTE = "dado_historico_divergente"
    COLISAO_DESTINO = "colisao_destino"


@dataclass(frozen=True)
class InconsistenciaImportacao:
    severidade: SeveridadeInconsistencia
    codigo: CodigoInconsistencia
    aba: str
    linha: int | None
    coluna: str | None
    mensagem: str


class ContratoPlanilha(BaseModel):
    model_config = ConfigDict(frozen=True)


class LinhaClinicaPlanilha(ContratoPlanilha):
    linha: int
    nome: ValorCelula
    cnpj: ValorCelula
    endereco: ValorCelula
    telefone: ValorCelula
    email: ValorCelula
    status: ValorCelula


class LinhaVeterinarioPlanilha(ContratoPlanilha):
    linha: int
    clinica: ValorCelula
    nome: ValorCelula
    crmv: ValorCelula
    telefone: ValorCelula
    email: ValorCelula
    status: ValorCelula


class LinhaAtendimentoPlanilha(ContratoPlanilha):
    linha: int
    clinica: ValorCelula
    data: ValorCelula
    hora: ValorCelula
    numero: ValorCelula
    protocolo: ValorCelula
    metodo_coleta: ValorCelula
    veterinario: ValorCelula
    paciente: ValorCelula
    especie: ValorCelula
    raca: ValorCelula
    sexo: ValorCelula
    idade: ValorCelula
    proprietario: ValorCelula
    categoria_exame: ValorCelula
    exame: ValorCelula
    tipo_atendimento: ValorCelula
    valor: ValorCelula
    desconto: ValorCelula
    adicional: ValorCelula
    valor_total: ValorCelula


class DadosPlanilha(ContratoPlanilha):
    clinicas: tuple[LinhaClinicaPlanilha, ...]
    veterinarios: tuple[LinhaVeterinarioPlanilha, ...]
    atendimentos: tuple[LinhaAtendimentoPlanilha, ...]


@dataclass(frozen=True)
class ClinicaPlanejada:
    id: str
    nome: str
    cnpj: str
    endereco: str
    telefone: str
    email: str
    ativo: bool


@dataclass(frozen=True)
class VeterinarioPlanejado:
    id: str
    nome: str
    crmv: str
    telefone: str
    email: str
    clinica_id: str
    ativo: bool


@dataclass(frozen=True)
class PacientePlanejado:
    id: str
    nome: str
    especie: str
    raca: str
    sexo: str
    idade: int
    proprietario: str
    clinica_id: str
    ativo: bool = True


@dataclass(frozen=True)
class ExamePlanejado:
    id: str
    categoria: str
    nome: str
    preco_base: Decimal
    ativo: bool = True


@dataclass(frozen=True)
class AtendimentoPlanejado:
    id: str
    clinica_id: str
    veterinario_id: str
    paciente_id: str
    exame_id: str
    preco_unitario: Decimal
    metodo_coleta: str
    data_hora: datetime
    valor_adicional_plantao: Decimal
    desconto: Decimal
    valor_total: Decimal
    numero_origem: str
    protocolo_origem: str


@dataclass(frozen=True)
class ContadoresImportacao:
    clinicas: int = 0
    veterinarios: int = 0
    pacientes: int = 0
    exames: int = 0
    atendimentos: int = 0


@dataclass(frozen=True)
class PlanoImportacao:
    clinicas: tuple[ClinicaPlanejada, ...] = ()
    veterinarios: tuple[VeterinarioPlanejado, ...] = ()
    pacientes: tuple[PacientePlanejado, ...] = ()
    exames: tuple[ExamePlanejado, ...] = ()
    atendimentos: tuple[AtendimentoPlanejado, ...] = ()
    inconsistencias: tuple[InconsistenciaImportacao, ...] = ()
    contadores: ContadoresImportacao = field(default_factory=ContadoresImportacao)

    @property
    def aplicavel(self) -> bool:
        return not any(
            item.severidade is SeveridadeInconsistencia.ERRO
            for item in self.inconsistencias
        )
