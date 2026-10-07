# Business logic

import logging
from datetime import datetime, timezone
from core.utils import get_response_format
from django.conf import settings
from django.db import transaction
from django.db.models import Prefetch

from trips import eld_logs, hos_engine, routing
from trips.models import Trip, TripLocation, TripRoute, TripRouteGeometry, \
    TripSegment, TripDailyLog, TripDailyLogEntry, TripStop

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Internal utils
# --------------------------------------------------------------------------- #

def _parse_start_time(value) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    
    except Exception:
        raise ValueError("Invalid start_time, expected ISO 8601")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    return dt


def _merge_geometry(g1, g2):
    if not g1:
        return g2 or []
    if not g2:
        return g1
    
    return g1 + g2[1:]


def _classify_stop(status: str, note: str) -> str:
    n = (note or "").lower()
    if "pickup" in n:
        return "pickup"
    if "dropoff" in n:
        return "dropoff"
    if "fuel" in n:
        return "fuel"
    if "break" in n:
        return "break"
    if "reset" in n or "restart" in n:
        return "rest"
    
    return "stop"


def _persist_plan(trip: Trip, ctx: dict) -> None:
    """
    Write every child record for a planned trip.
    Called inside a transaction from plan_trip().
    """
    # --- Locations ---
    TripLocation.objects.bulk_create([
        TripLocation(
            trip=trip, role="origin",
            query=ctx["origin"]["query"], label=ctx["origin"]["label"],
            lat=ctx["origin"]["lat"], lng=ctx["origin"]["lng"],
        ),
        TripLocation(
            trip=trip, role="pickup",
            query=ctx["pickup"]["query"], label=ctx["pickup"]["label"],
            lat=ctx["pickup"]["lat"], lng=ctx["pickup"]["lng"],
        ),
        TripLocation(
            trip=trip, role="dropoff",
            query=ctx["dropoff"]["query"], label=ctx["dropoff"]["label"],
            lat=ctx["dropoff"]["lat"], lng=ctx["dropoff"]["lng"],
        ),
    ])

    # --- Route + geometry ---
    route = TripRoute.objects.create(
        trip=trip,
        total_miles=round(ctx["total_miles"], 2),
        total_duration_hours=round(
            ctx["leg1"]["duration_hours"] + ctx["leg2"]["duration_hours"], 2,
        ),
        legs_summary=[
            {
                "from": ctx["origin"]["label"], "to": ctx["pickup"]["label"],
                "miles": round(ctx["leg1"]["distance_miles"], 2),
                "hours": round(ctx["leg1"]["duration_hours"], 2),
            },
            {
                "from": ctx["pickup"]["label"], "to": ctx["dropoff"]["label"],
                "miles": round(ctx["leg2"]["distance_miles"], 2),
                "hours": round(ctx["leg2"]["duration_hours"], 2),
            },
        ],
    )
    TripRouteGeometry.objects.create(route=route, points=ctx["geometry"])

    # --- Segments ---
    segment_objs = []
    for i, s in enumerate(ctx["segments"]):
        segment_objs.append(TripSegment(
            trip=trip, sequence=i,
            status=s["status"],
            start=datetime.fromisoformat(s["start"]),
            end=datetime.fromisoformat(s["end"]),
            hours=s["hours"],
            start_miles=s["start_miles"],
            end_miles=s["end_miles"],
            note=s.get("note", "") or "",
        ))
    TripSegment.objects.bulk_create(segment_objs)

    # --- Daily logs + entries ---
    for day_index, sheet in enumerate(ctx["daily_logs"]):
        totals = sheet["totals"]
        log = TripDailyLog.objects.create(
            trip=trip,
            date=datetime.fromisoformat(sheet["date"]).date(),
            off_duty_hours=totals.get("off_duty", 0.0),
            sleeper_hours=totals.get("sleeper", 0.0),
            driving_hours=totals.get("driving", 0.0),
            on_duty_hours=totals.get("on_duty_not_driving", 0.0),
            total_hours=sheet["total_hours"],
            cycle_hours_after_day=sheet["cycle_hours_after_day"],
            cycle_remaining=sheet["cycle_remaining"],
        )
        entry_objs = []
        for e_index, e in enumerate(sheet["entries"]):
            entry_objs.append(TripDailyLogEntry(
                log=log, sequence=e_index,
                status=e["status"],
                start_hour=e["start_hour"],
                end_hour=e["end_hour"],
                note=e.get("note", "") or "",
                start_miles=e.get("start_miles", 0.0),
                end_miles=e.get("end_miles", 0.0),
            ))
        TripDailyLogEntry.objects.bulk_create(entry_objs)

    # --- Stops ---
    stop_objs = []
    for i, s in enumerate(ctx["stops"]):
        stop_objs.append(TripStop(
            trip=trip, sequence=i,
            kind=s["kind"],
            lat=s["lat"], lng=s["lng"],
            miles=s["miles"],
            label=s["label"],
            status=s["status"],
            scheduled_start=datetime.fromisoformat(s["start"]),
            scheduled_end=datetime.fromisoformat(s["end"]),
            hours=s["hours"],
        ))
    TripStop.objects.bulk_create(stop_objs)


