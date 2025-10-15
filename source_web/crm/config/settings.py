"""Configuration settings for CRM Service."""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application settings
    APP_NAME: str = "Prelude CRM Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8003
    
    # Database settings
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    SESSIONS_DB_HOST: str = os.getenv("SESSIONS_DB_HOST", "35.193.231.128")
    SESSIONS_DB_PORT: int = int(os.getenv("SESSIONS_DB_PORT", "5432"))
    SESSIONS_DB_USER: str = os.getenv("SESSIONS_DB_USER", "postgres")
    SESSIONS_DB_PASSWORD: str = os.getenv("SESSIONS_DB_PASSWORD", "llLCr(({L_{81c2A")
    SESSIONS_DB_NAME: str = os.getenv("SESSIONS_DB_NAME", "prelude_backend")
    
    # Auth settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "test_client_id")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "test_client_secret")
    MICROSOFT_CLIENT_ID: Optional[str] = os.getenv("MICROSOFT_CLIENT_ID")
    MICROSOFT_CLIENT_SECRET: Optional[str] = os.getenv("MICROSOFT_CLIENT_SECRET")
    MICROSOFT_TENANT_ID: Optional[str] = os.getenv("MICROSOFT_TENANT_ID", "common")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "test_jwt_secret_key_for_development_only")
    
    # AI settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    LITELLM_PARAMS: Optional[str] = os.getenv("LITELLM_PARAMS")

    # Agent settings
    DEFAULT_PROVIDER: str = os.getenv("DEFAULT_PROVIDER", "gemini")
    DEFAULT_GEMINI_MODEL: str = os.getenv("DEFAULT_GEMINI_MODEL", "gemini-1.5-flash")
    DEFAULT_OPENAI_MODEL: str = os.getenv("DEFAULT_OPENAI_MODEL", "gpt-4o-mini")
    
    # Gmail settings
    GMAIL_API_CREDENTIALS: Optional[str] = os.getenv("GMAIL_API_CREDENTIALS")

    # Google Workspace settings
    GOOGLE_SERVICE_ACCOUNT_PATH: Optional[str] = os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH")
    GOOGLE_WORKSPACE_DOMAIN: Optional[str] = os.getenv("GOOGLE_WORKSPACE_DOMAIN")

    # CORS settings
    CORS_ORIGINS: list = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["*"]
    CORS_ALLOW_HEADERS: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()