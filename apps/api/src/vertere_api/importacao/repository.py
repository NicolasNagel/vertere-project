from collections.abc import Mapping
from typing import Any

from sqlalchemy.orm import Session

from vertere_api.atendimentos.models import AtendimentoItemExameModel, AtendimentoModel
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.exames.models import ExameModel
from vertere_api.importacao.domain import PlanoImportacao
from vertere_api.pacientes.models import PacienteModel
from vertere_api.veterinarios.models import VeterinarioModel


class PlanoNaoAplicavel(Exception):
    pass


class ColisaoDestino(Exception):
    def __init__(self, entidade: str, identificador: str) -> None:
        super().__init__(f"{entidade} {identificador} já existe com conteúdo incompatível")


def _igual(modelo: object, esperado: Mapping[str, Any]) -> bool:
    return all(getattr(modelo, campo) == valor for campo, valor in esperado.items())


def _adicionar_ou_validar(
    session: Session,
    modelo_tipo: type,
    identificador: str,
    valores: dict[str, Any],
    entidade: str,
) -> object:
    existente = session.get(modelo_tipo, identificador)
    if existente is not None:
        if not _igual(existente, valores):
            raise ColisaoDestino(entidade, identificador)
        return existente
    modelo = modelo_tipo(id=identificador, **valores)
    session.add(modelo)
    return modelo


def aplicar_plano(plano: PlanoImportacao, session: Session) -> None:
    """Aplica o plano inteiro ou não aplica nada; aceita reexecução idêntica."""
    if not plano.aplicavel:
        raise PlanoNaoAplicavel("Plano contém erros bloqueantes")

    try:
        for clinica in plano.clinicas:
            _adicionar_ou_validar(
                session,
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
            )
        session.flush()

        for veterinario in plano.veterinarios:
            _adicionar_ou_validar(
                session,
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
            )
        for paciente in plano.pacientes:
            _adicionar_ou_validar(
                session,
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
            )
        for exame in plano.exames:
            _adicionar_ou_validar(
                session,
                ExameModel,
                exame.id,
                {
                    "categoria": exame.categoria,
                    "nome": exame.nome,
                    "preco_base": exame.preco_base,
                    "ativo": exame.ativo,
                },
                "Exame",
            )
        session.flush()

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
                session,
                AtendimentoModel,
                atendimento.id,
                valores,
                "Atendimento",
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

        session.commit()
    except Exception:
        session.rollback()
        raise
