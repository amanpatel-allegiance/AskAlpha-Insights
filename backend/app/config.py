from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database — accept either a full URL or individual components
    database_url: str = ""
    db_host: str = ""
    db_port: int = 5432
    db_user: str = ""
    db_password: str = ""
    db_name: str = "postgres"

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"

    # Cost rates (USD)
    chat_cost_per_message: float = 0.002
    avatar_video_cost: float = 0.50
    cinematic_video_cost: float = 1.20
    studio_job_cost: float = 0.25

    # AWS Bedrock
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    bedrock_model_id: str = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        if self.db_host:
            return (
                f"postgresql://{self.db_user}:{self.db_password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            )
        return ""

    @property
    def bedrock_enabled(self) -> bool:
        return bool(self.aws_access_key_id and self.aws_secret_access_key)


settings = Settings()
