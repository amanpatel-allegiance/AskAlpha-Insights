import asyncpg
from app.config import settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.resolved_database_url,
            min_size=1,
            max_size=5,
            command_timeout=30,
            statement_cache_size=0,  # required for Supabase transaction-mode pooler
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
