from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Google Gemini
    gemini_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # App
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
