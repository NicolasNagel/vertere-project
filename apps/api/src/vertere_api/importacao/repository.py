from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from vertere_api.atendimentos.models import AtendimentoItemExameModel, AtendimentoModel
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.exames.models import ExameModel
from vertere_api.importacao.domain import PlanoImportacao
from vertere_api.importacao.normalizacao import chave_texto, somente_digitos, texto
from vertere_api.pacientes.models import PacienteModel
from vertere_api.veterinarios.models import VeterinarioModel


class PlanoNaoAplicavel(Exception):
    pass


class ColisaoDestino(Exception):
    def __init__(self, entidade: str, identificador: str) -> None:
        self.entidade = entidade
        self.identificador = identificador
        super().__init__(f"{entidade} {identificador} já existe com conteúdo incompatível")


def _igual(modelo: object, esperado: Mapping[str, Any]) -> bool:
    return all(getattr(modelo, campo) == valor for campo, valor in esperado.items())


def _adicionar_ou_validar(
    sessao: Session,
    modelo_tipo: type,
    identificador: str,
    valores: dict[str, Any],
    entidade: str,
    existente_natural: object | None = None,
) -> object:
    if existente_natural is not None and existente_natural.id != identificador:
        raise ColisaoDestino(entidade, identificador)
    existente = sessao.get(modelo_tipo, identificador)
    if existente is not None:
        if not _igual(existente, valores):
            raise ColisaoDestino(entidade, identificador)
        return existente
    modelo = modelo_tipo(id=identificador, **valores)
    sessao.add(modelo)
    return modelo


@dataclass(frozen=True)
class _IndiceDestino:
    clinicas: dict[str, ClinicaModel]
    veterinarios: dict[str, VeterinarioModel]
    pacientes: dict[tuple[str, str, str], PacienteModel]
    exames: dict[tuple[str, str], ExameModel]
    atendimentos: dict[str, AtendimentoModel]


def _indexar(modelos: list[object], chave, entidade: str) -> dict:
    indice = {}
    for modelo in modelos:
        chave_modelo = chave(modelo)
        if chave_modelo in indice:
            raise ColisaoDestino(entidade, str(chave_modelo))
        indice[chave_modelo] = modelo
    return indice


def _indexar_destino(sessao: Session) -> _IndiceDestino:
    return _IndiceDestino(
        clinicas=_indexar(
            list(sessao.scalars(select(ClinicaModel))),
            lambda item: somente_digitos(item.cnpj),
            "Clínica",
        ),
        veterinarios=_indexar(
            list(sessao.scalars(select(VeterinarioModel))),
            lambda item: chave_texto(item.crmv),
            "Veterinário",
        ),
        pacientes=_indexar(
            list(sessao.scalars(select(PacienteModel))),
            lambda item: (
                item.clinica_id,
                chave_texto(item.nome),
                chave_texto(item.proprietario),
            ),
            "Paciente",
        ),
        exames=_indexar(
            list(sessao.scalars(select(ExameModel))),
            lambda item: (chave_texto(item.categoria), chave_texto(item.nome)),
            "Exame",
        ),
        atendimentos=_indexar(
            [
                item
                for item in sessao.scalars(select(AtendimentoModel))
                if item.protocolo_origem is not None
            ],
            lambda item: texto(item.protocolo_origem),
            "Atendimento",
        ),
    )


def aplicar_plano(plano: PlanoImportacao, sessao: Session) -> None:
    """Aplica o plano inteiro ou não aplica nada; aceita reexecução idêntica."""
    if not plano.aplicavel:
        raise PlanoNaoAplicavel("Plano contém erros bloqueantes")

    try:
        indice = _indexar_destino(sessao)
        for clinica in plano.clinicas:
            _adicionar_ou_validar(
                sessao,
                ClinicaModel,
                clinica.id,
                {
                    "nome": clinica.nome,
                    "cnpj": clinica.cnpj,
                    "endereco": clinica.endereco,
                    "telefone": clinica.telefone,
                    "email": clinica.email,
                    "ativo": clinica.ativo,
                    "prazo_pagamento_dias": None,
                },
                "Clínica",
                indice.clinicas.get(somente_digitos(clinica.cnpj)),
            )
        sessao.flush()

        for veterinario in plano.veterinarios:
            _adicionar_ou_validar(
                sessao,
                VeterinarioModel,
                veterinario.id,
                {
                    "nome": veterinario.nome,
                    "crmv": veterinario.crmv,
                    "telefone": veterinario.telefone,
                    "email": veterinario.email,
                    "clinica_id": veterinario.clinica_id,
                    "ativo": veterinario.ativo,
                },
                "Veterinário",
                indice.veterinarios.get(chave_texto(veterinario.crmv)),
            )
        for paciente in plano.pacientes:
            _adicionar_ou_validar(
                sessao,
                PacienteModel,
                paciente.id,
                {
                    "nome": paciente.nome,
                    "especie": paciente.especie,
                    "raca": paciente.raca,
                    "sexo": paciente.sexo,
                    "idade": paciente.idade,
                    "proprietario": paciente.proprietario,
                    "clinica_id": paciente.clinica_id,
                    "ativo": paciente.ativo,
                },
                "Paciente",
                indice.pacientes.get(
                    (
                        paciente.clinica_id,
                        chave_texto(paciente.nome),
                        chave_texto(paciente.proprietario),
                    )
                ),
            )
        for exame in plano.exames:
            _adicionar_ou_validar(
                sessao,
                ExameModel,
                exame.id,
                {
                    "categoria": exame.categoria,
                    "nome": exame.nome,
                    "preco_base": exame.preco_base,
                    "ativo": exame.ativo,
                },
                "Exame",
                indice.exames.get((chave_texto(exame.categoria), chave_texto(exame.nome))),
            )
        sessao.flush()

        for atendimento in plano.atendimentos:
            valores = {
                "clinica_id": atendimento.clinica_id,
                "veterinario_id": atendimento.veterinario_id,
                "paciente_id": atendimento.paciente_id,
                "metodo_coleta": atendimento.metodo_coleta,
                "data_hora": atendimento.data_hora,
                "regra_plantao_id": None,
                "valor_adicional_plantao": atendimento.valor_adicional_plantao,
                "desconto": atendimento.desconto,
                "valor_total": atendimento.valor_total,
                "status": "ativo",
                "numero_origem": atendimento.numero_origem,
                "protocolo_origem": atendimento.protocolo_origem,
            }
            modelo = _adicionar_ou_validar(
                sessao,
                AtendimentoModel,
                atendimento.id,
                valores,
                "Atendimento",
                indice.atendimentos.get(texto(atendimento.protocolo_origem)),
            )
            if modelo.itens_exame:
                item = modelo.itens_exame[0]
                if len(modelo.itens_exame) != 1 or not _igual(
                    item,
                    {
                        "exame_id": atendimento.exame_id,
                        "preco_unitario": atendimento.preco_unitario,
                        "quantidade": 1,
                        "ordem": 0,
                    },
                ):
                    raise ColisaoDestino("Atendimento", atendimento.id)
            else:
                modelo.itens_exame = [
                    AtendimentoItemExameModel(
                        exame_id=atendimento.exame_id,
                        preco_unitario=atendimento.preco_unitario,
                        quantidade=1,
                        ordem=0,
                    )
                ]

        sessao.commit()
    except IntegrityError as erro:
        sessao.rollback()
        raise ColisaoDestino("Banco de destino", "restrição de integridade") from erro
    except Exception:
        sessao.rollback()
        raise
