import uuid
from dataclasses import replace
from typing import Protocol

from vertere_api.clinicas.service import ClinicaRepository
from vertere_api.veterinarios.domain import Veterinario


class VeterinarioRepository(Protocol):
    def buscar_por_crmv(self, crmv: str) -> Veterinario | None: ...
    def buscar_por_id(self, veterinario_id: str) -> Veterinario | None: ...
    def listar_todas(self) -> list[Veterinario]: ...
    def salvar(self, veterinario: Veterinario) -> None: ...


class ClinicaInexistente(Exception):
    def __init__(self, clinica_id: str) -> None:
        super().__init__(f"Clínica {clinica_id} não encontrada")


class CrmvJaCadastrado(Exception):
    def __init__(self, crmv: str) -> None:
        super().__init__(f"Já existe um veterinário com o CRMV {crmv}")


class VeterinarioNaoEncontrado(Exception):
    def __init__(self, veterinario_id: str) -> None:
        super().__init__(f"Veterinário {veterinario_id} não encontrado")


def cadastrar_veterinario(
    nome: str,
    crmv: str,
    telefone: str,
    email: str,
    clinica_id: str,
    repo: VeterinarioRepository,
    clinicas: ClinicaRepository,
) -> Veterinario:
    """Cadastra um veterinário vinculado a uma clínica existente.

    Rejeita `clinica_id` que não corresponde a uma clínica cadastrada, e CRMV
    já cadastrado (único em todo o cadastro, independente de clínica).
    """
    if clinicas.buscar_por_id(clinica_id) is None:
        raise ClinicaInexistente(clinica_id)
    if repo.buscar_por_crmv(crmv) is not None:
        raise CrmvJaCadastrado(crmv)

    veterinario = Veterinario(
        id=str(uuid.uuid4()),
        nome=nome,
        crmv=crmv,
        telefone=telefone,
        email=email,
        clinica_id=clinica_id,
        ativo=True,
    )
    repo.salvar(veterinario)
    return veterinario


def _buscar_ou_levantar(veterinario_id: str, repo: VeterinarioRepository) -> Veterinario:
    veterinario = repo.buscar_por_id(veterinario_id)
    if veterinario is None:
        raise VeterinarioNaoEncontrado(veterinario_id)
    return veterinario


def editar_veterinario(
    veterinario_id: str,
    nome: str,
    telefone: str,
    email: str,
    repo: VeterinarioRepository,
) -> Veterinario:
    """Edita os dados cadastrais de um veterinário existente. CRMV e clínica não são editáveis aqui."""
    veterinario = _buscar_ou_levantar(veterinario_id, repo)
    atualizado = replace(veterinario, nome=nome, telefone=telefone, email=email)
    repo.salvar(atualizado)
    return atualizado


def inativar_veterinario(veterinario_id: str, repo: VeterinarioRepository) -> Veterinario:
    """Inativa um veterinário, preservando histórico associado a ele."""
    return _definir_estado_ativo(veterinario_id, ativo=False, repo=repo)


def reativar_veterinario(veterinario_id: str, repo: VeterinarioRepository) -> Veterinario:
    """Reativa um veterinário previamente inativado."""
    return _definir_estado_ativo(veterinario_id, ativo=True, repo=repo)


def _definir_estado_ativo(
    veterinario_id: str, ativo: bool, repo: VeterinarioRepository
) -> Veterinario:
    veterinario = _buscar_ou_levantar(veterinario_id, repo)
    atualizado = replace(veterinario, ativo=ativo)
    repo.salvar(atualizado)
    return atualizado


def buscar_veterinarios(
    nome: str,
    repo: VeterinarioRepository,
    *,
    clinica_id: str | None = None,
    apenas_ativos: bool = False,
) -> list[Veterinario]:
    """Busca veterinários cujo nome contém `nome` (case-insensitive, substring)."""
    alvo = nome.casefold()
    resultado = [v for v in repo.listar_todas() if alvo in v.nome.casefold()]
    if clinica_id is not None:
        resultado = [v for v in resultado if v.clinica_id == clinica_id]
    if apenas_ativos:
        resultado = [v for v in resultado if v.ativo]
    return resultado


def listar_veterinarios(
    repo: VeterinarioRepository,
    *,
    clinica_id: str | None = None,
    apenas_ativos: bool = False,
) -> list[Veterinario]:
    """Lista todos os veterinários cadastrados, opcionalmente filtrando por clínica e/ou ativos."""
    veterinarios = repo.listar_todas()
    if clinica_id is not None:
        veterinarios = [v for v in veterinarios if v.clinica_id == clinica_id]
    if apenas_ativos:
        veterinarios = [v for v in veterinarios if v.ativo]
    return veterinarios
