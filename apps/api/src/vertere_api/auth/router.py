from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from vertere_api.auth.deps import exigir_acao, obter_db, obter_usuario_atual
from vertere_api.auth.domain import Usuario
from vertere_api.auth.repository import SQLAlchemyUsuarioRepository
from vertere_api.auth.schemas import LoginRequest, LoginResponse, UsuarioResponse
from vertere_api.auth.service import Acao, AutenticacaoInvalida, authenticate
from vertere_api.auth.sessoes_store import criar_sessao
from vertere_api.auth.tokens import codificar_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(dados: LoginRequest, db: Session = Depends(obter_db)) -> LoginResponse:
    repo = SQLAlchemyUsuarioRepository(db)
    try:
        usuario = authenticate(dados.email, dados.senha, repo)
    except AutenticacaoInvalida as erro:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(erro)) from erro

    sid = criar_sessao(usuario.id)
    return LoginResponse(access_token=codificar_token(sid))


def _para_response(usuario: Usuario) -> UsuarioResponse:
    return UsuarioResponse(
        id=usuario.id,
        email=usuario.email,
        papel=usuario.papel,
        ativo=usuario.ativo,
        clinica_id=usuario.clinica_id,
    )


@router.get("/me", response_model=UsuarioResponse)
def me(usuario: Usuario = Depends(obter_usuario_atual)) -> UsuarioResponse:
    return _para_response(usuario)


@router.get("/financeiro-demo", response_model=UsuarioResponse)
def financeiro_demo(
    usuario: Usuario = Depends(exigir_acao(Acao.FINANCEIRO_VER)),
) -> UsuarioResponse:
    """Rota de demonstração: só existe para provar, via HTTP real, que
    `exigir_acao` bloqueia papéis sem a ação (stories 10/11 da spec S1).
    Módulos futuros (Fechamento) usam o mesmo padrão `Depends(exigir_acao(...))`
    em rotas reais, não nesta."""
    return _para_response(usuario)
