import uuid
from dataclasses import replace
from typing import Protocol

from vertere_api.auth.domain import Papel, Usuario
from vertere_api.auth.service import Acao, authorize
from vertere_api.clinicas.service import ClinicaRepository
from vertere_api.pacientes.domain import Paciente


class PacienteRepository(Protocol):
    def buscar_por_id(self, paciente_id: str) -> Paciente | None: ...
    def listar_todas(self) -> list[Paciente]: ...
    def salvar(self, paciente: Paciente) -> None: ...


class ClinicaInexistente(Exception):
    def __init__(self, clinica_id: str) -> None:
        super().__init__(f"Clínica {clinica_id} não encontrada")


class PacienteNaoEncontrado(Exception):
    def __init__(self, paciente_id: str) -> None:
        super().__init__(f"Paciente {paciente_id} não encontrado")


def cadastrar_paciente(
    nome: str,
    especie: str,
    raca: str,
    sexo: str,
    idade: int,
    proprietario: str,
    clinica_id: str,
    repo: PacienteRepository,
    clinicas: ClinicaRepository,
) -> Paciente:
    """Cadastra um paciente vinculado a uma clínica existente.

    Não exige unicidade de nome: dois pacientes podem ter o mesmo nome,
    inclusive na mesma clínica — a prevenção de duplicidade é
    responsabilidade do fluxo de busca antes do cadastro, não desta função.
    """
    if clinicas.buscar_por_id(clinica_id) is None:
        raise ClinicaInexistente(clinica_id)

    paciente = Paciente(
        id=str(uuid.uuid4()),
        nome=nome,
        especie=especie,
        raca=raca,
        sexo=sexo,
        idade=idade,
        proprietario=proprietario,
        clinica_id=clinica_id,
        ativo=True,
    )
    repo.salvar(paciente)
    return paciente


def _buscar_ou_levantar(paciente_id: str, repo: PacienteRepository) -> Paciente:
    paciente = repo.buscar_por_id(paciente_id)
    if paciente is None:
        raise PacienteNaoEncontrado(paciente_id)
    return paciente


def editar_paciente(
    paciente_id: str,
    nome: str,
    especie: str,
    raca: str,
    sexo: str,
    idade: int,
    proprietario: str,
    repo: PacienteRepository,
) -> Paciente:
    """Edita os dados cadastrais de um paciente existente. Clínica não é editável aqui."""
    paciente = _buscar_ou_levantar(paciente_id, repo)
    atualizado = replace(
        paciente,
        nome=nome,
        especie=especie,
        raca=raca,
        sexo=sexo,
        idade=idade,
        proprietario=proprietario,
    )
    repo.salvar(atualizado)
    return atualizado


def inativar_paciente(paciente_id: str, repo: PacienteRepository) -> Paciente:
    """Inativa um paciente, preservando histórico associado a ele."""
    return _definir_estado_ativo(paciente_id, ativo=False, repo=repo)


def reativar_paciente(paciente_id: str, repo: PacienteRepository) -> Paciente:
    """Reativa um paciente previamente inativado."""
    return _definir_estado_ativo(paciente_id, ativo=True, repo=repo)


def _definir_estado_ativo(paciente_id: str, ativo: bool, repo: PacienteRepository) -> Paciente:
    paciente = _buscar_ou_levantar(paciente_id, repo)
    atualizado = replace(paciente, ativo=ativo)
    repo.salvar(atualizado)
    return atualizado


def _filtrar(
    pacientes: list[Paciente],
    *,
    clinica_id: str | None,
    proprietario: str | None,
    apenas_ativos: bool,
) -> list[Paciente]:
    if clinica_id is not None:
        pacientes = [p for p in pacientes if p.clinica_id == clinica_id]
    if proprietario is not None:
        alvo = proprietario.casefold()
        pacientes = [p for p in pacientes if alvo in p.proprietario.casefold()]
    if apenas_ativos:
        pacientes = [p for p in pacientes if p.ativo]
    return pacientes


def buscar_pacientes(
    nome: str,
    repo: PacienteRepository,
    usuario: Usuario,
    *,
    clinica_id: str | None = None,
    proprietario: str | None = None,
    apenas_ativos: bool = False,
) -> list[Paciente]:
    """Busca pacientes cujo nome contém `nome` (case-insensitive, substring).

    Um usuário com `papel=clinica` só enxerga pacientes da própria clínica
    (`usuario.clinica_id`), independente de `clinica_id` informado — mesmo
    padrão de escopo de `atendimentos.service.listar_atendimentos` (S6).
    """
    if usuario.papel == Papel.CLINICA:
        clinica_id = usuario.clinica_id
    alvo = nome.casefold()
    resultado = [p for p in repo.listar_todas() if alvo in p.nome.casefold()]
    return _filtrar(
        resultado, clinica_id=clinica_id, proprietario=proprietario, apenas_ativos=apenas_ativos
    )


def buscar_paciente(paciente_id: str, usuario: Usuario, repo: PacienteRepository) -> Paciente:
    """Busca um paciente único, aplicando o escopo de clínica via `authorize()`.

    Recurso único (não listagem): usa `authorize()` de verdade com o
    `clinica_recurso` do próprio paciente — mesmo padrão de
    `laudos.service.ver_laudo` (S7). Levanta `PacienteNaoEncontrado` tanto
    para id inexistente quanto para acesso negado (404, não 403 — não revela
    a existência do recurso a quem não tem acesso).
    """
    paciente = repo.buscar_por_id(paciente_id)
    if paciente is None:
        raise PacienteNaoEncontrado(paciente_id)

    if not authorize(
        usuario.papel,
        Acao.PACIENTE_VER,
        clinica_usuario=usuario.clinica_id,
        clinica_recurso=paciente.clinica_id,
    ):
        raise PacienteNaoEncontrado(paciente_id)

    return paciente


def listar_pacientes(
    repo: PacienteRepository,
    usuario: Usuario,
    *,
    clinica_id: str | None = None,
    apenas_ativos: bool = False,
) -> list[Paciente]:
    """Lista todos os pacientes cadastrados, opcionalmente filtrando por clínica e/ou ativos.

    Um usuário com `papel=clinica` só enxerga pacientes da própria clínica
    (`usuario.clinica_id`), independente de `clinica_id` informado.
    """
    if usuario.papel == Papel.CLINICA:
        clinica_id = usuario.clinica_id
    return _filtrar(
        repo.listar_todas(), clinica_id=clinica_id, proprietario=None, apenas_ativos=apenas_ativos
    )
