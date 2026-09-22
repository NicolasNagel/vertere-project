from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from vertere_api.auth.domain import Papel, Usuario
from vertere_api.auth.repository import SQLAlchemyUsuarioRepository
from vertere_api.auth.service import Acao, authorize
from vertere_api.auth.sessoes_store import tocar_sessao
from vertere_api.auth.tokens import TokenInvalido, decodificar_token
from vertere_api.db import get_session

_bearer = HTTPBearer(auto_error=False)


def obter_db() -> Generator[Session, None, None]:
    session = get_session()
    try:
        yield session
    finally:
        session.close()


def obter_usuario_atual(
    credenciais: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(obter_db),
) -> Usuario:
    """Resolve o usuário autenticado a partir do Bearer token.

    Falha com 401 para token ausente, inválido, ou sessão expirada/encerrada
    (`tocar_sessao` também renova a sessão em caso de sucesso).
    """
    if credenciais is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Não autenticado")
    try:
        sid = decodificar_token(credenciais.credentials)
    except TokenInvalido as erro:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida") from erro

    usuario_id = tocar_sessao(sid)
    if usuario_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada")

    repo = SQLAlchemyUsuarioRepository(db)
    usuario = repo.buscar_por_id(usuario_id)
    if usuario is None or not usuario.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida")
    return usuario


def exigir_acao(acao: Acao):
    """Dependency factory: 403 se `authorize(papel_do_usuario, acao)` negar.

    Ponto único de enforcement HTTP — qualquer rota protegida usa isto em vez
    de reimplementar checagem de papel.

    Para ações com escopo de clínica (`_ACOES_COM_ESCOPO_DE_CLINICA` em
    `auth/service.py`), este gate roda antes do corpo do endpoint e não
    conhece a clínica de um recurso específico — por isso sempre libera um
    usuário `clinica` que tenha a ação concedida (passa a própria clínica do
    usuário como `clinica_recurso`, que sempre bate consigo mesma). Isso é
    seguro para um endpoint de **listagem**, desde que o service
    correspondente filtre o resultado pela clínica do usuário autenticado
    (padrão usado em `atendimentos.service.listar_atendimentos`,
    `pacientes.service.listar_pacientes`/`buscar_pacientes` e
    `laudos.service.listar_laudos`). **Não é seguro** para um endpoint de
    recurso único (GET por id): nesse caso não use `exigir_acao` como gate —
    autentique com `obter_usuario_atual` e chame `authorize()` diretamente
    depois de carregar o recurso, passando o `clinica_recurso` real (ver
    `laudos.service.ver_laudo`).
    """

    def verificar(usuario: Usuario = Depends(obter_usuario_atual)) -> Usuario:
        if not authorize(
            usuario.papel,
            acao,
            clinica_usuario=usuario.clinica_id,
            clinica_recurso=usuario.clinica_id,
        ):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Não autorizado")
        return usuario

    return verificar


def exigir_admin(usuario: Usuario = Depends(obter_usuario_atual)) -> Usuario:
    """Atalho para rotas restritas ao papel admin (gestão de usuários)."""
    if usuario.papel is not Papel.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Restrito a administradores")
    return usuario


def exigir_papel_clinica(usuario: Usuario = Depends(obter_usuario_atual)) -> Usuario:
    """Atalho para rotas restritas ao papel clínica (namespace `/portal/*`, S9)."""
    if usuario.papel is not Papel.CLINICA:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Restrito a usuários do tipo clínica")
    return usuario