def _build_stops(segments, index, total_miles):
    stops = []
    for seg in segments:
        if seg["status"] == "driving":
            continue
        note = seg.get("note", "")
        if not note:
            continue
        miles = seg.get("start_miles", 0.0)
        pt = routing.point_at_miles(index, miles, total_miles)
        stops.append({
            "kind": _classify_stop(seg["status"], note),
            "lat": pt["lat"],
            "lng": pt["lng"],
            "miles": round(miles, 2),
            "label": note,
            "status": seg["status"],
            "start": seg["start"],
            "end": seg["end"],
            "hours": seg["hours"],
        })
    
    return stops


# --------------------------------------------------------------------------- #
# Serialization
# --------------------------------------------------------------------------- #

def _serialize_trip(trip: Trip) -> dict:
    """
    Reconstruct the API envelope from the normalised rows.
    Assumes related objects have been prefetched by the caller.
    """
    # Locations
    loc_by_role = {loc.role: loc for loc in trip.locations.all()}

    def _loc_dump(role):
        loc = loc_by_role.get(role)
        if not loc:
            return None
        return {"lat": loc.lat, "lng": loc.lng, "label": loc.label, "query": loc.query}

    # Route + geometry
    geometry = []
    route = None
    try:
        route = trip.route
        try:
            geometry = route.geometry.points
        except TripRouteGeometry.DoesNotExist:
            geometry = []
    except TripRoute.DoesNotExist:
        route = None

    # Segments
    segments = [{
        "status": s.status,
        "start": s.start.isoformat(),
        "end": s.end.isoformat(),
        "hours": round(s.hours, 4),
        "start_miles": round(s.start_miles, 2),
        "end_miles": round(s.end_miles, 2),
        "note": s.note,
    } for s in trip.segments.all()]

    # Daily logs
    daily_logs = []
    for log in trip.daily_logs.all():
        entries = [{
            "status": e.status,
            "start_hour": e.start_hour,
            "end_hour": e.end_hour,
            "note": e.note,
            "start_miles": e.start_miles,
            "end_miles": e.end_miles,
        } for e in log.entries.all()]

        daily_logs.append({
            "date": log.date.isoformat(),
            "entries": entries,
            "totals": {
                "off_duty": round(log.off_duty_hours, 2),
                "sleeper": round(log.sleeper_hours, 2),
                "driving": round(log.driving_hours, 2),
                "on_duty_not_driving": round(log.on_duty_hours, 2),
            },
            "total_hours": round(log.total_hours, 2),
            "cycle_hours_after_day": round(log.cycle_hours_after_day, 2),
            "cycle_remaining": round(log.cycle_remaining, 2),
            "remarks": [
                {"time": e["start_hour"], "status": e["status"], "note": e["note"]}
                for e in entries if e["note"]
            ],
        })

    # Stops
    stops = [{
        "kind": s.kind,
        "lat": s.lat, "lng": s.lng,
        "miles": round(s.miles, 2),
        "label": s.label,
        "status": s.status,
        "start": s.scheduled_start.isoformat(),
        "end": s.scheduled_end.isoformat(),
        "hours": s.hours,
    } for s in trip.stops.all()]

    # Summary (derived)
    total_hours = round(sum(s["hours"] for s in segments), 2)
    driving_hours = round(sum(s["hours"] for s in segments if s["status"] == "driving"), 2)
    cycle_hours_at_end = daily_logs[-1]["cycle_hours_after_day"] if daily_logs else None
    end_time = segments[-1]["end"] if segments else trip.start_time.isoformat()
    cycle_resets = sum(1 for s in segments if "34-hour restart" in (s["note"] or "").lower())

    return {
        "trip_id": trip.id,
        "current_location": trip.current_location,
        "pickup_location": trip.pickup_location,
        "dropoff_location": trip.dropoff_location,
        "current_cycle_used": trip.current_cycle_used,
        "start_time": trip.start_time.isoformat(),
        "status": trip.status,
        "error_message": trip.error_message,
        "created_at": trip.created.isoformat(),
        "locations": {
            "origin": _loc_dump("origin"),
            "pickup": _loc_dump("pickup"),
            "dropoff": _loc_dump("dropoff"),
        },
        "plan": {
            "route": {
                "geometry": geometry,
                "total_miles": round(route.total_miles, 2) if route else 0.0,
                "duration_hours": round(route.total_duration_hours, 2) if route else 0.0,
            },
            "legs": route.legs_summary if route else [],
            "segments": segments,
            "daily_logs": daily_logs,
            "stops": stops,
            "summary": {
                "total_miles": round(route.total_miles, 2) if route else 0.0,
                "total_hours": total_hours,
                "driving_hours": driving_hours,
                "days": len(daily_logs),
                "cycle_hours_at_end": cycle_hours_at_end,
                "cycle_resets": cycle_resets,
                "end_time": end_time,
            },
        },
    }


