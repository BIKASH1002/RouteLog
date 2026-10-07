import type {
  GeocodeCandidate,
  PlanTripRequest,
  Trip,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface ApiResponse<T> {
  success: boolean;
  errors: string[];
  error_code: number | null;
  data: T;
  meta: Record<string, unknown>;
}

async function postJson<T>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as ApiResponse<T>;
}

export async function planTrip(
  req: PlanTripRequest
): Promise<ApiResponse<{ trip: Trip }>> {
  return postJson("/api/trips/plan/", req);
}

export async function geocodeLookup(
  query: string
): Promise<ApiResponse<{ candidates: GeocodeCandidate[] }>> {
  return postJson("/api/trips/geocode/", { query });
}