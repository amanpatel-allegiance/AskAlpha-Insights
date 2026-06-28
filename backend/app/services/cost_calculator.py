"""
Cost calculator for AskAlpha usage.

Rates are configured via environment variables. When real token/cost logs
are added to the database (e.g. an llm_usage_log table), replace the
estimate methods with direct DB aggregations.
"""
from app.config import settings


class CostCalculator:
    def __init__(self) -> None:
        self.chat_rate = settings.chat_cost_per_message
        self.avatar_rate = settings.avatar_video_cost
        self.cinematic_rate = settings.cinematic_video_cost
        self.studio_rate = settings.studio_job_cost

    def estimate(
        self,
        chat_count: int,
        avatar_count: int,
        cinematic_count: int,
        studio_count: int,
    ) -> float:
        total = (
            chat_count * self.chat_rate
            + avatar_count * self.avatar_rate
            + cinematic_count * self.cinematic_rate
            + studio_count * self.studio_rate
        )
        return round(total, 4)


cost_calculator = CostCalculator()