def _prefetched_trip_queryset():
    """Reduce the read path to a small, predictable number of queries."""
    
    return (
        Trip.objects
        .prefetch_related(
            "locations",
            "segments",
            "stops",
            Prefetch(
                "daily_logs",
                queryset=TripDailyLog.objects.prefetch_related("entries").order_by("date"),
            ),
        )
        .select_related("route__geometry")
    )


# --------------------------------------------------------------------------- #
# Public orchestrators
# --------------------------------------------------------------------------- #

def plan_trip(trip_info: dict) -> dict:
    response = get_response_format()

    required = ["current_location", "pickup_location", "dropoff_location"]
    missing = [f for f in required if not trip_info.get(f)]
    if missing:
        response["errors"].append(f"Missing required fields: {', '.join(missing)}")
        response["error_code"] = 100401
        return response

    try:
        cycle_used = float(trip_info.get("current_cycle_used", 0.0))
    except (TypeError, ValueError):
        response["errors"].append("current_cycle_used must be a number")
        response["error_code"] = 100401
        return response

    if cycle_used < 0 or cycle_used > 70:
        response["errors"].append("current_cycle_used must be between 0 and 70")
        response["error_code"] = 100401
        return response

    try:
        start_time = _parse_start_time(trip_info.get("start_time"))
    except ValueError as e:
        response["errors"].append(str(e))
        response["error_code"] = 100401
        return response

    api_key = settings.ORS_API_KEY
    if not api_key:
        response["errors"].append("Server misconfigured: ORS_API_KEY not set")
        response["error_code"] = 100500
        return response

    trip = Trip.objects.create(
        current_location=trip_info["current_location"],
        pickup_location=trip_info["pickup_location"],
        dropoff_location=trip_info["dropoff_location"],
        current_cycle_used=cycle_used,
        start_time=start_time,
        status="PENDING",
    )

    try:
        # 1. Geocode
        origin = routing.geocode(trip_info["current_location"], api_key)
        pickup = routing.geocode(trip_info["pickup_location"], api_key)
        dropoff = routing.geocode(trip_info["dropoff_location"], api_key)

        # 2. Per-leg routes for accurate distances/durations
        leg1 = routing.get_route_with_fallback([origin, pickup], api_key)
        leg2 = routing.get_route_with_fallback([pickup, dropoff], api_key)

        # 3. HOS simulation
        legs_input = [
            {"kind": "drive", "miles": leg1["distance_miles"],
             "hours": leg1["duration_hours"], "label": "To pickup"},
            {"kind": "on_duty", "hours": hos_engine.PICKUP_HOURS, "label": "Pickup"},
            {"kind": "drive", "miles": leg2["distance_miles"],
             "hours": leg2["duration_hours"], "label": "To dropoff"},
            {"kind": "on_duty", "hours": hos_engine.DROPOFF_HOURS, "label": "Dropoff"},
        ]
        sim = hos_engine.simulate_trip(start_time, cycle_used, legs_input)

        # 4. Daily logs
        daily_logs = eld_logs.build_daily_logs(sim["segments"], cycle_used)

        # 5. Merged polyline (origin -> pickup -> dropoff)
        combined_geometry = _merge_geometry(leg1["geometry"], leg2["geometry"])
        total_miles = leg1["distance_miles"] + leg2["distance_miles"]

        # 6. Interpolate stop positions
        index = routing.build_polyline_index(combined_geometry)
        stops = _build_stops(sim["segments"], index, total_miles)

        # 7. Persist
        ctx = {
            "origin": origin, "pickup": pickup, "dropoff": dropoff,
            "leg1": leg1, "leg2": leg2,
            "geometry": combined_geometry,
            "total_miles": total_miles,
            "segments": sim["segments"],
            "daily_logs": daily_logs,
            "stops": stops,
        }
        with transaction.atomic():
            _persist_plan(trip, ctx)
            trip.status = "PLANNED"
            trip.error_message = None
            trip.save(update_fields=["status", "error_message", "modified"])

    except routing.RoutingError as e:
        logger.error("Routing error: %s", e)
        trip.status = "FAILED"
        trip.error_message = str(e)
        trip.save(update_fields=["status", "error_message", "modified"])
        response["errors"].append(str(e))
        response["error_code"] = 100502
        return response

    except Exception as e:
        logger.exception("Unexpected error planning trip")
        trip.status = "FAILED"
        trip.error_message = str(e)
        trip.save(update_fields=["status", "error_message", "modified"])
        response["errors"].append(f"Unexpected error: {e}")
        response["error_code"] = 100500
        return response

    # Re-fetch with prefetches so serialization is one pass.
    trip = _prefetched_trip_queryset().get(id=trip.id)
    response["success"] = True
    response["data"]["trip"] = _serialize_trip(trip)
    
    return response


