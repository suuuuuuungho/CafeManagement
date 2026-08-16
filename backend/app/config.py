from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Local dev default: SQLite file. Point DATABASE_URL at Neon's Postgres
    # connection string (postgresql+asyncpg://...) for staging/production.
    database_url: str = "sqlite+aiosqlite:///./cafe.db"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Comma-separated list of allowed frontend origins (GitHub Pages URL, localhost dev server).
    cors_origins: str = "http://localhost:5173"

    # Match order to a pending order within this many minutes of it being created.
    deposit_match_window_minutes: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
