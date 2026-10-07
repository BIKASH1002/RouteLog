export type SegmentStatus =
  | "driving"
  | "off_duty"
  | "sleeper"
  | "on_duty_not_driving";

export type StopKind =
  | "pickup"
  | "dropoff"
  | "fuel"
  | "break"
  | "rest"
  | "stop";

export interface TripLocation {
  lat: number;
  lng: number;
  label: string;
  query: string;
}

export interface TripRoute {
  geometry: [number, number][]; // [lat, lng]
  total_miles: number;
  duration_hours: number;
}

export interface TripLeg {
  from: string;
  to: string;
  miles: number;
  hours: number;
}

export interface TripSegment {
  status: SegmentStatus;
  start: string;
  end: string;
  hours: number;
  start_miles: number;
  end_miles: number;
  note: string;
}

export interface TripDailyLogEntry {
  status: SegmentStatus;
  start_hour: number;
  end_hour: number;
  note: string;
  start_miles: number;
  end_miles: number;
}

export interface TripDailyLog {
  date: string;
  entries: TripDailyLogEntry[];
  totals: Record<SegmentStatus, number>;
  total_hours: number;
  cycle_hours_after_day: number;
  cycle_remaining: number;
  remarks: { time: number; status: SegmentStatus; note: string }[];
}

export interface TripStop {
  kind: StopKind;
  lat: number;
  lng: number;
  miles: number;
  label: string;
  status: SegmentStatus;
  start: string;
  end: string;
  hours: number;
}

export interface TripSummary {
  total_miles: number;
  total_hours: number;
  driving_hours: number;
  days: number;
  cycle_hours_at_end: number;
  cycle_resets: number;
  end_time: string;
}

export interface TripPlan {
  route: TripRoute;
  legs: TripLeg[];
  segments: TripSegment[];
  daily_logs: TripDailyLog[];
  stops: TripStop[];
  summary: TripSummary;
}

export interface Trip {
  trip_id: number;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
  start_time: string;
  status: string;
  error_message: string | null;
  created_at: string;
  locations: {
    origin: TripLocation;
    pickup: TripLocation;
    dropoff: TripLocation;
  };
  plan: TripPlan;
}

export interface PlanTripRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
  start_time: string;
}

export interface GeocodeCandidate {
  label: string;
  lat: number;
  lng: number;
}