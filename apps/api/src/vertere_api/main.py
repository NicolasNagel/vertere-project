from fastapi import FastAPI

from vertere_api.auth.router import router as auth_router
from vertere_api.auth.usuarios_router import router as usuarios_router
from vertere_api.clinicas.router import router as clinicas_router

app = FastAPI(title="Vertere Lab API")
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(clinicas_router)
