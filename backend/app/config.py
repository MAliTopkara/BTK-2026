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

    # Email (Resend)
    resend_api_key: str = ""

    # App
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def allowed_origins(self) -> list[str]:
        """CORS allowed origins — always includes frontend_url."""
        origins = {self.frontend_url}
        # Production: Vercel preview URLs + canonical
        if self.is_production:
            origins.update([
                "https://btk-2026.vercel.app",
                "https://www.btk-2026.vercel.app",
            ])
        else:
            origins.update([
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ])
        return list(origins)


settings = Settings()
