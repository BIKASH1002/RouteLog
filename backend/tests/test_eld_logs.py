"""
Tests for the daily log splitter. Every sheet must total exactly 24.00
hours (FMCSA 395.8) with no gaps and no overlaps.
"""

from datetime import datetime, timezone
import pytest
from trips.eld_logs import ROWS, build_daily_logs
from trips.hos_engine import simulate_trip


START = datetime(2024, 6, 3, 8, 0, tzinfo=timezone.utc)


def _drive(miles, hours, label=""):
    return {"kind": "drive", "miles": miles, "hours": hours, "label": label}


def _on_duty(hours, label=""):
    return {"kind": "on_duty", "hours": hours, "label": label}


def _sum_totals(sheet):
    return sum(sheet["totals"][r] for r in ROWS)


class TestDailyLogTotals:
    def test_single_day_sums_24(self):
        sim = simulate_trip(START, 0, [_drive(500, 9)])
        sheets = build_daily_logs(sim["segments"], cycle_start_hours=0)
        assert len(sheets) == 1
        assert _sum_totals(sheets[0]) == pytest.approx(24.0, abs=0.01)

    def test_two_day_each_sums_24(self):
        sim = simulate_trip(START, 0, [_drive(1200, 22)])
        sheets = build_daily_logs(sim["segments"], cycle_start_hours=0)
        assert len(sheets) == 2
        for sheet in sheets:
            assert _sum_totals(sheet) == pytest.approx(24.0, abs=0.01)

    def test_long_trip_every_day_sums_24(self):
        sim = simulate_trip(START, 0, [_drive(2500, 45)])
        sheets = build_daily_logs(sim["segments"], cycle_start_hours=0)
        assert len(sheets) >= 3
        for sheet in sheets:
            assert _sum_totals(sheet) == pytest.approx(24.0, abs=0.01)


class TestPadding:
    def test_first_day_starts_at_zero(self):
        sim = simulate_trip(START, 0, [_drive(500, 9)])
        sheets = build_daily_logs(sim["segments"], cycle_start_hours=0)
        assert sheets[0]["entries"][0]["start_hour"] == pytest.approx(0.0, abs=0.001)

    def test_last_day_ends_at_24(self):
        sim = simulate_trip(START, 0, [_drive(500, 9)])
        sheets = build_daily_logs(sim["segments"], cycle_start_hours=0)
        assert sheets[0]["entries"][-1]["end_hour"] == pytest.approx(24.0, abs=0.001)

    def test_padding_is_off_duty(self):
        sim = simulate_trip(START, 0, [_drive(500, 9)])
        sheets = build_daily_logs(sim["segments"], cycle_start_hours=0)
        assert sheets[0]["entries"][0]["status"] == "off_duty"
        assert sheets[0]["entries"][-1]["status"] == "off_duty"


class TestContinuity:
    def test_entries_contiguous(self):
        sim = simulate_trip(START, 0, [_drive(1200, 22)])
        sheets = build_daily_logs(sim["segments"], cycle_start_hours=0)
        for sheet in sheets:
            entries = sheet["entries"]
            for i in range(1, len(entries)):
                assert abs(entries[i - 1]["end_hour"] - entries[i]["start_hour"]) < 0.01


class TestCycleMath:
    def test_cycle_accumulates_by_on_duty_hours(self):
        sim = simulate_trip(START, 10, [_drive(400, 8), _on_duty(1)])
        sheets = build_daily_logs(sim["segments"], cycle_start_hours=10)
        assert sheets[-1]["cycle_hours_after_day"] == pytest.approx(19.0, abs=0.01)
        assert sheets[-1]["cycle_remaining"] == pytest.approx(51.0, abs=0.01)