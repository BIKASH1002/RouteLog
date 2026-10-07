"""
Unit tests for the HOS simulator. These prove the FMCSA rules hold under
controlled inputs and constitute the accuracy story for the application.
"""

from datetime import datetime, timezone
import pytest

from trips.hos_engine import (
    BREAK_AFTER_DRIVING,
    CYCLE_LIMIT,
    DROPOFF_HOURS,
    MAX_DRIVE_PER_SHIFT,
    MAX_WINDOW,
    PICKUP_HOURS,
    RESET_HOURS,
    RESTART_HOURS,
    simulate_trip,
)


START = datetime(2024, 6, 3, 8, 0, tzinfo=timezone.utc)


def _drive(miles, hours, label=""):
    return {"kind": "drive", "miles": miles, "hours": hours, "label": label}


def _on_duty(hours, label=""):
    return {"kind": "on_duty", "hours": hours, "label": label}


def _driving(segments):
    return [s for s in segments if s["status"] == "driving"]


def _sleeper(segments):
    return [s for s in segments if s["status"] == "sleeper"]


def _off_duty(segments):
    return [s for s in segments if s["status"] == "off_duty"]


def _breaks(segments):
    return [s for s in _off_duty(segments) if abs(s["hours"] - 0.5) < 0.01]


# --------------------------------------------------------------------------- #
# Basic single-day trip
# --------------------------------------------------------------------------- #

class TestSingleDayTrip:
    def test_short_trip_no_resets(self):
        legs = [
            _drive(200, 4, "To pickup"),
            _on_duty(PICKUP_HOURS, "Pickup"),
            _drive(150, 3, "To dropoff"),
            _on_duty(DROPOFF_HOURS, "Dropoff"),
        ]
        r = simulate_trip(START, 5, legs)
        assert r["total_miles"] == 350
        assert r["cycle_resets"] == 0
        assert len(_sleeper(r["segments"])) == 0
        on_duty = [s for s in r["segments"]
                   if s["status"] == "on_duty_not_driving"]
        assert len(on_duty) == 2

    def test_drive_under_8h_is_continuous(self):
        legs = [_drive(7 * 55, 7, "Short drive")]
        r = simulate_trip(START, 0, legs)
        assert len(_driving(r["segments"])) == 1
        assert _driving(r["segments"])[0]["hours"] == pytest.approx(7.0, abs=0.01)

    def test_cycle_hours_accumulate(self):
        legs = [
            _drive(200, 4),
            _on_duty(1),
            _drive(200, 4),
            _on_duty(1),
        ]
        r = simulate_trip(START, 10, legs)
        assert r["cycle_hours_at_end"] == pytest.approx(20.0, abs=0.01)


# --------------------------------------------------------------------------- #
# 11-hour driving limit
# --------------------------------------------------------------------------- #

class TestElevenHourLimit:
    def test_first_shift_truncates_at_11h(self):
        legs = [_drive(13 * 55, 13, "Long drive")]
        r = simulate_trip(START, 0, legs)
        first_shift_drive = 0.0
        for s in r["segments"]:
            if s["status"] == "driving":
                first_shift_drive += s["hours"]
            elif s["status"] == "sleeper":
                break
        assert first_shift_drive <= MAX_DRIVE_PER_SHIFT + 0.01

    def test_two_shifts_with_10h_reset(self):
        legs = [_drive(20 * 55, 20, "Two shifts")]
        r = simulate_trip(START, 0, legs)
        total = sum(s["hours"] for s in _driving(r["segments"]))
        assert total == pytest.approx(20.0, abs=0.01)
        assert any(
            s["hours"] >= RESET_HOURS - 0.01 for s in _sleeper(r["segments"])
        )


# --------------------------------------------------------------------------- #
# 14-hour window
# --------------------------------------------------------------------------- #

class TestFourteenHourWindow:
    def test_no_driving_past_window(self):
        """No driving segment may begin more than 14h after the most
        recent 10h reset (or trip start if no reset has occurred)."""
        legs = [
            _drive(5 * 55, 5, "First drive"),
            _on_duty(6, "Long on-duty"),
            _drive(5 * 55, 5, "Second drive"),
        ]
        r = simulate_trip(START, 0, legs)

        shift_start = START
        for s in r["segments"]:
            # A long rest resets the window
            if s["status"] in ("sleeper", "off_duty") and s["hours"] >= 9.9:
                shift_start = datetime.fromisoformat(s["end"])
            elif s["status"] == "driving":
                elapsed = (
                    datetime.fromisoformat(s["start"]) - shift_start
                ).total_seconds() / 3600
                assert elapsed < MAX_WINDOW + 0.01


    def test_window_reset_after_10h_rest(self):
        legs = [
            _drive(11 * 55, 11, "First shift"),
            _drive(11 * 55, 11, "Second shift"),
        ]
        r = simulate_trip(START, 0, legs)
        assert any(
            s["hours"] >= RESET_HOURS - 0.01 for s in _sleeper(r["segments"])
        )
        
# --------------------------------------------------------------------------- #
# 30-minute break
# --------------------------------------------------------------------------- #

