from fastapi import FastAPI

from vertere_api.auth.router import router as auth_router

app = FastAPI(title="Vertere Lab API")
app.include_router(auth_router)
