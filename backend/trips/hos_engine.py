# Hours-of-Service simulator for a property-carrying driver.
# 70 hr / 8 day cycle, no adverse driving conditions.

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import List


class Status(str, Enum):
    OFF_DUTY = "off_duty"
    SLEEPER = "sleeper"
    DRIVING = "driving"
    ON_DUTY = "on_duty_not_driving"


# Regulatory constants (hours)
MAX_DRIVE_PER_SHIFT = 11.0
MAX_WINDOW = 14.0
BREAK_AFTER_DRIVING = 8.0
BREAK_HOURS = 0.5
RESET_HOURS = 10.0
CYCLE_LIMIT = 70.0
RESTART_HOURS = 34.0

# Operational constants
FUEL_INTERVAL_MILES = 1000.0
FUEL_HOURS = 0.5
PICKUP_HOURS = 1.0
DROPOFF_HOURS = 1.0
DEFAULT_SPEED_MPH = 55.0
EPS = 1e-6


@dataclass
class Segment:
    status: str
    start: datetime
    end: datetime
    start_miles: float
    end_miles: float
    note: str = ""

    @property
    def hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600.0

    def to_dict(self):
        return {
            "status": self.status,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "hours": round(self.hours, 4),
            "start_miles": round(self.start_miles, 2),
            "end_miles": round(self.end_miles, 2),
            "note": self.note,
        }


class _Simulator:
    def __init__(self, start_time: datetime, cycle_used: float):
        self.t = start_time
        self.shift_start = start_time
        self.cycle_used = float(cycle_used)
        self.drive_this_shift = 0.0
        self.drive_since_break = 0.0
        self.miles = 0.0
        self.miles_since_fuel = 0.0
        self.segments: List[Segment] = []
        self.cycle_resets = 0

    def _window_elapsed(self) -> float:
        return (self.t - self.shift_start).total_seconds() / 3600.0

    def _max_drive_now(self) -> float:
        if self.cycle_used >= CYCLE_LIMIT - EPS:
            return 0.0
        remaining_cycle = CYCLE_LIMIT - self.cycle_used
        return max(0.0, min(
            MAX_DRIVE_PER_SHIFT - self.drive_this_shift,
            MAX_WINDOW - self._window_elapsed(),
            BREAK_AFTER_DRIVING - self.drive_since_break,
            remaining_cycle,  # Never exceed the remaining 70-hour budget
        ))

    def _add(self, status: Status, hours: float, miles: float = 0.0, note: str = ""):
        if hours <= EPS:
            return
        start = self.t
        end = start + timedelta(hours=hours)
        self.segments.append(Segment(
            status=status.value, start=start, end=end,
            start_miles=self.miles, end_miles=self.miles + miles,
            note=note,
        ))
        self.t = end
        self.miles += miles

        if status == Status.DRIVING:
            self.drive_this_shift += hours
            self.drive_since_break += hours
            self.cycle_used += hours
            self.miles_since_fuel += miles
        elif status == Status.ON_DUTY:
            self.cycle_used += hours

        if status != Status.DRIVING and hours >= BREAK_HOURS - EPS:
            self.drive_since_break = 0.0

    def _reset_shift(self):
        self.shift_start = self.t
        self.drive_this_shift = 0.0
        self.drive_since_break = 0.0

    def _insert_rest(self):
        if self.cycle_used >= CYCLE_LIMIT - EPS:
            self._add(Status.SLEEPER, RESTART_HOURS,
                      note="34-hour restart - 70-hour cycle reset")
            self.cycle_used = 0.0
            self.cycle_resets += 1
            self._reset_shift()
        elif (self.drive_this_shift >= MAX_DRIVE_PER_SHIFT - EPS
              or self._window_elapsed() >= MAX_WINDOW - EPS):
            self._add(Status.SLEEPER, RESET_HOURS, note="10-hour off-duty reset")
            self._reset_shift()
        else:
            self._add(Status.OFF_DUTY, BREAK_HOURS, note="30-minute break")

    def _fuel(self):
        self._add(Status.ON_DUTY, FUEL_HOURS, note="Fueling")
        self.miles_since_fuel = 0.0

    def drive(self, miles: float, hours: float, label: str = ""):
        if miles <= EPS:
            return
        speed = (miles / hours) if hours > EPS else DEFAULT_SPEED_MPH

        remaining = miles
        guard = 0
        while remaining > EPS:
            guard += 1
            if guard > 5000:
                raise RuntimeError("HOS simulation failed to converge")

            if self._max_drive_now() <= EPS:
                self._insert_rest()
                continue

            miles_allowed = self._max_drive_now() * speed
            miles_to_fuel = FUEL_INTERVAL_MILES - self.miles_since_fuel
            chunk = min(remaining, miles_allowed, miles_to_fuel)

            if chunk <= EPS:
                self._insert_rest()
                continue

            self._add(Status.DRIVING, chunk / speed, miles=chunk, note=label)
            remaining -= chunk

            if remaining > EPS and self.miles_since_fuel >= FUEL_INTERVAL_MILES - EPS:
                self._fuel()

    def on_duty(self, hours: float, note: str):
        self._add(Status.ON_DUTY, hours, note=note)


def simulate_trip(start_time: datetime, cycle_used: float, legs: List[dict]) -> dict:
    sim = _Simulator(start_time, cycle_used)

    for leg in legs:
        if leg["kind"] == "drive":
            sim.drive(leg["miles"], leg.get("hours") or 0.0, leg.get("label", ""))
        elif leg["kind"] == "on_duty":
            sim.on_duty(leg["hours"], leg.get("label", "On duty"))

    segments = sim.segments
    return {
        "segments": [s.to_dict() for s in segments],
        "total_miles": round(sim.miles, 1),
        "total_hours": round(sum(s.hours for s in segments), 2),
        "driving_hours": round(sum(s.hours for s in segments
                                   if s.status == Status.DRIVING.value), 2),
        "days": (segments[-1].end.date() - start_time.date()).days + 1 if segments else 0,
        "cycle_hours_at_end": round(sim.cycle_used, 2),
        "cycle_resets": sim.cycle_resets,
        "end_time": segments[-1].end.isoformat() if segments else start_time.isoformat(),
    }