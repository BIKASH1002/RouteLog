"""
Split an HOS segment timeline into per-day ELD log sheets.
Pads first and last days to a full 24-hour period with off-duty
entries so every sheet totals exactly 24.00 hours (FMCSA 395.8).
"""
from collections import OrderedDict
from datetime import datetime, time as dtime, timedelta, timezone

ROWS = ["off_duty", "sleeper", "driving", "on_duty_not_driving"]


def _to_aware_utc(dt: datetime) -> datetime:
    """Normalize a datetime to UTC-aware. Naive input is assumed UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _parse_dt(value: str) -> datetime:
    """Parse ISO 8601, tolerating 'Z' on older Python versions."""
    s = str(value).replace("Z", "+00:00")
    return _to_aware_utc(datetime.fromisoformat(s))


def _midnight(d) -> datetime:
    """UTC-aware midnight for the given date."""
    return datetime.combine(d, dtime.min, tzinfo=timezone.utc)


def _pad_day(entries: list) -> list:
    """Insert off-duty filler so entries span 0.00 -> 24.00."""
    if not entries:
        return entries

    entries = sorted(entries, key=lambda e: e["start_hour"])

    if entries[0]["start_hour"] > 0.001:
        entries.insert(0, {
            "status": "off_duty",
            "start_hour": 0.0,
            "end_hour": round(entries[0]["start_hour"], 4),
            "note": "",
            "start_miles": entries[0].get("start_miles", 0.0),
            "end_miles": entries[0].get("start_miles", 0.0),
        })

    if entries[-1]["end_hour"] < 23.999:
        entries.append({
            "status": "off_duty",
            "start_hour": round(entries[-1]["end_hour"], 4),
            "end_hour": 24.0,
            "note": "",
            "start_miles": entries[-1].get("end_miles", 0.0),
            "end_miles": entries[-1].get("end_miles", 0.0),
        })

    return entries


def build_daily_logs(segments: list, cycle_start_hours: float = 0.0) -> list:
    days = OrderedDict()

    for seg in segments:
        start = _parse_dt(seg["start"])
        end = _parse_dt(seg["end"])
        cur = start
        while cur < end:
            day = cur.date()
            boundary = _midnight(day + timedelta(days=1))
            chunk_end = min(end, boundary)
            base = _midnight(day)
            days.setdefault(day, []).append({
                "status": seg["status"],
                "start_hour": round((cur - base).total_seconds() / 3600, 4),
                "end_hour": round((chunk_end - base).total_seconds() / 3600, 4),
                "note": seg.get("note", ""),
                "start_miles": seg.get("start_miles", 0),
                "end_miles": seg.get("end_miles", 0),
            })
            cur = chunk_end

    sheets = []
    running_cycle = cycle_start_hours

    for day, entries in days.items():
        entries = _pad_day(entries)

        totals = {r: 0.0 for r in ROWS}
        for e in entries:
            totals[e["status"]] += e["end_hour"] - e["start_hour"]

        on_duty_today = totals["driving"] + totals["on_duty_not_driving"]
        running_cycle += on_duty_today

        sheets.append({
            "date": day.isoformat(),
            "entries": entries,
            "totals": {k: round(v, 2) for k, v in totals.items()},
            "total_hours": round(sum(totals.values()), 2),
            "cycle_hours_after_day": round(running_cycle, 2),
            "cycle_remaining": round(max(0.0, 70.0 - running_cycle), 2),
            "remarks": [
                {"time": e["start_hour"], "status": e["status"], "note": e["note"]}
                for e in entries if e["note"]
            ],
        })
    
    return sheets