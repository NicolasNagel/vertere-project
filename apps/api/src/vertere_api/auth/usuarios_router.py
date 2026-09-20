from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from vertere_api.auth.deps import exigir_admin, obter_db
from vertere_api.auth.domain import Usuario
from vertere_api.auth.repository import SQLAlchemyUsuarioRepository
from vertere_api.auth.schemas import (
    CriarUsuarioRequest,
    EditarPapelRequest,
    ResetarSenhaRequest,
    UsuarioResponse,
)
from vertere_api.auth.usuarios_service import (
    EmailJaCadastrado,
    UsuarioNaoEncontrado,
    criar_usuario,
    desativar_usuario,
    editar_papel,
    reativar_usuario,
    resetar_senha,
)

router = APIRouter(prefix="/usuarios", tags=["usuarios"], dependencies=[Depends(exigir_admin)])
"""Todas as rotas deste router são admin-only (`exigir_admin` no router inteiro,
não repetido rota a rota) — cadastro/gestão de usuário é uma operação
administrativa (spec S1, stories 1-4, 9)."""


def _para_response(usuario: Usuario) -> UsuarioResponse:
    return UsuarioResponse(
        id=usuario.id,
        email=usuario.email,
        papel=usuario.papel,
        ativo=usuario.ativo,
        clinica_id=usuario.clinica_id,
    )


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar(dados: CriarUsuarioRequest, db: Session = Depends(obter_db)) -> UsuarioResponse:
    repo = SQLAlchemyUsuarioRepository(db)
    try:
        usuario = criar_usuario(
            email=dados.email,
            senha=dados.senha,
            papel=dados.papel,
            repo=repo,
            clinica_id=dados.clinica_id,
        )
    except EmailJaCadastrado as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, str(erro)) from erro
    return _para_response(usuario)


@router.patch("/{usuario_id}/papel", response_model=UsuarioResponse)
def alterar_papel(
    usuario_id: str, dados: EditarPapelRequest, db: Session = Depends(obter_db)
) -> UsuarioResponse:
    repo = SQLAlchemyUsuarioRepository(db)
    try:
        usuario = editar_papel(usuario_id, dados.papel, repo)
    except UsuarioNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(usuario)


@router.post("/{usuario_id}/desativar", response_model=UsuarioResponse)
def desativar(usuario_id: str, db: Session = Depends(obter_db)) -> UsuarioResponse:
    repo = SQLAlchemyUsuarioRepository(db)
    try:
        usuario = desativar_usuario(usuario_id, repo)
    except UsuarioNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(usuario)


@router.post("/{usuario_id}/reativar", response_model=UsuarioResponse)
def reativar(usuario_id: str, db: Session = Depends(obter_db)) -> UsuarioResponse:
    repo = SQLAlchemyUsuarioRepository(db)
    try:
        usuario = reativar_usuario(usuario_id, repo)
    except UsuarioNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(usuario)


@router.post("/{usuario_id}/resetar-senha", response_model=UsuarioResponse)
def resetar(
    usuario_id: str, dados: ResetarSenhaRequest, db: Session = Depends(obter_db)
) -> UsuarioResponse:
    repo = SQLAlchemyUsuarioRepository(db)
    try:
        usuario = resetar_senha(usuario_id, dados.nova_senha, repo)
    except UsuarioNaoEncontrado as erro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(erro)) from erro
    return _para_response(usuario)
