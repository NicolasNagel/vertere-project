from fastapi import FastAPI

from vertere_api.auth.router import router as auth_router
from vertere_api.auth.usuarios_router import router as usuarios_router
from vertere_api.clinicas.router import router as clinicas_router
from vertere_api.veterinarios.router import router as veterinarios_router
from vertere_api.pacientes.router import router as pacientes_router
from vertere_api.exames.router import router_exames, router_regras_plantao
from vertere_api.atendimentos.router import router as atendimentos_router
from vertere_api.laudos.router import router_laudos, router_templates_laudo
from vertere_api.financeiro.router import router as financeiro_router
from vertere_api.portal.router import router as portal_router

app = FastAPI(title="Vertere Lab API")
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(clinicas_router)
app.include_router(veterinarios_router)
app.include_router(pacientes_router)
app.include_router(router_exames)
app.include_router(router_regras_plantao)
app.include_router(atendimentos_router)
app.include_router(router_templates_laudo)
app.include_router(router_laudos)
app.include_router(financeiro_router)
app.include_router(portal_router)
