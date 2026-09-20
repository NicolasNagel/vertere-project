from sqlalchemy.orm import Session

from vertere_api.pacientes.domain import Paciente
from vertere_api.pacientes.models import PacienteModel


class SQLAlchemyPacienteRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def buscar_por_id(self, paciente_id: str) -> Paciente | None:
        modelo = self._session.get(PacienteModel, paciente_id)
        return self._para_dominio(modelo)

    def listar_todas(self) -> list[Paciente]:
        modelos = self._session.query(PacienteModel).all()
        return [self._para_dominio(m) for m in modelos]

    def salvar(self, paciente: Paciente) -> None:
        modelo = self._session.get(PacienteModel, paciente.id)
        if modelo is None:
            modelo = PacienteModel(id=paciente.id)
            self._session.add(modelo)
        modelo.nome = paciente.nome
        modelo.especie = paciente.especie
        modelo.raca = paciente.raca
        modelo.sexo = paciente.sexo
        modelo.idade = paciente.idade
        modelo.proprietario = paciente.proprietario
        modelo.clinica_id = paciente.clinica_id
        modelo.ativo = paciente.ativo
        self._session.commit()

    @staticmethod
    def _para_dominio(modelo: PacienteModel | None) -> Paciente | None:
        if modelo is None:
            return None
        return Paciente(
            id=modelo.id,
            nome=modelo.nome,
            especie=modelo.especie,
            raca=modelo.raca,
            sexo=modelo.sexo,
            idade=modelo.idade,
            proprietario=modelo.proprietario,
            clinica_id=modelo.clinica_id,
            ativo=modelo.ativo,
        )
