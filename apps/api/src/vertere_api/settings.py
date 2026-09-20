from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://vertere:vertere@localhost:5434/vertere"
    jwt_secret: str = "dev-secret-troque-em-producao-min-32-bytes-aaaa"


settings = Settings()
