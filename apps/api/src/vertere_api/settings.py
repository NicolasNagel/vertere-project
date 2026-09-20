from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://vertere:vertere@localhost:5434/vertere"
    jwt_secret: str = "dev-secret-troque-em-producao-min-32-bytes-aaaa"

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_usuario: str | None = None
    smtp_senha: str | None = None
    smtp_remetente: str = "laudos@vertere.lab"


settings = Settings()
