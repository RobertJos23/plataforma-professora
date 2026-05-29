from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── App ──────────────────────────────────────────────
    APP_NAME: str = "Plataforma Professora"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ─── Banco de Dados ───────────────────────────────────
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # ─── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ─── CORS ─────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # ─── AWS ──────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = "plataforma-professora-files"
    AWS_CLOUDFRONT_URL: str = ""

    # ─── SES ──────────────────────────────────────────────
    AWS_SES_SENDER: str = ""
    AWS_SES_REGION: str = "us-east-1"

    # ─── IA ───────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    AI_PROVIDER: str = "anthropic"
    AI_MODEL: str = "claude-sonnet-4-6"

    # ─── Pagamentos ───────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    PAGARME_API_KEY: str = ""

    # ─── N8N ──────────────────────────────────────────────
    N8N_WEBHOOK_URL: str = ""
    N8N_API_KEY: str = ""

    # ─── Google ───────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ─── Zoom ─────────────────────────────────────────────
    ZOOM_API_KEY: str = ""
    ZOOM_API_SECRET: str = ""

    # ─── Frontend ─────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


settings = Settings()
