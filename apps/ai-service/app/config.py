from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "postgres://marketforge:marketforge@postgres:5432/marketforge"
    commerce_url: str = "http://commerce-go:8080"
    order_service_url: str = "http://order-service:8080"
    llm_provider: str = "openai"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
