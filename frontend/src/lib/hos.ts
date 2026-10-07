import type { TripDailyLogEntry } from "./types";

export interface ShiftWindow {
  first_on_duty_hour: number;
  last_on_duty_hour: number;
  driving_hours: number;
  window_hours: number;
}

/**
 * Split a day's entries into logical shifts at each >=10h rest.
 * A shift may span midnight; entries before the first long rest on a
 * given day belong to the shift that started on the previous day.
 */
export function computeShifts(entries: TripDailyLogEntry[]): ShiftWindow[] {
  if (!entries || entries.length === 0) return [];

  const isLongRest = (e: TripDailyLogEntry) =>
    (e.status === "sleeper" || e.status === "off_duty") &&
    e.end_hour - e.start_hour >= 9.9;

  const groups: TripDailyLogEntry[][] = [];
  let current: TripDailyLogEntry[] = [];
  for (const e of entries) {
    if (isLongRest(e)) {
      if (current.length) groups.push(current);
      current = [];
    } else {
      current.push(e);
    }
  }
  if (current.length) groups.push(current);

  const shifts: ShiftWindow[] = [];
  for (const g of groups) {
    const onDuty = g.filter(
      (e) => e.status === "driving" || e.status === "on_duty_not_driving"
    );
    if (onDuty.length === 0) continue;
    const first = onDuty[0].start_hour;
    const last = onDuty[onDuty.length - 1].end_hour;
    const driving = g
      .filter((e) => e.status === "driving")
      .reduce((sum, e) => sum + (e.end_hour - e.start_hour), 0);
    shifts.push({
      first_on_duty_hour: first,
      last_on_duty_hour: last,
      driving_hours: driving,
      window_hours: last - first,
    });
  }
  return shifts;
}

/** The maximum driving hours in any single shift of the day. */
export function maxShiftDriving(entries: TripDailyLogEntry[]): number {
  return computeShifts(entries).reduce(
    (m, s) => Math.max(m, s.driving_hours),
    0
  );
}

/** The maximum on-duty window in any single shift of the day. */
export function maxShiftWindow(entries: TripDailyLogEntry[]): number {
  return computeShifts(entries).reduce(
    (m, s) => Math.max(m, s.window_hours),
    0
  );
}