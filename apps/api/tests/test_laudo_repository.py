from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from vertere_api.atendimentos.domain import Atendimento, ItemExame, StatusAtendimento
from vertere_api.atendimentos.models import AtendimentoItemExameModel, AtendimentoModel
from vertere_api.atendimentos.repository import SQLAlchemyAtendimentoRepository
from vertere_api.clinicas.domain import Clinica
from vertere_api.clinicas.models import ClinicaModel
from vertere_api.clinicas.repository import SQLAlchemyClinicaRepository
from vertere_api.db import Base, engine, get_session
from vertere_api.exames.domain import Exame
from vertere_api.exames.models import ExameModel
from vertere_api.exames.repository import SQLAlchemyExameRepository
from vertere_api.laudos.domain import CampoTemplate, Laudo, StatusLaudo, TemplateLaudo, ValorCampo
from vertere_api.laudos.models import LaudoModel, TemplateLaudoModel
from vertere_api.laudos.repository import SQLAlchemyLaudoRepository, SQLAlchemyTemplateLaudoRepository
from vertere_api.pacientes.domain import Paciente
from vertere_api.pacientes.models import PacienteModel
from vertere_api.pacientes.repository import SQLAlchemyPacienteRepository
from vertere_api.veterinarios.domain import Veterinario
from vertere_api.veterinarios.models import VeterinarioModel
from vertere_api.veterinarios.repository import SQLAlchemyVeterinarioRepository


@pytest.fixture(autouse=True)
def _tabela_limpa():
    Base.metadata.create_all(engine)
    session = get_session()
    session.query(LaudoModel).delete()
    session.query(TemplateLaudoModel).delete()
    session.query(AtendimentoItemExameModel).delete()
    session.query(AtendimentoModel).delete()
    session.query(ExameModel).delete()
    session.query(PacienteModel).delete()
    session.query(VeterinarioModel).delete()
    session.query(ClinicaModel).delete()
    session.commit()
    session.close()
    yield
    session = get_session()
    session.query(LaudoModel).delete()
    session.query(TemplateLaudoModel).delete()
    session.query(AtendimentoItemExameModel).delete()
    session.query(AtendimentoModel).delete()
    session.query(ExameModel).delete()
    session.query(PacienteModel).delete()
    session.query(VeterinarioModel).delete()
    session.query(ClinicaModel).delete()
    session.commit()
    session.close()


@pytest.fixture
def session() -> Session:
    session = get_session()
    yield session
    session.close()


@pytest.fixture
def clinica(session: Session) -> Clinica:
    clinica = Clinica(
        id="clinica-1",
        nome="Clínica Central",
        cnpj="11222333000181",
        endereco="Rua A, 123",
        telefone="4730001111",
        email="contato@central.com",
        ativo=True,
    )
    SQLAlchemyClinicaRepository(session).salvar(clinica)
    return clinica


@pytest.fixture
def veterinario(session: Session, clinica: Clinica) -> Veterinario:
    veterinario = Veterinario(
        id="vet-1",
        nome="Dr. João",
        crmv="SC-1234",
        telefone="47988880000",
        email="joao@clinica.com",
        clinica_id=clinica.id,
        ativo=True,
    )
    SQLAlchemyVeterinarioRepository(session).salvar(veterinario)
    return veterinario


@pytest.fixture
def paciente(session: Session, clinica: Clinica) -> Paciente:
    paciente = Paciente(
        id="paciente-1",
        nome="Rex",
        especie="Canina",
        raca="SRD",
        sexo="M",
        idade=3,
        proprietario="Maria",
        clinica_id=clinica.id,
        ativo=True,
    )
    SQLAlchemyPacienteRepository(session).salvar(paciente)
    return paciente


@pytest.fixture
def exame(session: Session) -> Exame:
    exame = Exame(
        id="exame-1", categoria="Hematologia", nome="Hemograma", preco_base=Decimal("45.00"), ativo=True
    )
    SQLAlchemyExameRepository(session).salvar(exame)
    return exame


@pytest.fixture
def atendimento(
    session: Session, clinica: Clinica, veterinario: Veterinario, paciente: Paciente, exame: Exame
) -> Atendimento:
    atendimento = Atendimento(
        id="atendimento-1",
        clinica_id=clinica.id,
        veterinario_id=veterinario.id,
        paciente_id=paciente.id,
        itens_exame=[ItemExame(exame_id=exame.id, preco_unitario=Decimal("45.00"), quantidade=1)],
        metodo_coleta="Punção venosa",
        data_hora=datetime(2026, 9, 23, 13, 0),
        regra_plantao_id=None,
        valor_adicional_plantao=Decimal("0"),
        desconto=Decimal("0"),
        valor_total=Decimal("45.00"),
        status=StatusAtendimento.ATIVO,
    )
    SQLAlchemyAtendimentoRepository(session).salvar(atendimento)
    return atendimento


@pytest.fixture
def template(session: Session) -> TemplateLaudo:
    template = TemplateLaudo(
        id="tpl-1",
        categoria="Hematologia",
        campos=[CampoTemplate(nome="Hemácias", unidade="milhões/µL", faixa_referencia="5.5 – 8.5")],
        ativo=True,
    )
    SQLAlchemyTemplateLaudoRepository(session).salvar(template)
    return template


def _laudo(atendimento: Atendimento, exame: Exame, template: TemplateLaudo) -> Laudo:
    return Laudo(
        id="laudo-1",
        atendimento_id=atendimento.id,
        exame_id=exame.id,
        template_id=template.id,
        valores=[ValorCampo(nome_campo="Hemácias", valor="7.2")],
        status=StatusLaudo.RASCUNHO,
        criado_por="usuario-1",
        criado_em=datetime(2026, 9, 23, 14, 0),
    )


class TestSQLAlchemyLaudoRepository:
    def test_busca_laudo_inexistente_retorna_none(self, session: Session) -> None:
        repo = SQLAlchemyLaudoRepository(session)

        assert repo.buscar_por_id("inexistente") is None

    def test_salvar_insere_e_buscar_por_id_encontra(
        self, session: Session, atendimento: Atendimento, exame: Exame, template: TemplateLaudo
    ) -> None:
        repo = SQLAlchemyLaudoRepository(session)
        laudo = _laudo(atendimento, exame, template)

        repo.salvar(laudo)
        encontrado = repo.buscar_por_id("laudo-1")

        assert encontrado == laudo

    def test_salvar_atualiza_laudo_existente_em_vez_de_duplicar(
        self, session: Session, atendimento: Atendimento, exame: Exame, template: TemplateLaudo
    ) -> None:
        repo = SQLAlchemyLaudoRepository(session)
        repo.salvar(_laudo(atendimento, exame, template))

        from dataclasses import replace

        atualizado = replace(
            _laudo(atendimento, exame, template),
            status=StatusLaudo.FINALIZADO,
            finalizado_por="usuario-1",
            finalizado_em=datetime(2026, 9, 23, 15, 0),
            enviado_em=datetime(2026, 9, 23, 15, 0),
        )
        repo.salvar(atualizado)

        encontrado = repo.buscar_por_id("laudo-1")
        assert encontrado.status == StatusLaudo.FINALIZADO
        assert encontrado.enviado_em is not None
        assert session.query(LaudoModel).count() == 1

    def test_listar_todas_retorna_laudos_persistidos(
        self, session: Session, atendimento: Atendimento, exame: Exame, template: TemplateLaudo
    ) -> None:
        repo = SQLAlchemyLaudoRepository(session)
        repo.salvar(_laudo(atendimento, exame, template))

        assert len(repo.listar_todas()) == 1
