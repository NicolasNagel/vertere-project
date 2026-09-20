from fastapi import FastAPI

from vertere_api.auth.router import router as auth_router
from vertere_api.auth.usuarios_router import router as usuarios_router
from vertere_api.clinicas.router import router as clinicas_router
from vertere_api.veterinarios.router import router as veterinarios_router
from vertere_api.pacientes.router import router as pacientes_router
from vertere_api.exames.router import router_exames, router_regras_plantao

app = FastAPI(title="Vertere Lab API")
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(clinicas_router)
app.include_router(veterinarios_router)
app.include_router(pacientes_router)
app.include_router(router_exames)
app.include_router(router_regras_plantao)
