"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Sentinel Scanner application settings."""

    # Database
    database_path: str = "./sentinel.db"

    # Auth
    secret_key: str = "change-me-to-a-random-32-char-string"
    access_token_expire_hours: int = 24
    algorithm: str = "HS256"

    # Alchemy (Ethereum RPC)
    alchemy_api_key: str = ""
    etherscan_api_key: str = ""

    # CoinGecko
    coingecko_api_key: str = ""

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # Environment
    environment: str = "development"

    # Rate limits
    anon_rate_limit: int = 10  # per minute per IP
    free_rate_limit: int = 30  # per minute for free tier
    pro_rate_limit: int = 100  # per minute for pro tier

    # Scan limits per month
    free_scan_limit: int = 2
    pro_scan_limit: int = 500
    api_scan_limit: int = 5000

    # Alchemy cache TTL (seconds)
    alchemy_cache_ttl: int = 300  # 5 minutes

    # ETH price fallback (USD)
    eth_price_fallback: float = 3000.0

    # ── LLM Providers (cascade: try in order until one works) ──
    # NVIDIA NIM (free tier: https://build.nvidia.com)
    nvidia_nim_api_key: str = ""
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_nim_model: str = "meta/llama-3.3-70b-instruct"

    # OpenRouter (free models: https://openrouter.ai)
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "meta-llama/llama-3.1-70b-instruct:free"

    # Groq (free tier: https://console.groq.com)
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.3-70b-versatile"

    # Anthropic (premium — use after revenue)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # GoPlus Security API (free, no key required)
    goplus_enabled: bool = True

    # Etherscan (free tier: 5 calls/sec)
    etherscan_enabled: bool = True

    # Forta Network (GitHub static datasets)
    forta_labels_enabled: bool = True

    # Blockchair (optional — needs free API key)
    blockchair_api_key: str = ""

    # Upstash Serverless Redis Cache (optional)
    redis_url: str = ""
    redis_token: str = ""

    # Supabase Settings (optional)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Darklist Integration (GitHub)
    mew_darklist_url: str = "https://raw.githubusercontent.com/MyEtherWallet/ethereum-lists/master/src/addresses/addresses-darklist.json"

    @property
    def alchemy_url(self) -> str:
        return f"https://eth-mainnet.g.alchemy.com/v2/{self.alchemy_api_key}"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