def get_trip(trip_info: dict) -> dict:
    response = get_response_format()
    trip_id = trip_info.get("trip_id")
    if not trip_id:
        response["errors"].append("trip_id is required")
        response["error_code"] = 100401
        return response
    
    try:
        trip = _prefetched_trip_queryset().get(id=trip_id)
    
    except Trip.DoesNotExist:
        response["errors"].append("Trip not found")
        response["error_code"] = 100404
        return response
    response["success"] = True
    response["data"]["trip"] = _serialize_trip(trip)
    
    return response


def list_trips(trip_info: dict) -> dict:
    response = get_response_format()
    
    try:
        limit = int(trip_info.get("limit", 20))
    
    except (TypeError, ValueError):
        limit = 20
    limit = max(1, min(limit, 100))

    trips = Trip.objects.all()[:limit]
    response["success"] = True
    response["data"]["trips"] = [
        {
            "trip_id": t.id,
            "current_location": t.current_location,
            "pickup_location": t.pickup_location,
            "dropoff_location": t.dropoff_location,
            "status": t.status,
            "created_at": t.created.isoformat(),
        } for t in trips
    ]
    response["meta"]["count"] = len(response["data"]["trips"])
    
    return response


def geocode_lookup(info: dict) -> dict:
    response = get_response_format()

    query = ((info or {}).get("query") or "").strip()
    if not query:
        response["errors"].append("query is required")
        response["error_code"] = 100401
        return response

    api_key = settings.ORS_API_KEY
    if not api_key:
        response["errors"].append("Server misconfigured: ORS_API_KEY not set")
        response["error_code"] = 100500
        return response

    try:
        candidates = routing.geocode_candidates(query, api_key, size=5)
    except routing.RoutingError as e:
        logger.error("Geocode lookup failed: %s", e)
        response["errors"].append(str(e))
        response["error_code"] = 100502
        return response

    response["success"] = True
    response["data"]["candidates"] = candidates
    
    return response


def get_daily_log(info: dict) -> dict:
    """
    Return one day's ELD log sheet as structured data.
    The React <EldSheet> component renders this.
    """
    response = get_response_format()

    trip_id = (info or {}).get("trip_id")
    if not trip_id:
        response["errors"].append("trip_id is required")
        response["error_code"] = 100401
        return response

    try:
        day = int((info or {}).get("day", 0))
    except (TypeError, ValueError):
        day = 0

    try:
        trip = _prefetched_trip_queryset().get(id=trip_id)
    except Trip.DoesNotExist:
        response["errors"].append("Trip not found")
        response["error_code"] = 100404
        return response

    daily_logs = list(trip.daily_logs.all().order_by("date"))
    if not daily_logs:
        response["errors"].append("Trip has no daily logs")
        response["error_code"] = 100404
        return response

    if day < 0 or day >= len(daily_logs):
        response["errors"].append(f"day must be between 0 and {len(daily_logs) - 1}")
        response["error_code"] = 100401
        return response

    log = daily_logs[day]
    entries = list(log.entries.all().order_by("sequence"))

    log_payload = {
        "date": log.date.isoformat(),
        "entries": [
            {
                "status": e.status,
                "start_hour": e.start_hour,
                "end_hour": e.end_hour,
                "note": e.note,
                "start_miles": e.start_miles,
                "end_miles": e.end_miles,
            }
            for e in entries
        ],
        "totals": {
            "off_duty": round(log.off_duty_hours, 2),
            "sleeper": round(log.sleeper_hours, 2),
            "driving": round(log.driving_hours, 2),
            "on_duty_not_driving": round(log.on_duty_hours, 2),
        },
        "total_hours": round(log.total_hours, 2),
        "cycle_hours_after_day": round(log.cycle_hours_after_day, 2),
        "cycle_remaining": round(log.cycle_remaining, 2),
        "remarks": [
            {"time": e.start_hour, "status": e.status, "note": e.note}
            for e in entries if e.note
        ],
    }

    response["success"] = True
    response["data"]["day"] = day
    response["data"]["total_days"] = len(daily_logs)
    response["data"]["log"] = log_payload
    
    return response