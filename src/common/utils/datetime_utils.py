from datetime import datetime
from zoneinfo import ZoneInfo


VIETNAM_TZ = ZoneInfo("Asia/Ho_Chi_Minh")


def normalize_to_vietnam_time(value: str | None) -> tuple[str | None, str | None]:
    if not value:
        return None, None

    normalized = value.strip()
    if not normalized:
        return None, None

    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        dt = datetime.fromisoformat(normalized)
    except ValueError:
        return value, value

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=VIETNAM_TZ)
    else:
        dt = dt.astimezone(VIETNAM_TZ)

    return dt.isoformat(), dt.strftime("%d/%m/%Y %H:%M:%S ICT")
