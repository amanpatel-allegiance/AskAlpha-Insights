from datetime import datetime, timedelta, timezone


def parse_range(range_str: str) -> tuple[datetime, datetime]:
    """Return (start, end) UTC datetimes for the requested range string."""
    now = datetime.now(timezone.utc)
    range_str = range_str.strip().lower()

    if range_str == "1d":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range_str == "7d":
        start = now - timedelta(days=7)
    elif range_str == "30d":
        start = now - timedelta(days=30)
    elif range_str == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now - timedelta(days=7)

    return start, now


def previous_period(start: datetime, end: datetime) -> tuple[datetime, datetime]:
    """Return the equivalent previous period for delta calculation."""
    duration = end - start
    return start - duration, start
