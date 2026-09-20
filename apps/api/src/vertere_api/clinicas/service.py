import uuid
from typing import Protocol

from vertere_api.clinicas.domain import Clinica


class ClinicaRepository(Protocol):
    def buscar_por_cnpj(self, cnpj: str) -> Clinica | None: ...
    def buscar_por_id(self, clinica_id: str) -> Clinica | None: ...
    def listar_todas(self) -> list[Clinica]: ...
    def salvar(self, clinica: Clinica) -> None: ...


class CnpjInvalido(Exception):
    def __init__(self, cnpj: str) -> None:
        super().__init__(f"CNPJ inválido: {cnpj!r} — esperado 14 dígitos")


class CnpjJaCadastrado(Exception):
    def __init__(self, cnpj: str) -> None:
        super().__init__(f"Já existe uma clínica com o CNPJ {cnpj}")


class ClinicaNaoEncontrada(Exception):
    def __init__(self, clinica_id: str) -> None:
        super().__init__(f"Clínica {clinica_id} não encontrada")


def criar_clinica(
    nome: str,
    cnpj: str,
    endereco: str,
    telefone: str,
    email: str,
    repo: ClinicaRepository,
) -> Clinica:
    """Cadastra uma clínica. Rejeita CNPJ com formato inválido ou já cadastrado."""
    if not (len(cnpj) == 14 and cnpj.isdigit()):
        raise CnpjInvalido(cnpj)
    if repo.buscar_por_cnpj(cnpj) is not None:
        raise CnpjJaCadastrado(cnpj)

    clinica = Clinica(
        id=str(uuid.uuid4()),
        nome=nome,
        cnpj=cnpj,
        endereco=endereco,
        telefone=telefone,
        email=email,
        ativo=True,
    )
    repo.salvar(clinica)
    return clinica


def _buscar_ou_levantar(clinica_id: str, repo: ClinicaRepository) -> Clinica:
    clinica = repo.buscar_por_id(clinica_id)
    if clinica is None:
        raise ClinicaNaoEncontrada(clinica_id)
    return clinica


def editar_clinica(
    clinica_id: str,
    nome: str,
    endereco: str,
    telefone: str,
    email: str,
    repo: ClinicaRepository,
) -> Clinica:
    """Edita os dados cadastrais de uma clínica existente. CNPJ não é editável aqui."""
    clinica = _buscar_ou_levantar(clinica_id, repo)
    atualizada = Clinica(
        id=clinica.id,
        nome=nome,
        cnpj=clinica.cnpj,
        endereco=endereco,
        telefone=telefone,
        email=email,
        ativo=clinica.ativo,
    )
    repo.salvar(atualizada)
    return atualizada


def inativar_clinica(clinica_id: str, repo: ClinicaRepository) -> Clinica:
    """Inativa uma clínica, preservando histórico associado a ela."""
    return _definir_estado_ativo(clinica_id, ativo=False, repo=repo)


def reativar_clinica(clinica_id: str, repo: ClinicaRepository) -> Clinica:
    """Reativa uma clínica previamente inativada."""
    return _definir_estado_ativo(clinica_id, ativo=True, repo=repo)


def _definir_estado_ativo(clinica_id: str, ativo: bool, repo: ClinicaRepository) -> Clinica:
    clinica = _buscar_ou_levantar(clinica_id, repo)
    atualizada = Clinica(
        id=clinica.id,
        nome=clinica.nome,
        cnpj=clinica.cnpj,
        endereco=clinica.endereco,
        telefone=clinica.telefone,
        email=clinica.email,
        ativo=ativo,
    )
    repo.salvar(atualizada)
    return atualizada


def buscar_por_nome(nome: str, repo: ClinicaRepository) -> list[Clinica]:
    """Busca clínicas cujo nome contém `nome` (case-insensitive, substring)."""
    alvo = nome.casefold()
    return [c for c in repo.listar_todas() if alvo in c.nome.casefold()]


def listar_clinicas(repo: ClinicaRepository, *, apenas_ativas: bool = False) -> list[Clinica]:
    """Lista todas as clínicas cadastradas, opcionalmente filtrando só as ativas."""
    clinicas = repo.listar_todas()
    if apenas_ativas:
        return [c for c in clinicas if c.ativo]
    return clinicas
