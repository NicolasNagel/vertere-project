from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from vertere_api.atendimentos.models import AtendimentoModel
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.db import Base
from vertere_api.exames.models import ExameModel
from vertere_api.importacao.domain import (
    AtendimentoPlanejado,
    ClinicaPlanejada,
    ContadoresImportacao,
    ExamePlanejado,
    PacientePlanejado,
    PlanoImportacao,
    VeterinarioPlanejado,
)
from vertere_api.importacao.repository import ColisaoDestino, aplicar_plano
from vertere_api.pacientes.models import PacienteModel
from vertere_api.veterinarios.models import VeterinarioModel


@pytest.fixture
def session() -> Session:
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def _plano() -> PlanoImportacao:
    return PlanoImportacao(
        clinicas=(
            ClinicaPlanejada("clinica-1", "Clínica A", "12345678000190", "Rua A", "", "", True),
        ),
        veterinarios=(
            VeterinarioPlanejado("vet-1", "Dra. Ana", "12345", "", "", "clinica-1", True),
        ),
        pacientes=(
            PacientePlanejado("pac-1", "Tobias", "Canino", "SRD", "Macho", 4, "José", "clinica-1"),
        ),
        exames=(
            ExamePlanejado("exame-1", "Hematológicos", "Hemograma", Decimal("50.00")),
        ),
        atendimentos=(
            AtendimentoPlanejado(
                id="atendimento-1",
                clinica_id="clinica-1",
                veterinario_id="vet-1",
                paciente_id="pac-1",
                exame_id="exame-1",
                preco_unitario=Decimal("50.00"),
                metodo_coleta="Motoboy",
                data_hora=datetime(2026, 1, 10, 10, 0),
                valor_adicional_plantao=Decimal("0"),
                desconto=Decimal("0"),
                valor_total=Decimal("50.00"),
                numero_origem="1",
                protocolo_origem="PROTO-1",
            ),
        ),
        contadores=ContadoresImportacao(1, 1, 1, 1, 1),
    )


def _quantidade(session: Session, modelo: type) -> int:
    return session.scalar(select(func.count()).select_from(modelo))


def test_aplica_plano_e_reexecuta_sem_duplicar(session: Session) -> None:
    plano = _plano()

    aplicar_plano(plano, session)
    aplicar_plano(plano, session)

    assert _quantidade(session, ClinicaModel) == 1
    assert _quantidade(session, VeterinarioModel) == 1
    assert _quantidade(session, PacienteModel) == 1
    assert _quantidade(session, ExameModel) == 1
    assert _quantidade(session, AtendimentoModel) == 1
    atendimento = session.get(AtendimentoModel, "atendimento-1")
    assert atendimento.protocolo_origem == "PROTO-1"
    assert atendimento.itens_exame[0].preco_unitario == Decimal("50.00")


def test_colisao_faz_rollback_de_toda_a_aplicacao(session: Session) -> None:
    session.add(
        ClinicaModel(
            id="clinica-1",
            nome="Conteúdo incompatível",
            cnpj="99999999000199",
            endereco="",
            telefone="",
            email="",
            ativo=True,
        )
    )
    session.commit()

    plano = _plano()
    plano = PlanoImportacao(
        clinicas=(
            ClinicaPlanejada("clinica-nova", "Nova", "11111111000111", "", "", "", True),
            *plano.clinicas,
        ),
        veterinarios=plano.veterinarios,
        pacientes=plano.pacientes,
        exames=plano.exames,
        atendimentos=plano.atendimentos,
        contadores=plano.contadores,
    )

    with pytest.raises(ColisaoDestino):
        aplicar_plano(plano, session)

    assert session.get(ClinicaModel, "clinica-nova") is None
    assert _quantidade(session, VeterinarioModel) == 0
