"""
Resource Allocation Engine
"""
import math
import json
from typing import Optional


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in km between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearest_ambulance(incident, ambulances):
    """Return the nearest AVAILABLE ambulance, or None."""
    available = [a for a in ambulances if a.status == "available"]
    if not available:
        return None
    return min(
        available,
        key=lambda a: haversine(incident.latitude, incident.longitude, a.latitude, a.longitude)
    )


def find_best_hospital(incident, hospitals, needs_icu: bool = False):
    """
    Score = (1/distance) * availability_ratio.
    If needs_icu, only consider hospitals with icu_available > 0.
    Must have available_beds > 0.
    """
    candidates = [
        h for h in hospitals
        if h.available_beds > 0
        and h.status != "closed"
        and (not needs_icu or h.icu_available > 0)
    ]
    if not candidates:
        # Fallback: any hospital with beds
        candidates = [h for h in hospitals if h.available_beds > 0 and h.status != "closed"]
    if not candidates:
        return None

    best, best_score = None, -1.0
    for h in candidates:
        dist = haversine(incident.latitude, incident.longitude, h.latitude, h.longitude)
        if dist == 0:
            dist = 0.001
        availability_ratio = h.available_beds / max(h.total_beds, 1)
        score = (1.0 / dist) * availability_ratio
        if score > best_score:
            best_score = score
            best = h
    return best


def generate_allocation_reason(ambulance, hospital, incident, distance_km: float, eta_minutes: float) -> str:
    if ambulance and hospital:
        icu_note = f"{hospital.icu_available} available ICU beds" if incident.severity >= 4 else f"{hospital.available_beds} available beds"
        return (
            f"Ambulance {ambulance.unit_number} assigned "
            f"({distance_km:.1f} km away, ETA {eta_minutes:.1f} min). "
            f"{hospital.name} selected with {icu_note}."
        )
    elif ambulance:
        return (
            f"Ambulance {ambulance.unit_number} assigned "
            f"({distance_km:.1f} km away, ETA {eta_minutes:.1f} min). "
            f"No suitable hospital found — manual assignment required."
        )
    elif hospital:
        return (
            f"No ambulance available. "
            f"{hospital.name} pre-selected with {hospital.available_beds} available beds."
        )
    return "No resources available. Manual intervention required."


def _build_waypoints(incident, ambulance, hospital) -> str:
    """Generate a simple waypoint JSON (start → incident → hospital)."""
    waypoints = []
    if ambulance:
        waypoints.append({"lat": ambulance.latitude, "lon": ambulance.longitude, "label": "Ambulance Start"})
    waypoints.append({"lat": incident.latitude, "lon": incident.longitude, "label": "Incident"})
    if hospital:
        waypoints.append({"lat": hospital.latitude, "lon": hospital.longitude, "label": hospital.name})
    return json.dumps(waypoints)


SPEED_KMH = 40.0  # average urban speed


def allocate_resources(incident, all_ambulances, all_hospitals, traffic_multiplier: float = 1.0) -> dict:
    """
    Allocate the best ambulance and hospital for an incident.
    Returns dict with keys: ambulance, hospital, distance_km, eta_minutes, reason, needs_icu
    """
    from services.ai_engine import classify_incident
    classification = classify_incident(incident.description, incident.incident_type, incident.affected_people)
    needs_icu = classification["needs_icu"]

    ambulance = find_nearest_ambulance(incident, all_ambulances)
    hospital = find_best_hospital(incident, all_hospitals, needs_icu=needs_icu)

    distance_km = 0.0
    eta_minutes = 0.0

    if ambulance:
        distance_km = haversine(incident.latitude, incident.longitude, ambulance.latitude, ambulance.longitude)
        eta_minutes = (distance_km / SPEED_KMH) * 60 * traffic_multiplier

    reason = generate_allocation_reason(ambulance, hospital, incident, distance_km, eta_minutes)
    waypoints = _build_waypoints(incident, ambulance, hospital)

    return {
        "ambulance": ambulance,
        "hospital": hospital,
        "distance_km": round(distance_km, 3),
        "eta_minutes": round(eta_minutes, 2),
        "reason": reason,
        "needs_icu": needs_icu,
        "waypoints": waypoints,
    }


def reallocate(incident, all_ambulances, all_hospitals, reason: str, traffic_multiplier: float = 1.0) -> dict:
    result = allocate_resources(incident, all_ambulances, all_hospitals, traffic_multiplier)
    result["is_reallocated"] = True
    result["reallocation_reason"] = reason
    return result
