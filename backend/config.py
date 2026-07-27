from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    omnirouter_api_key: str
    omnirouter_base_url: str = "https://api.omnirouter.ai/v1"
    supabase_url: str
    supabase_key: str
    poll_interval_seconds: int = 2

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()