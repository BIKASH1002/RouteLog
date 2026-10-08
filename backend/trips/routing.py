# Routing and geocoding via OpenRouteService.
# Also provides polyline interpolation so the simulator's mile markers
# can be mapped to exact lat/lng points for fuel / rest / pickup stops.

import logging
import math
from functools import lru_cache
from typing import List
import requests

logger = logging.getLogger(__name__)

ORS_BASE = "https://api.heigit.org"


class RoutingError(Exception):
    pass


# ---------- geocoding ----------

def _geocode_uncached(query: str, api_key: str) -> dict:
    url = f"{ORS_BASE}/geocode/search"
    params = {
        "api_key": api_key,
        "text": query,
        "size": 1,
        "layers": "locality,region,country,postalcode",
    }
    try:
        r = requests.get(url, params=params, timeout=15)
    except requests.RequestException as e:
        raise RoutingError(f"Geocode request failed: {e}")

    if r.status_code != 200:
        raise RoutingError(f"Geocode failed ({r.status_code}): {r.text[:200]}")

    data = r.json()
    features = data.get("features") or []
    if not features:
        raise RoutingError(f"No geocoding result for: {query}")

    f = features[0]
    lng, lat = f["geometry"]["coordinates"]
    
    return {
        "lat": float(lat),
        "lng": float(lng),
        "label": f["properties"].get("label", query),
        "query": query,
    }


@lru_cache(maxsize=512)
def _geocode_cached(query: str, api_key: str) -> dict:
    return _geocode_uncached(query, api_key)


def geocode(query: str, api_key: str) -> dict:
    return _geocode_cached(query.strip(), api_key)


# ---------- directions ----------

def _get_route_raw(coords: List[dict], api_key: str, profile: str) -> dict:
    url = f"{ORS_BASE}/v2/directions/{profile}/geojson"
    body = {
        "coordinates": [[c["lng"], c["lat"]] for c in coords],
        "units": "mi",
        # Allow ORS to snap each waypoint to the nearest routable road
        # within 5km. This handles WhosOnFirst centroids that land inside
        # airports, parks, or industrial zones.
        "radiuses": [5000] * len(coords),
    }
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json",
    }
    try:
        r = requests.post(url, json=body, headers=headers, timeout=30)
    except requests.RequestException as e:
        raise RoutingError(f"Route request failed: {e}")

    if r.status_code != 200:
        raise RoutingError(f"Route failed ({r.status_code}): {r.text[:200]}")

    data = r.json()
    feature = data["features"][0]
    props = feature["properties"]
    summary = props.get("summary", {})
    geom = feature["geometry"]["coordinates"]
    latlng_geometry = [[float(pt[1]), float(pt[0])] for pt in geom]

    return {
        "geometry": latlng_geometry,
        "distance_miles": float(summary.get("distance", 0.0)),
        "duration_hours": float(summary.get("duration", 0.0)) / 3600.0,
    }


def get_route(coords: List[dict], api_key: str, profile: str = "driving-hgv") -> dict:
    """
    Fetch a route. Falls back to driving-car if driving-hgv fails.
    """
    if not api_key:
        raise RoutingError("ORS_API_KEY not configured")
    if len(coords) < 2:
        raise RoutingError("At least 2 coordinates required")

    try:
        return _get_route_raw(coords, api_key, profile)
    except RoutingError as e:
        if profile == "driving-hgv":
            logger.warning("driving-hgv failed, falling back to driving-car: %s", e)
            return _get_route_raw(coords, api_key, "driving-car")
        raise


def get_route_with_fallback(coords: List[dict], api_key: str) -> dict:
    """
    Try driving-hgv first, then driving-car, then instruct a user-friendly
    error. This shields callers from profile-specific routing gaps.
    """
    try:
        return get_route(coords, api_key, profile="driving-hgv")
    except RoutingError as e:
        logger.warning("driving-hgv route failed, trying driving-car: %s", e)

    try:
        return get_route(coords, api_key, profile="driving-car")
    except RoutingError as e:
        raise RoutingError(
            f"Could not compute a route between these locations. "
            f"Please use a city name or full street address. ({e})"
        )

# ---------- polyline interpolation ----------

def _haversine_miles(lat1, lng1, lat2, lng2) -> float:
    R = 3958.8
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    
    return 2 * R * math.asin(math.sqrt(a))


def build_polyline_index(geometry: List[List[float]]) -> dict:
    cumulative = [0.0]
    for i in range(1, len(geometry)):
        d = _haversine_miles(
            geometry[i - 1][0], geometry[i - 1][1],
            geometry[i][0], geometry[i][1],
        )
        cumulative.append(cumulative[-1] + d)
    
    return {
        "geometry": geometry,
        "cumulative": cumulative,
        "total_haversine": cumulative[-1],
    }


def point_at_miles(index: dict, target_miles: float, total_route_miles: float) -> dict:
    geom = index["geometry"]
    if not geom:
        return {"lat": 0.0, "lng": 0.0}
    if target_miles <= 0:
        return {"lat": geom[0][0], "lng": geom[0][1]}
    if target_miles >= total_route_miles:
        return {"lat": geom[-1][0], "lng": geom[-1][1]}

    ratio = (index["total_haversine"] / total_route_miles) if total_route_miles > 0 else 1.0
    target_hav = target_miles * ratio

    cum = index["cumulative"]
    for i in range(1, len(cum)):
        if cum[i] >= target_hav:
            seg_len = cum[i] - cum[i - 1]
            frac = 0.0 if seg_len <= 0 else (target_hav - cum[i - 1]) / seg_len
            p1, p2 = geom[i - 1], geom[i]
            return {
                "lat": p1[0] + (p2[0] - p1[0]) * frac,
                "lng": p1[1] + (p2[1] - p1[1]) * frac,
            }
    
    return {"lat": geom[-1][0], "lng": geom[-1][1]}


def geocode_candidates(query: str, api_key: str, size: int = 5) -> list:
    """
    Return up to `size` candidate matches for a location query.
    Used by the frontend autocomplete dropdown.
    """
    if not api_key:
        raise RoutingError("ORS_API_KEY not configured")

    url = f"{ORS_BASE}/geocode/search"
    params = {
        "api_key": api_key, 
        "text": query, 
        "size": size,
        "layers": "locality,region,country,postalcode",
    }

    try:
        r = requests.get(url, params=params, timeout=15)
    except requests.RequestException as e:
        raise RoutingError(f"Geocode request failed: {e}")

    if r.status_code != 200:
        raise RoutingError(f"Geocode failed ({r.status_code}): {r.text[:200]}")

    data = r.json()
    out = []
    for f in data.get("features") or []:
        lng, lat = f["geometry"]["coordinates"]
        out.append({
            "label": f["properties"].get("label", query),
            "lat": float(lat),
            "lng": float(lng),
        })
    
    return out
