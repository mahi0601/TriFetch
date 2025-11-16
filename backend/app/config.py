from typing import Optional
import os


class Settings:
    data_path: str = os.getenv("DATA_PATH", "./data")
    model_path: Optional[str] = os.getenv("MODEL_PATH", None)
    sampling_rate: int = int(os.getenv("SAMPLING_RATE", "200"))
    chunk_duration_seconds: int = int(os.getenv("CHUNK_DURATION_SECONDS", "30"))
    total_duration_seconds: int = int(os.getenv("TOTAL_DURATION_SECONDS", "90"))


settings = Settings()