class TestThirtyMinuteBreak:
    def test_break_after_8h_driving(self):
        legs = [_drive(9 * 55, 9, "Long drive")]
        r = simulate_trip(START, 0, legs)
        breaks = _breaks(r["segments"])
        assert len(breaks) >= 1
        first_break = breaks[0]
        cumulative_drive = sum(
            s["hours"]
            for s in r["segments"]
            if s["status"] == "driving"
            and s["start_miles"] < first_break["start_miles"]
        )
        assert cumulative_drive == pytest.approx(BREAK_AFTER_DRIVING, abs=0.1)

    def test_pickup_resets_break_clock(self):
        legs = [
            _drive(4 * 55, 4, "To pickup"),
            _on_duty(PICKUP_HOURS, "Pickup"),
            _drive(4 * 55, 4, "To dropoff"),
        ]
        r = simulate_trip(START, 0, legs)
        assert len(_breaks(r["segments"])) == 0


# --------------------------------------------------------------------------- #
# Cycle limit
# --------------------------------------------------------------------------- #

class TestCycleLimit:
    def test_cycle_cap_limits_first_chunk(self):
        """Driver with 1 cycle hour left may drive only 1 hour before restart."""
        legs = [_drive(10 * 55, 10, "Needs immediate restart")]
        r = simulate_trip(START, 69, legs)
        first_drive = _driving(r["segments"])[0]["hours"]
        assert first_drive == pytest.approx(1.0, abs=0.05)

    def test_34h_restart_when_capped(self):
        legs = [_drive(10 * 55, 10, "Needs restart")]
        r = simulate_trip(START, 69, legs)
        restarts = [
            s for s in _sleeper(r["segments"])
            if abs(s["hours"] - RESTART_HOURS) < 0.01
        ]
        assert len(restarts) >= 1
        assert r["cycle_resets"] >= 1

    def test_no_restart_when_cycle_low(self):
        legs = [_drive(5 * 55, 5, "Short drive")]
        r = simulate_trip(START, 10, legs)
        restarts = [
            s for s in _sleeper(r["segments"])
            if abs(s["hours"] - RESTART_HOURS) < 0.01
        ]
        assert len(restarts) == 0
        assert r["cycle_resets"] == 0

    def test_cycle_never_exceeds_limit(self):
        legs = [_drive(60 * 55, 60, "Cross-country")]
        r = simulate_trip(START, 50, legs)
        assert r["cycle_hours_at_end"] <= CYCLE_LIMIT + 0.01


# --------------------------------------------------------------------------- #
# Fueling
# --------------------------------------------------------------------------- #

class TestFuelInterval:
    def test_fuel_every_1000_miles(self):
        legs = [_drive(2500, 45, "Cross-country")]
        r = simulate_trip(START, 0, legs)
        fuel = [
            s for s in r["segments"]
            if s["status"] == "on_duty_not_driving"
            and "fuel" in s["note"].lower()
        ]
        assert len(fuel) >= 2

    def test_no_fuel_on_short_trip(self):
        legs = [_drive(500, 9, "Short trip")]
        r = simulate_trip(START, 0, legs)
        fuel = [
            s for s in r["segments"]
            if s["status"] == "on_duty_not_driving"
            and "fuel" in s["note"].lower()
        ]
        assert len(fuel) == 0


# --------------------------------------------------------------------------- #
# Pickup and dropoff
# --------------------------------------------------------------------------- #

class TestPickupDropoff:
    def test_both_logged_as_one_hour(self):
        legs = [
            _drive(200, 4),
            _on_duty(PICKUP_HOURS, "Pickup"),
            _drive(200, 4),
            _on_duty(DROPOFF_HOURS, "Dropoff"),
        ]
        r = simulate_trip(START, 0, legs)
        on_duty = [s for s in r["segments"]
                   if s["status"] == "on_duty_not_driving"]
        pickup = [s for s in on_duty if "pickup" in s["note"].lower()]
        dropoff = [s for s in on_duty if "dropoff" in s["note"].lower()]
        assert len(pickup) == 1
        assert len(dropoff) == 1
        assert pickup[0]["hours"] == pytest.approx(PICKUP_HOURS, abs=0.01)
        assert dropoff[0]["hours"] == pytest.approx(DROPOFF_HOURS, abs=0.01)


# --------------------------------------------------------------------------- #
# Continuity
# --------------------------------------------------------------------------- #

class TestContinuity:
    def test_segments_contiguous(self):
        legs = [_drive(500, 9), _on_duty(1), _drive(500, 9)]
        r = simulate_trip(START, 0, legs)
        segs = r["segments"]
        for i in range(1, len(segs)):
            prev_end = datetime.fromisoformat(segs[i - 1]["end"])
            curr_start = datetime.fromisoformat(segs[i]["start"])
            assert prev_end == curr_start

    def test_mileage_monotonic(self):
        legs = [_drive(300, 6), _on_duty(1), _drive(400, 8)]
        r = simulate_trip(START, 0, legs)
        prev = 0.0
        for s in r["segments"]:
            assert s["start_miles"] >= prev - 0.001
            assert s["end_miles"] >= s["start_miles"] - 0.001
            prev = s["end_miles"]

    def test_total_miles_matches_input(self):
        legs = [_drive(300, 6), _drive(400, 8)]
        r = simulate_trip(START, 0, legs)
        assert r["total_miles"] == pytest.approx(700, abs=0.1)